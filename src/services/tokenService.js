const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { query, getClient } = require('../config/database');
const config = require('../config');

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const runQuery = (client, text, params) =>
  client ? client.query(text, params) : query(text, params);

const TokenService = {
  generateAccessToken(payload) {
    return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
  },

  generateRefreshToken(payload) {
    return jwt.sign(payload, config.jwt.refreshSecret, { expiresIn: config.jwt.refreshExpiresIn });
  },

  async generateAuthTokens(user, options = {}) {
    const accessPayload = {
      userId: user.id,
      role: user.role,
      telephone: user.telephone || undefined,
    };
    const familyId = options.familyId || crypto.randomUUID();
    const refreshPayload = {
      userId: user.id,
      role: user.role,
      tokenType: 'refresh',
      familyId,
      jti: crypto.randomUUID(),
    };

    const accessToken = this.generateAccessToken(accessPayload);
    const refreshToken = this.generateRefreshToken(refreshPayload);

    const decoded = jwt.decode(accessToken);
    const refreshDecoded = jwt.decode(refreshToken);

    await runQuery(
      options.client,
      `INSERT INTO refresh_tokens (user_id, user_role, token_hash, family_id, expire_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.id, user.role, hashToken(refreshToken), familyId, new Date(refreshDecoded.exp * 1000)],
    );

    return { accessToken, refreshToken, accessTokenExpiry: decoded.exp * 1000 };
  },

  verifyAccessToken(token) {
    try {
      return jwt.verify(token, config.jwt.secret);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        const err = new Error('Access token expired');
        err.statusCode = 401;
        err.code = 'TOKEN_EXPIRED';
        throw err;
      }
      const err = new Error('Invalid access token');
      err.statusCode = 401;
      err.code = 'TOKEN_INVALID';
      throw err;
    }
  },

  verifyRefreshToken(token) {
    try {
      return jwt.verify(token, config.jwt.refreshSecret);
    } catch (error) {
      const err = new Error('Invalid refresh token');
      err.statusCode = 401;
      err.code = 'REFRESH_TOKEN_INVALID';
      throw err;
    }
  },

  async refreshAuthTokens(refreshToken) {
    const decoded = this.verifyRefreshToken(refreshToken);
    if (decoded.tokenType !== 'refresh' || !decoded.familyId || !decoded.userId || !decoded.role) {
      const err = new Error('Invalid refresh token');
      err.statusCode = 401;
      err.code = 'REFRESH_TOKEN_INVALID';
      throw err;
    }

    const tokenHash = hashToken(refreshToken);
    const client = await getClient();
    let transactionClosed = false;

    try {
      await client.query('BEGIN');
      const result = await client.query(
        `SELECT * FROM refresh_tokens WHERE token_hash = $1 FOR UPDATE`,
        [tokenHash],
      );
      const storedToken = result.rows[0];

      if (!storedToken || storedToken.expire_at <= new Date()) {
        const err = new Error('Refresh token not found or expired');
        err.statusCode = 401;
        throw err;
      }

      if (
        storedToken.user_id !== decoded.userId ||
        storedToken.user_role !== decoded.role ||
        storedToken.family_id !== decoded.familyId
      ) {
        await client.query(
          `UPDATE refresh_tokens
           SET est_revoque = TRUE, revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP)
           WHERE family_id = $1`,
          [storedToken.family_id],
        );
        await client.query('COMMIT');
        transactionClosed = true;
        const err = new Error('Refresh token binding mismatch');
        err.statusCode = 401;
        err.code = 'REFRESH_TOKEN_INVALID';
        throw err;
      }

      if (storedToken.est_revoque) {
        await client.query(
          `UPDATE refresh_tokens
           SET est_revoque = TRUE, revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP)
           WHERE family_id = $1`,
          [storedToken.family_id],
        );
        await client.query('COMMIT');
        transactionClosed = true;
        const err = new Error('Refresh token reuse detected; session family revoked');
        err.statusCode = 401;
        throw err;
      }

      const tokens = await this.generateAuthTokens(
        { id: decoded.userId, role: decoded.role },
        { familyId: storedToken.family_id, client },
      );
      await client.query(
        `UPDATE refresh_tokens
         SET est_revoque = TRUE, revoked_at = CURRENT_TIMESTAMP, replaced_by_hash = $2
         WHERE token_hash = $1`,
        [tokenHash, hashToken(tokens.refreshToken)],
      );
      await client.query('COMMIT');
      transactionClosed = true;
      return tokens;
    } catch (error) {
      if (!transactionClosed) await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async revokeAllUserTokens(userId, userRole) {
    await query(
      `UPDATE refresh_tokens
       SET est_revoque = TRUE, revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP)
       WHERE user_id = $1 AND user_role = $2`,
      [userId, userRole],
    );
  },

  async revokeToken(token) {
    await query(
      `UPDATE refresh_tokens
       SET est_revoque = TRUE, revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP)
       WHERE token_hash = $1`,
      [hashToken(token)],
    );
  },
};

module.exports = TokenService;
