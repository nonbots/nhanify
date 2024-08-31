// wrapper for async middleware. Elminates need to catch errors.
const catchError = (handler) => {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch((err) => {
      console.log("ERR", err);
      next(err);
    });
  };
};

module.exports = catchError;
