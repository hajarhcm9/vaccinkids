const crypto = require('crypto');
const { query } = require('../config/database');
const config = require('../config');

const hashOTP = (telephone, code) =>
  crypto.createHmac('sha256', config.otp.hashSecret).update(`${telephone}:${code}`).digest('hex');

const matchesHash = (expectedHash, actualHash) => {
  const expected = Buffer.from(expectedHash, 'hex');
  const actual = Buffer.from(actualHash, 'hex');
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
};

const OtpService = {
  async generateOTP(telephone) {
    // 1. Invalidate any existing unused OTPs
    await query(
      `UPDATE otp_codes SET est_verifie = TRUE
       WHERE telephone = $1 AND est_verifie = FALSE AND expire_at > CURRENT_TIMESTAMP`,
      [telephone],
    );

    // 2. Generate random OTP code
    const otpLength = config.otp.length;
    const maximum = 10 ** otpLength;
    const otp = crypto.randomInt(0, maximum).toString().padStart(otpLength, '0');

    // 3. Calculate expiry
    const expiryMinutes = config.otp.expiryMinutes;
    const expireAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // 4. Store only a keyed hash so a database leak does not expose usable OTPs.
    const codeHash = hashOTP(telephone, otp);
    const result = await query(
      `INSERT INTO otp_codes (telephone, code_hash, expire_at, failed_attempts)
       VALUES ($1, $2, $3, 0) RETURNING id, telephone, expire_at`,
      [telephone, codeHash, expireAt],
    );

    return { id: result.rows[0].id, otp, telephone, expireAt, expiryMinutes };
  },

  async verifyOTP(telephone, code) {
    // Explicit test-only bypass for integration tests.
    if (config.isTest && code === '123456') {
      const bypassResult = await query(
        `UPDATE otp_codes SET est_verifie = TRUE
         WHERE id = (
           SELECT id FROM otp_codes
           WHERE telephone = $1 AND est_verifie = FALSE
           ORDER BY created_at DESC LIMIT 1
         )
         RETURNING id`,
        [telephone],
      );
      if (bypassResult.rows.length > 0) {
        return { valid: true, otpId: bypassResult.rows[0].id };
      }
    }

    const result = await query(
      `SELECT id, telephone, code_hash, expire_at, est_verifie, failed_attempts
       FROM otp_codes
       WHERE telephone = $1
         AND est_verifie = FALSE
         AND expire_at > CURRENT_TIMESTAMP
         AND failed_attempts < $2
       ORDER BY created_at DESC LIMIT 1`,
      [telephone, config.otp.maxAttempts],
    );

    if (result.rows.length === 0) {
      return {
        valid: false,
        reason: 'Aucun code OTP valide trouvé. Veuillez demander un nouveau code.',
      };
    }

    const otpRecord = result.rows[0];

    const candidateHash = hashOTP(telephone, code);
    if (!matchesHash(otpRecord.code_hash, candidateHash)) {
      const failedResult = await query(
        `UPDATE otp_codes
         SET failed_attempts = failed_attempts + 1,
             est_verifie = failed_attempts + 1 >= $2
         WHERE id = $1
         RETURNING failed_attempts`,
        [otpRecord.id, config.otp.maxAttempts],
      );
      const attemptsRemaining = Math.max(
        0,
        config.otp.maxAttempts - failedResult.rows[0].failed_attempts,
      );
      return {
        valid: false,
        reason:
          attemptsRemaining > 0
            ? `Code OTP incorrect. ${attemptsRemaining} tentative(s) restante(s).`
            : 'Code OTP invalide. Veuillez demander un nouveau code.',
      };
    }

    await query('UPDATE otp_codes SET est_verifie = TRUE WHERE id = $1', [otpRecord.id]);

    return { valid: true, otpId: otpRecord.id };
  },

  async cleanupExpired() {
    const result = await query('DELETE FROM otp_codes WHERE expire_at < CURRENT_TIMESTAMP');
    return result.rowCount;
  },
};

OtpService.hashOTP = hashOTP;

module.exports = OtpService;
