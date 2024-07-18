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

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    next(err);
  }
  req.flash("errors", MSG.unknownDbError);
  const { playlistType, playlistId } = err.params || {};

  if (
    req.path === `/${playlistType}/playlist/${playlistId}/contributors/add` &&
    req.method === "POST"
  ) {
    return res.redirect(
      `/${playlistType}/playlist/${playlistId}/contributors/add`,
    );
  }
  if (
    req.path === `/${playlistType}/playlist/${playlistId}/contributors/add` &&
    req.method === "GET"
  ) {
    return res.redirect(`/${playlistType}/playlist/${playlistId}/contributors`);
  }
  if (
    req.path === `/${playlistType}/playlist/${playlistId}/contributors` &&
    req.method === "GET"
  ) {
    return res.redirect(`/${playlistType}/playlist/${playlistId}`);
  }
  if (
    (req.path === `/${playlistType}/playlist/${playlistId}` &&
      req.method === "GET") ||
    (req.path === `/playlists/${playlistId}/delete` && req.method === "POST")
  ) {
    return res.redirect("/playlists/your");
  }
}
module.exports = catchError;
