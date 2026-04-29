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

module.exports = { success, created, noContent, paginated };
