const ApiError = require('../utils/ApiError');

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ALLOWED_QUERY = new Set([
  'centre_id',
  'date_debut',
  'date_fin',
  'start_date',
  'end_date',
  'month',
  'year',
]);

function validDate(value) {
  if (!DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function exportSecurity(req, res, next) {
  const unknown = Object.keys(req.query).filter((key) => !ALLOWED_QUERY.has(key));
  if (unknown.length) return next(ApiError.badRequest(`Unsupported export filter: ${unknown[0]}`));

  if (req.query.centre_id && !/^[1-9]\d*$/.test(req.query.centre_id)) {
    return next(ApiError.badRequest('centre_id must be a positive integer'));
  }

  const start = req.query.date_debut || req.query.start_date;
  const end = req.query.date_fin || req.query.end_date;
  if ((start && !validDate(start)) || (end && !validDate(end))) {
    return next(ApiError.badRequest('Export dates must use YYYY-MM-DD'));
  }
  if (start && end && new Date(start) > new Date(end)) {
    return next(ApiError.badRequest('Export start date must be before end date'));
  }

  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Pragma', 'no-cache');

  const originalSend = res.send.bind(res);
  res.send = (body) => {
    const maxBytes = parseInt(process.env.EXPORT_MAX_BYTES, 10) || 10 * 1024 * 1024;
    if (Buffer.isBuffer(body) && body.length > maxBytes) {
      return next(new ApiError(413, 'Generated export exceeds the allowed size'));
    }
    return originalSend(body);
  };
  return next();
}

module.exports = exportSecurity;
