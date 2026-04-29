/**
 * Input validation utility functions
 */

/**
 * Validate Moroccan phone number
 * Accepts: +212XXXXXXXXX, 06XXXXXXXX, 6XXXXXXXX
 */
const isValidMoroccanPhone = (phone) => {
  const patterns = [/^\+212[5-7]\d{8}$/, /^0[5-7]\d{8}$/, /^[5-7]\d{8}$/];
  return patterns.some((pattern) => pattern.test(phone));
};

/**
 * Normalize phone number to +212 format
 */
const normalizePhone = (phone) => {
  const cleaned = phone.replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('0')) {
    return '+212' + cleaned.substring(1);
  }
  if (cleaned.startsWith('6') || cleaned.startsWith('7')) {
    return '+212' + cleaned;
  }
  return cleaned;
};

/**
 * Validate CIN (Carte d'Identité Nationale)
 * Moroccan CIN: letter + 6-8 digits OR just 6-8 digits
 */
/**
 * Validate CIN (Carte d'Identité Nationale)
 * Moroccan CIN + admin accounts: alphanumeric 4-12 chars
 * Examples: "12345678", "A123456", "ADMIN01", "INFIRM01"
 */
const isValidCIN = (cin) => {
  if (!cin || typeof cin !== 'string') return false;
  // Alphanumeric, 4-12 characters (covers all formats + admin accounts)
  return /^[A-Za-z0-9]{4,12}$/.test(cin);
};

/**
 * Validate OTP code format
 */
const isValidOTP = (otp, length = 6) => {
  return new RegExp(`^\\d{${length}}$`).test(otp);
};

/**
 * Sanitize string input (remove HTML tags and trim)
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>/g, '').trim();
};

/**
 * Validate date format (YYYY-MM-DD)
 */
const isValidDate = (dateStr) => {
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date) && dateStr.match(/^\d{4}-\d{2}-\d{2}$/);
};

module.exports = {
  isValidMoroccanPhone,
  normalizePhone,
  isValidCIN,
  isValidOTP,
  sanitizeString,
  isValidDate,
};
