/**
 * Async error handler wrapper
 * Eliminates the need for try/catch in every route handler
 *
 * Usage:
 *   router.get('/users', catchAsync(async (req, res) => {
 *     const users = await User.findAll();
 *     res.json(users);
 *   }));
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = catchAsync;
