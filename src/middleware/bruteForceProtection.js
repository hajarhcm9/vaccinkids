'use strict';

const { pool } = require('../config/database');

/**
 * Brute Force Protection Middleware
 * Tracks failed login attempts and temporarily locks accounts
 */

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_TIME_MINUTES = 30;

const checkAccountLock = async (req, res, next) => {
  try {
    const { cin } = req.body;

    if (!cin) {
      return next();
    }

    // Check if account is locked
    const result = await pool.query(
      `SELECT id, est_actif, locked_until FROM personnel WHERE cin = $1`,
      [cin],
    );

    if (result.rows.length === 0) {
      // Don't reveal whether user exists - just continue
      return next();
    }

    const user = result.rows[0];

    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const remainingMinutes = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
      return res.status(423).json({
        status: 'error',
        message: `Account is temporarily locked due to too many failed login attempts. Please try again in ${remainingMinutes} minutes.`,
        code: 'ACCOUNT_LOCKED',
      });
    }

    // If lock has expired, reset it
    if (user.locked_until && new Date(user.locked_until) <= new Date()) {
      await pool.query(
        `UPDATE personnel SET failed_login_attempts = 0, locked_until = NULL WHERE cin = $1`,
        [cin],
      );
    }

    return next();
  } catch (error) {
    console.error('Brute force check error:', error.message);
    return next();
  }
};

const handleFailedLogin = async (cin) => {
  try {
    // Increment failed attempts
    const result = await pool.query(
      `UPDATE personnel SET failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1 WHERE cin = $1 RETURNING failed_login_attempts`,
      [cin],
    );

    if (result.rows.length > 0 && result.rows[0].failed_login_attempts >= MAX_FAILED_ATTEMPTS) {
      // Lock the account
      await pool.query(
        `UPDATE personnel SET locked_until = NOW() + INTERVAL '${LOCK_TIME_MINUTES} minutes' WHERE cin = $1`,
        [cin],
      );
    }
  } catch (error) {
    console.error('Failed login handler error:', error.message);
  }
};

const handleSuccessfulLogin = async (cin) => {
  try {
    await pool.query(
      `UPDATE personnel SET failed_login_attempts = 0, locked_until = NULL WHERE cin = $1`,
      [cin],
    );
  } catch (error) {
    console.error('Successful login handler error:', error.message);
  }
};

module.exports = {
  checkAccountLock,
  handleFailedLogin,
  handleSuccessfulLogin,
  MAX_FAILED_ATTEMPTS,
  LOCK_TIME_MINUTES,
};
