const MSG = require("./msg.json");
// wrapper for async middleware. Elminates need to catch errors.
const catchError = (handler) => {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch((err) => {
      err.params = req.params;
      console.log("ERR", err);
      next(err);
    });
  };
};

module.exports = catchError;
