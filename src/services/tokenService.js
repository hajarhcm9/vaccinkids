const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const config = require('../config');

const TokenService = {
  generateAccessToken(payload) {
    return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
  },

  generateRefreshToken(payload) {
    return jwt.sign(payload, config.jwt.refreshSecret, { expiresIn: config.jwt.refreshExpiresIn });
  },

  async generateAuthTokens(user) {
    const accessPayload = {
      userId: user.id,
      role: user.role,
      telephone: user.telephone || undefined,
    };
    const refreshPayload = { userId: user.id, role: user.role, tokenType: 'refresh' };

    const accessToken = this.generateAccessToken(accessPayload);
    const refreshToken = this.generateRefreshToken(refreshPayload);

    const decoded = jwt.decode(accessToken);
    const refreshDecoded = jwt.decode(refreshToken);

    await query(
      `INSERT INTO refresh_tokens (user_id, user_role, token, expire_at) VALUES ($1, $2, $3, $4)`,
      [user.id, user.role, refreshToken, new Date(refreshDecoded.exp * 1000)],
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

    const result = await query(
      `SELECT * FROM refresh_tokens WHERE token = $1 AND est_revoque = FALSE AND expire_at > CURRENT_TIMESTAMP`,
      [refreshToken],
    );

    if (result.rows.length === 0) {
      const err = new Error('Refresh token not found or revoked');
      err.statusCode = 401;
      throw err;
    }

    await query('UPDATE refresh_tokens SET est_revoque = TRUE WHERE token = $1', [refreshToken]);

    return this.generateAuthTokens({ id: decoded.userId, role: decoded.role });
  },

  async revokeAllUserTokens(userId, userRole) {
    await query(
      'UPDATE refresh_tokens SET est_revoque = TRUE WHERE user_id = $1 AND user_role = $2',
      [userId, userRole],
    );
  },

  async revokeToken(token) {
    await query('UPDATE refresh_tokens SET est_revoque = TRUE WHERE token = $1', [token]);
  },
};

module.exports = TokenService;
