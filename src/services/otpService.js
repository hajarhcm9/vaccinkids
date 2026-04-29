const { query } = require('../config/database');
const config = require('../config');

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
    let otp = '';
    for (let i = 0; i < otpLength; i++) {
      otp += Math.floor(Math.random() * 10).toString();
    }

    // 3. Calculate expiry
    const expiryMinutes = config.otp.expiryMinutes;
    const expireAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // 4. Store in database
    const result = await query(
      `INSERT INTO otp_codes (telephone, code, expire_at)
       VALUES ($1, $2, $3) RETURNING id, telephone, code, expire_at`,
      [telephone, otp, expireAt],
    );

    return { id: result.rows[0].id, otp, telephone, expireAt, expiryMinutes };
  },

  async verifyOTP(telephone, code) {
    const result = await query(
      `SELECT id, telephone, code, expire_at, est_verifie
       FROM otp_codes
       WHERE telephone = $1 AND est_verifie = FALSE AND expire_at > CURRENT_TIMESTAMP
       ORDER BY created_at DESC LIMIT 1`,
      [telephone],
    );

    if (result.rows.length === 0) {
      return {
        valid: false,
        reason: 'Aucun code OTP valide trouvé. Veuillez demander un nouveau code.',
      };
    }

    const otpRecord = result.rows[0];

    if (otpRecord.code !== code) {
      return { valid: false, reason: 'Code OTP incorrect. Veuillez réessayer.' };
    }

    await query('UPDATE otp_codes SET est_verifie = TRUE WHERE id = $1', [otpRecord.id]);

    return { valid: true, otpId: otpRecord.id };
  },

  async cleanupExpired() {
    const result = await query('DELETE FROM otp_codes WHERE expire_at < CURRENT_TIMESTAMP');
    return result.rowCount;
  },
};

module.exports = OtpService;
