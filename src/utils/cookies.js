const crypto = require('crypto');

const parseCookies = (header = '') =>
  Object.fromEntries(
    header
      .split(';')
      .map((part) => part.trim().split('='))
      .filter(([key, value]) => key && value)
      .map(([key, ...value]) => [key, decodeURIComponent(value.join('='))]),
  );

const cookieOptions = ({ httpOnly = false, maxAge, path = '/' } = {}) => ({
  httpOnly,
  maxAge,
  path,
  sameSite: 'strict',
  secure: process.env.NODE_ENV === 'production',
});

const createCsrfToken = () => crypto.randomBytes(32).toString('hex');

module.exports = { parseCookies, cookieOptions, createCsrfToken };
