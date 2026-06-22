const bcrypt = require('bcrypt');
const config = require('../config');
const { handleFailedLogin, handleSuccessfulLogin } = require('../middleware/bruteForceProtection');
const OtpService = require('../services/otpService');
const SmsService = require('../services/smsService');
const TokenService = require('../services/tokenService');
const Parent = require('../models/Parent');
const Personnel = require('../models/Personnel');
const { getClient, query } = require('../config/database');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { isValidMoroccanPhone, normalizePhone, isValidCIN } = require('../utils/validator');
const { success, created } = require('../utils/responseHandler');
const { parseCookies, cookieOptions, createCsrfToken } = require('../utils/cookies');

const WEB_REFRESH_COOKIE = 'vk_admin_refresh';
const WEB_CSRF_COOKIE = 'vk_admin_csrf';
const WEB_COOKIE_PATH = '/api/auth/web-admin';
const webSessionMaxAge = () => config.surfaces.webAdminSessionDays * 24 * 60 * 60 * 1000;

const setWebAdminCookies = (res, refreshToken) => {
  const csrfToken = createCsrfToken();
  res.cookie(
    WEB_REFRESH_COOKIE,
    refreshToken,
    cookieOptions({ httpOnly: true, maxAge: webSessionMaxAge(), path: WEB_COOKIE_PATH }),
  );
  res.cookie(
    WEB_CSRF_COOKIE,
    csrfToken,
    cookieOptions({ maxAge: webSessionMaxAge(), path: WEB_COOKIE_PATH }),
  );
  return csrfToken;
};

const clearWebAdminCookies = (res) => {
  res.clearCookie(WEB_REFRESH_COOKIE, cookieOptions({ httpOnly: true, path: WEB_COOKIE_PATH }));
  res.clearCookie(WEB_CSRF_COOKIE, cookieOptions({ path: WEB_COOKIE_PATH }));
};

const AuthController = {
  // ---- PARENT OTP AUTH ----

  sendOTP: catchAsync(async (req, res, next) => {
    const { telephone } = req.body;
    if (!telephone) return next(ApiError.badRequest('Phone number is required'));
    if (!isValidMoroccanPhone(telephone))
      return next(
        ApiError.badRequest(
          'Invalid Moroccan phone number. Use format: +212XXXXXXXXX or 06XXXXXXXX',
        ),
      );

    const normalizedPhone = normalizePhone(telephone);
    const otpResult = await OtpService.generateOTP(normalizedPhone);
    const smsResult = await SmsService.sendOTP(normalizedPhone, otpResult.otp);
    if (!smsResult.success) {
      await OtpService.invalidate(otpResult.id);
      return next(ApiError.serviceUnavailable('OTP delivery is temporarily unavailable'));
    }

    const responseData = {
      telephone: normalizedPhone,
      expiryMinutes: otpResult.expiryMinutes,
      otpSent: smsResult.success,
      mode: smsResult.mode,
    };
    if (config.isDev || config.isTest) responseData.devOtp = otpResult.otp;

    return success(res, 200, 'OTP code sent successfully', responseData);
  }),

  verifyOTP: catchAsync(async (req, res, next) => {
    const { telephone, code } = req.body;
    if (!telephone || !code)
      return next(ApiError.badRequest('Phone number and OTP code are required'));

    const normalizedPhone = normalizePhone(telephone);
    const client = await getClient();
    let transactionClosed = false;

    try {
      await client.query('BEGIN');
      const otpResult = await OtpService.verifyOTP(normalizedPhone, code, { client });
      if (!otpResult.valid) {
        await client.query('COMMIT');
        transactionClosed = true;
        return next(ApiError.unauthorized(otpResult.reason));
      }

      const parent = await Parent.upsertByPhone(
        {
          telephone: normalizedPhone,
          nom: 'Nouveau',
          prenom: 'Parent',
          langue_preferee: 'fr',
        },
        client,
      );
      if (!parent.est_actif) {
        await client.query('ROLLBACK');
        transactionClosed = true;
        return next(ApiError.forbidden('Your account has been deactivated.'));
      }

      const tokens = await TokenService.generateAuthTokens(
        {
          id: parent.id,
          role: 'parent',
          telephone: parent.telephone,
        },
        { client },
      );

      await client.query('COMMIT');
      transactionClosed = true;
      return created(res, 'Authentication successful', {
        user: {
          id: parent.id,
          telephone: parent.telephone,
          nom: parent.nom,
          prenom: parent.prenom,
          langue_preferee: parent.langue_preferee,
          role: 'parent',
          isNewUser: parent.nom === 'Nouveau',
        },
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.accessTokenExpiry,
        },
      });
    } catch (error) {
      if (!transactionClosed) await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }),

  // ---- PARENT — numéro oublié : envoi par email ----

  forgotNumero: catchAsync(async (req, res, next) => {
    const { email } = req.body;
    if (!email || !email.trim())
      return next(ApiError.badRequest('Adresse email requise'));

    // Fire-and-forget: never reveal whether the email exists
    const run = async () => {
      const result = await query(
        `SELECT p.nom, p.prenom,
                COALESCE(
                  json_agg(json_build_object(
                    'id', b.id,
                    'prenom', b.prenom,
                    'numero', b.numero_centre)
                    ORDER BY b.id)
                  FILTER (WHERE b.id IS NOT NULL),
                  '[]'
                ) AS bebes
         FROM parent p
         LEFT JOIN bebe b ON b.parent_id = p.id
         WHERE LOWER(p.email) = LOWER($1) AND p.est_actif = TRUE
         GROUP BY p.id
         LIMIT 1`,
        [email.trim()],
      );
      if (!result.rows.length) return;

      const parent = result.rows[0];
      const bebes  = Array.isArray(parent.bebes) ? parent.bebes.filter((b) => b.numero != null) : [];
      if (!bebes.length) return;

      const EmailService = require('../services/emailService');
      const listHtml = bebes
        .map(
          (b) =>
            `<tr>
               <td style="padding:6px 12px;font-size:15px;">${b.prenom || 'Enfant'}</td>
               <td style="padding:6px 12px;font-size:22px;font-weight:800;color:#2b6cb0;">#${b.numero}</td>
               <td style="padding:6px 12px;font-size:12px;color:#718096;">ID global : ${b.id}</td>
             </tr>`,
        )
        .join('');

      await EmailService.sendEmail({
        to: email.trim(),
        subject: "Vos numéros d'enfants — VacciniKids",
        html: `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
  <h2 style="color:#2b6cb0;margin-bottom:4px;">VacciniKids</h2>
  <p style="color:#718096;font-size:13px;">Récupération de numéro</p>
  <p>Bonjour <strong>${parent.prenom || ''} ${parent.nom || ''}</strong>,</p>
  <p>Voici le(s) numéro(s) d'enfant(s) associé(s) à votre compte :</p>
  <table style="border-collapse:collapse;background:#f7fafc;border-radius:8px;width:100%;margin:16px 0;">
    <thead>
      <tr style="background:#ebf8ff;">
        <th style="padding:8px 12px;text-align:left;color:#2c5282;">Prénom</th>
        <th style="padding:8px 12px;text-align:left;color:#2c5282;">N° au centre</th>
        <th style="padding:8px 12px;text-align:left;color:#2c5282;">ID global</th>
      </tr>
    </thead>
    <tbody>${listHtml}</tbody>
  </table>
  <p>Utilisez ce numéro + votre CIN pour vous connecter à l'application.</p>
  <p style="color:#718096;font-size:12px;margin-top:24px;">VacciniKids — Service de vaccination pédiatrique</p>
</div>`,
      });
    };

    run().catch(() => {}); // silencieux côté client
    return success(res, 200, "Si un compte correspond à cet email, vous recevrez les numéros de votre/vos enfant(s).", {});
  }),

  // ---- PARENT SIGNUP (CIN + password) ----

  signupParent: catchAsync(async (req, res, next) => {
    const { cin, mot_de_passe, nom, prenom, email, centre_id } = req.body;
    if (!cin || !mot_de_passe || !nom || !prenom || !centre_id)
      return next(ApiError.badRequest('CIN, mot de passe, nom, prénom et centre sont requis'));

    const cinUpper = cin.trim().toUpperCase();

    const existing = await query(
      'SELECT id, mot_de_passe FROM parent WHERE cin = $1 AND est_actif = TRUE',
      [cinUpper],
    );

    let parent;
    if (existing.rows.length > 0) {
      const row = existing.rows[0];
      if (row.mot_de_passe) {
        return next(ApiError.conflict('Un compte existe déjà avec cette CIN. Connectez-vous.'));
      }
      // Guest account without password → claim it
      const hash = await bcrypt.hash(mot_de_passe, 10);
      const updated = await query(
        `UPDATE parent SET mot_de_passe=$1, nom=$2, prenom=$3, centre_id=$4, email=$5,
           is_new_user=FALSE, updated_at=NOW() WHERE id=$6 RETURNING *`,
        [hash, nom.trim(), prenom.trim(), Number(centre_id),
         email?.trim().toLowerCase() || null, row.id],
      );
      parent = updated.rows[0];
    } else {
      const hash = await bcrypt.hash(mot_de_passe, 10);
      const inserted = await query(
        `INSERT INTO parent (cin, mot_de_passe, nom, prenom, email, centre_id, is_new_user, langue_preferee)
         VALUES ($1, $2, $3, $4, $5, $6, FALSE, 'fr') RETURNING *`,
        [cinUpper, hash, nom.trim(), prenom.trim(),
         email?.trim().toLowerCase() || null, Number(centre_id)],
      );
      parent = inserted.rows[0];
    }

    let centreNomSignup = null;
    if (parent.centre_id) {
      const cRes = await query('SELECT nom FROM centre WHERE id = $1', [parent.centre_id]);
      centreNomSignup = cRes.rows[0]?.nom || null;
    }
    const tokens = await TokenService.generateAuthTokens({
      id: parent.id, role: 'parent', telephone: parent.telephone,
    });
    return created(res, 'Compte créé avec succès', {
      user: {
        id: parent.id,
        telephone: parent.telephone || null,
        nom: parent.nom,
        prenom: parent.prenom,
        email: parent.email || null,
        cin: parent.cin,
        centre_id: parent.centre_id || null,
        centre_nom: centreNomSignup,
        langue_preferee: parent.langue_preferee,
        role: 'parent',
        isNewUser: false,
      },
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.accessTokenExpiry,
      },
    });
  }),

  // ---- PARENT LOGIN (CIN + password) ----

  loginParent: catchAsync(async (req, res, next) => {
    const { cin, mot_de_passe } = req.body;
    if (!cin || !mot_de_passe)
      return next(ApiError.badRequest('CIN et mot de passe requis'));

    const cinUpper = cin.trim().toUpperCase();
    const result = await query(
      'SELECT * FROM parent WHERE cin = $1 AND est_actif = TRUE LIMIT 1',
      [cinUpper],
    );

    const parent = result.rows[0];
    if (!parent || !parent.mot_de_passe) {
      return next(ApiError.unauthorized('Identifiants incorrects.'));
    }

    const passwordMatch = await bcrypt.compare(mot_de_passe, parent.mot_de_passe);
    if (!passwordMatch) {
      return next(ApiError.unauthorized('Identifiants incorrects.'));
    }

    let centreNomLogin = null;
    if (parent.centre_id) {
      const cRes = await query('SELECT nom FROM centre WHERE id = $1', [parent.centre_id]);
      centreNomLogin = cRes.rows[0]?.nom || null;
    }
    const tokens = await TokenService.generateAuthTokens({
      id: parent.id, role: 'parent', telephone: parent.telephone,
    });
    return created(res, 'Authentification réussie', {
      user: {
        id: parent.id,
        telephone: parent.telephone || null,
        nom: parent.nom,
        prenom: parent.prenom,
        email: parent.email || null,
        cin: parent.cin,
        centre_id: parent.centre_id || null,
        centre_nom: centreNomLogin,
        langue_preferee: parent.langue_preferee,
        role: 'parent',
        isNewUser: parent.is_new_user || false,
      },
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.accessTokenExpiry,
      },
    });
  }),

  // ---- PARENT LOGIN via numéro enfant + CIN ----

  loginWithBabyId: catchAsync(async (req, res, next) => {
    const { numero_enfant, cin } = req.body;
    if (!numero_enfant || !cin)
      return next(ApiError.badRequest("Numéro de l'enfant et CIN requis"));

    const num = parseInt(numero_enfant, 10);
    if (!Number.isFinite(num) || num <= 0)
      return next(ApiError.badRequest("Numéro de l'enfant invalide"));

    // Accept both the global bebe.id AND the per-centre numero_centre
    const result = await query(
      `SELECT p.*
       FROM parent p
       JOIN bebe b ON b.parent_id = p.id
       WHERE (b.numero_centre = $1 OR b.id = $1)
         AND UPPER(p.cin) = UPPER($2)
         AND p.est_actif = TRUE
       LIMIT 1`,
      [num, cin.trim()],
    );

    if (result.rows.length === 0)
      return next(ApiError.unauthorized(
        "Identifiants incorrects. Vérifiez le numéro de l'enfant et votre CIN.",
      ));

    const parent = result.rows[0];
    const isNewUser = parent.is_new_user || parent.nom === 'Nouveau';

    const tokens = await TokenService.generateAuthTokens(
      { id: parent.id, role: 'parent', telephone: parent.telephone },
    );

    return created(res, 'Authentification réussie', {
      user: {
        id: parent.id,
        telephone: parent.telephone,
        nom: parent.nom,
        prenom: parent.prenom,
        email: parent.email || null,
        cin: parent.cin,
        centre_id: parent.centre_id || null,
        langue_preferee: parent.langue_preferee,
        role: 'parent',
        isNewUser,
      },
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.accessTokenExpiry,
      },
    });
  }),

  // ---- PARENT LOGIN via email + CIN (fallback) ----

  loginWithEmail: catchAsync(async (req, res, next) => {
    const { email, cin } = req.body;
    if (!email || !cin)
      return next(ApiError.badRequest('Email et CIN requis'));

    const result = await query(
      `SELECT * FROM parent
       WHERE LOWER(email) = LOWER($1)
         AND UPPER(cin)   = UPPER($2)
         AND est_actif    = TRUE
       LIMIT 1`,
      [email.trim(), cin.trim()],
    );

    if (result.rows.length === 0)
      return next(ApiError.unauthorized('Email ou CIN incorrect.'));

    const parent = result.rows[0];
    const isNewUser = parent.is_new_user || parent.nom === 'Nouveau';

    const tokens = await TokenService.generateAuthTokens(
      { id: parent.id, role: 'parent', telephone: parent.telephone },
    );

    return created(res, 'Authentification réussie', {
      user: {
        id: parent.id,
        telephone: parent.telephone,
        nom: parent.nom,
        prenom: parent.prenom,
        email: parent.email || null,
        cin: parent.cin,
        centre_id: parent.centre_id || null,
        langue_preferee: parent.langue_preferee,
        role: 'parent',
        isNewUser,
      },
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.accessTokenExpiry,
      },
    });
  }),

  // ---- PARENT CIN LOGIN (no OTP) ----

  loginWithCIN: catchAsync(async (req, res, next) => {
    const { telephone, cin } = req.body;
    if (!telephone || !cin) return next(ApiError.badRequest('Numéro de téléphone et CIN requis'));

    const normalizedPhone = normalizePhone(telephone);
    if (!isValidMoroccanPhone(normalizedPhone))
      return next(ApiError.badRequest('Numéro de téléphone invalide'));

    const client = await getClient();
    let transactionClosed = false;

    try {
      await client.query('BEGIN');

      const existing = await client.query(
        'SELECT * FROM parent WHERE telephone = $1',
        [normalizedPhone],
      );

      let parent;
      let isNewUser = false;

      if (existing.rows.length > 0) {
        parent = existing.rows[0];
        if (!parent.est_actif) {
          await client.query('COMMIT');
          transactionClosed = true;
          return next(ApiError.forbidden('Votre compte a été désactivé.'));
        }
        if (parent.cin && parent.cin.toUpperCase() !== cin.toUpperCase()) {
          await client.query('COMMIT');
          transactionClosed = true;
          return next(ApiError.unauthorized('CIN incorrect.'));
        }
        if (!parent.cin) {
          const updated = await client.query(
            'UPDATE parent SET cin = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
            [cin.toUpperCase(), parent.id],
          );
          parent = updated.rows[0];
        }
        isNewUser = parent.is_new_user || parent.nom === 'Nouveau';
      } else {
        const inserted = await client.query(
          `INSERT INTO parent (telephone, cin, nom, prenom, is_new_user, langue_preferee)
           VALUES ($1, $2, 'Nouveau', 'Parent', TRUE, 'fr') RETURNING *`,
          [normalizedPhone, cin.toUpperCase()],
        );
        parent = inserted.rows[0];
        isNewUser = true;
      }

      const tokens = await TokenService.generateAuthTokens(
        { id: parent.id, role: 'parent', telephone: parent.telephone },
        { client },
      );

      await client.query('COMMIT');
      transactionClosed = true;

      return created(res, 'Authentification réussie', {
        user: {
          id: parent.id,
          telephone: parent.telephone,
          nom: parent.nom,
          prenom: parent.prenom,
          email: parent.email || null,
          cin: parent.cin,
          centre_id: parent.centre_id || null,
          langue_preferee: parent.langue_preferee,
          role: 'parent',
          isNewUser,
        },
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.accessTokenExpiry,
        },
      });
    } catch (error) {
      if (!transactionClosed) await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }),

  registerParent: catchAsync(async (req, res, next) => {
    const { nom, prenom, cin, email, centre_id, langue_preferee } = req.body;
    if (!nom || !prenom) return next(ApiError.badRequest('Nom and prenom are required'));
    if (!centre_id)      return next(ApiError.badRequest('Veuillez choisir votre centre de santé'));

    const updateData = {
      nom,
      prenom,
      centre_id: Number(centre_id),
      langue_preferee: langue_preferee || 'fr',
      is_new_user: false,
    };
    if (cin) updateData.cin = cin.toUpperCase();
    if (email) updateData.email = email.toLowerCase().trim();

    const updatedParent = await Parent.update(req.user.id, updateData);
    if (!updatedParent) return next(ApiError.notFound('Parent not found'));

    return success(res, 200, 'Profile updated successfully', {
      user: {
        id: updatedParent.id,
        telephone: updatedParent.telephone,
        nom: updatedParent.nom,
        prenom: updatedParent.prenom,
        email: updatedParent.email || null,
        cin: updatedParent.cin || null,
        centre_id: updatedParent.centre_id || null,
        langue_preferee: updatedParent.langue_preferee,
        role: 'parent',
      },
    });
  }),

  updateFcmToken: catchAsync(async (req, res, next) => {
    if (req.user.role !== 'parent')
      return next(ApiError.forbidden('Only parents can register FCM tokens'));

    const updated = await Parent.updateFcmToken(req.user.id, req.body.fcm_token);
    if (!updated) return next(ApiError.notFound('Parent not found'));

    return success(res, 200, 'FCM token registered successfully', {
      parent_id: updated.id,
      push_enabled: Boolean(updated.fcm_token),
    });
  }),

  removeFcmToken: catchAsync(async (req, res, next) => {
    if (req.user.role !== 'parent')
      return next(ApiError.forbidden('Only parents can remove FCM tokens'));
    await Parent.updateFcmToken(req.user.id, null);
    return success(res, 200, 'FCM token removed successfully', { push_enabled: false });
  }),

  // ---- PERSONNEL LOGIN ----

  personnelLogin: catchAsync(async (req, res, next) => {
    const { cin, mot_de_passe } = req.body;
    if (!cin || !mot_de_passe) return next(ApiError.badRequest('CIN and password are required'));
    if (!isValidCIN(cin)) return next(ApiError.badRequest('Invalid CIN format'));

    const personnel = await Personnel.findByCIN(cin);
    if (!personnel) {
      await handleFailedLogin(cin);
      return next(ApiError.unauthorized('Invalid CIN or password'));
    }
    if (!personnel.est_actif) return next(ApiError.forbidden('Your account has been deactivated.'));

    const isPasswordValid = await bcrypt.compare(mot_de_passe, personnel.mot_de_passe);
    if (!isPasswordValid) {
      await handleFailedLogin(cin);
      return next(ApiError.unauthorized('Invalid CIN or password'));
    }

    const tokens = await TokenService.generateAuthTokens({
      id: personnel.id,
      role: personnel.role,
    });

    await handleSuccessfulLogin(cin);
    return success(res, 200, 'Login successful', {
      user: {
        id: personnel.id,
        cin: personnel.cin,
        nom: personnel.nom,
        prenom: personnel.prenom,
        role: personnel.role,
        centre_id: personnel.centre_id,
      },
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.accessTokenExpiry,
      },
    });
  }),

  webAdminLogin: catchAsync(async (req, res, next) => {
    const { cin, mot_de_passe } = req.body;
    if (!cin || !mot_de_passe) return next(ApiError.badRequest('CIN and password are required'));
    const personnel = await Personnel.findByCIN(cin);
    if (!personnel || !(await bcrypt.compare(mot_de_passe, personnel.mot_de_passe))) {
      await handleFailedLogin(cin);
      return next(ApiError.unauthorized('Invalid admin credentials'));
    }
    if (personnel.role !== 'admin' || !personnel.est_actif) {
      return next(ApiError.forbidden('Active admin account required'));
    }
    await handleSuccessfulLogin(cin);
    const tokens = await TokenService.generateAuthTokens(
      { id: personnel.id, role: 'admin' },
      { sessionType: 'web-admin', refreshExpiresIn: `${config.surfaces.webAdminSessionDays}d` },
    );
    const csrfToken = setWebAdminCookies(res, tokens.refreshToken);
    return success(res, 200, 'Web admin login successful', {
      accessToken: tokens.accessToken,
      expiresIn: tokens.accessTokenExpiry,
      csrfToken,
    });
  }),

  webAdminRefresh: catchAsync(async (req, res, next) => {
    const refreshToken = parseCookies(req.headers.cookie)[WEB_REFRESH_COOKIE];
    if (!refreshToken) return next(ApiError.unauthorized('Web admin session expired'));
    const refreshIdentity = TokenService.verifyRefreshToken(refreshToken);
    req.user = { id: refreshIdentity.userId, role: refreshIdentity.role };
    const admin = await Personnel.findById(refreshIdentity.userId);
    if (refreshIdentity.role !== 'admin' || !admin || !admin.est_actif || admin.role !== 'admin') {
      await TokenService.revokeToken(refreshToken);
      clearWebAdminCookies(res);
      return next(ApiError.forbidden('Active admin session required'));
    }
    const tokens = await TokenService.refreshAuthTokens(refreshToken);
    const csrfToken = setWebAdminCookies(res, tokens.refreshToken);
    return success(res, 200, 'Web admin session refreshed', {
      accessToken: tokens.accessToken,
      expiresIn: tokens.accessTokenExpiry,
      csrfToken,
    });
  }),

  webAdminLogout: catchAsync(async (req, res) => {
    const refreshToken = parseCookies(req.headers.cookie)[WEB_REFRESH_COOKIE];
    if (refreshToken) await TokenService.revokeToken(refreshToken);
    clearWebAdminCookies(res);
    return success(res, 200, 'Web admin logged out');
  }),

  // ---- COMMON ----

  refreshToken: catchAsync(async (req, res, next) => {
    const { refreshToken } = req.body;
    if (!refreshToken) return next(ApiError.badRequest('Refresh token is required'));
    const refreshIdentity = TokenService.verifyRefreshToken(refreshToken);
    req.user = { id: refreshIdentity.userId, role: refreshIdentity.role };
    const tokens = await TokenService.refreshAuthTokens(refreshToken);
    return success(res, 200, 'Tokens refreshed successfully', {
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.accessTokenExpiry,
      },
    });
  }),

  logout: catchAsync(async (req, res, next) => {
    const refreshToken = req.body?.refreshToken;
    if (refreshToken) await TokenService.revokeToken(refreshToken);
    return success(res, 200, 'Logged out successfully');
  }),

  logoutAll: catchAsync(async (req, res, next) => {
    await TokenService.revokeAllUserTokens(req.user.id, req.user.role);
    return success(res, 200, 'Logged out from all devices successfully');
  }),

  updateProfile: catchAsync(async (req, res, next) => {
    if (req.user.role !== 'parent')
      return next(ApiError.forbidden('Only parents can update their profile this way'));

    const { nom, prenom, langue_preferee, email, centre_id } = req.body;

    // centre_id can only be set once — locked after first assignment
    if (centre_id && req.user.centre_id && req.user.centre_id !== Number(centre_id)) {
      return next(ApiError.forbidden('Le centre ne peut pas être modifié une fois fixé'));
    }

    const fields = {};
    if (nom      !== undefined) fields.nom    = nom;
    if (prenom   !== undefined) fields.prenom = prenom;
    if (langue_preferee !== undefined) fields.langue_preferee = langue_preferee;
    if (email    !== undefined) fields.email = email ? email.trim() : null;
    if (centre_id && !req.user.centre_id) fields.centre_id = Number(centre_id);

    const updatedParent = await Parent.update(req.user.id, fields);
    if (!updatedParent) return next(ApiError.notFound('Parent not found'));

    // Fetch centre name (always, so the client can display it without a separate round-trip)
    let centre_nom = null;
    const effectiveCentreId = updatedParent.centre_id;
    if (effectiveCentreId) {
      const { query: dbQuery } = require('../config/database');
      const cr = await dbQuery('SELECT nom FROM centre WHERE id = $1', [effectiveCentreId]);
      centre_nom = cr.rows[0]?.nom || null;
    }

    return success(res, 200, 'Profile updated successfully', {
      user: {
        id:              updatedParent.id,
        telephone:       updatedParent.telephone,
        nom:             updatedParent.nom,
        prenom:          updatedParent.prenom,
        email:           updatedParent.email || null,
        langue_preferee: updatedParent.langue_preferee,
        centre_id:       updatedParent.centre_id || null,
        centre_nom,
        role:            'parent',
      },
    });
  }),

  getMe: catchAsync(async (req, res, next) => {
    let user = null;
    if (req.user.role === 'parent') {
      const parent = await Parent.findById(req.user.id);
      if (!parent) return next(ApiError.notFound('User not found'));
      let centre_nom = null;
      if (parent.centre_id) {
        const centreRes = await query('SELECT nom FROM centre WHERE id = $1', [parent.centre_id]);
        centre_nom = centreRes.rows[0]?.nom || null;
      }
      user = { ...parent, role: 'parent', centre_nom };
    } else {
      user = await Personnel.findById(req.user.id);
      if (!user) return next(ApiError.notFound('User not found'));
      user = { ...user, role: req.user.role };
    }
    return success(res, 200, 'User profile retrieved', { user });
  }),

  changePassword: catchAsync(async (req, res, next) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return next(ApiError.badRequest('Current password and new password are required'));
    if (newPassword.length < 6)
      return next(ApiError.badRequest('New password must be at least 6 characters'));
    if (req.user.role === 'parent')
      return next(ApiError.forbidden('Parents use OTP authentication'));

    const personnel = await Personnel.findByIdWithPassword(req.user.id);
    if (!personnel) return next(ApiError.notFound('User not found'));

    const isPasswordValid = await bcrypt.compare(currentPassword, personnel.mot_de_passe);
    if (!isPasswordValid) return next(ApiError.unauthorized('Current password is incorrect'));

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await Personnel.update(req.user.id, { mot_de_passe: hashedPassword });
    await TokenService.revokeAllUserTokens(req.user.id, req.user.role);
    return success(res, 200, 'Password changed successfully');
  }),

  uploadPhoto: catchAsync(async (req, res, next) => {
    if (req.user.role !== 'parent')
      return next(ApiError.forbidden('Only parents can update their photo'));
    if (!req.file)
      return next(ApiError.badRequest('Aucun fichier reçu'));
    const photo_url = `/uploads/avatars/${req.file.filename}`;
    const updated = await Parent.update(req.user.id, { photo_url });
    if (!updated) return next(ApiError.notFound('Parent not found'));
    return success(res, 200, 'Photo mise à jour', { photo_url });
  }),
};

module.exports = AuthController;
