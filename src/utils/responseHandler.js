/**
 * Standardized API response helpers
 */

const success = (res, statusCode = 200, message = 'Success', data = null) => {
  const response = {
    status: 'success',
    message,
  };
  if (data !== null) {
    response.data = data;
  }
  return res.status(statusCode).json(response);
};

const created = (res, message = 'Resource created successfully', data = null) => {
  return success(res, 201, message, data);
};

const noContent = (res) => {
  return res.status(204).send();
};

const paginated = (res, items, total, page, limit) => {
  return res.status(200).json({
    status: 'success',
    data: items,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(total / limit),
    },
  });
};


/**
 * Not found response (404)
 */
var notFound = function(res, message) {
  return res.status(404).json({ status: 'error', message: message || 'Resource not found' });
};

/**
 * Error response
 */
var error = function(res, message, statusCode) {
  return res.status(statusCode || 500).json({ status: 'error', message: message || 'Internal Server Error' });
};

module.exports = { success, created, noContent, paginated, notFound, error };
