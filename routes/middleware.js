const { DOMAIN } = process.env;
const { NotFoundError } = require("../lib/errors.js");
const MSG = require("../lib/msg.json");
const { durationSecsToHHMMSS } = require("../lib/playlist.js");
const { ForbiddenError } = require("../lib/errors.js");

async function apiAuth(req, res, next) {
  const { authorization, "user-id": userId } = req.headers;
  const persistence = req.app.locals.persistence;
  const response = await persistence.decryptedApiKey(+userId);
  if (!response) throw new ForbiddenError();
  const { decrypted_api_key: decryptedApiKey } = response;
  console.log({ decryptedApiKey, authorization });
  if (`Bearer ${decryptedApiKey}` !== authorization) {
    throw new ForbiddenError();
  }
  //if user and day is the same as current day in json return too many request
  //check the total number of request on user for the day, if greater than 2 return true too many request
  // check if user id exist, if not add the userid and the day else update the value to the new day
  await persistence.addRequest(+userId);

  next();
}
async function apiAuthStream(req, res, next) {
  const { authorization } = req.headers;
  const persistence = req.app.locals.persistence;
  const response = await persistence.decryptedApiKey(7);
  if (!response) throw new ForbiddenError();
  const { decrypted_api_key: decryptedApiKey } = response;
  console.log({ decryptedApiKey, authorization });
  if (`Bearer ${decryptedApiKey}` !== authorization) {
    throw new ForbiddenError();
  }
  next();
}
function requireAuth(req, res, next) {
  if (!req.session.user) {
    const requestURL = encodeURIComponent(req.originalUrl);
    const fullRequestURL = `${DOMAIN}${requestURL}`;
    req.session.requestMethod = req.method;
    req.session.referrer = req.header("Referrer");
    req.flash("errors", MSG.error401);
    res.redirect(`/signin?fullRedirectUrl=${fullRequestURL}`);
  } else {
    next();
  }
}

async function getPlaylists(
  playlistType,
  page,
  ITEMS_PER_PAGE,
  persistence,
  PAGE_OFFSET,
  userId,
) {
  const offset = (+page - 1) * ITEMS_PER_PAGE;
  let totalPages, playlists, playlist, pageTitle;

  if (playlistType === "public" || playlistType === "anonPublic") {
    pageTitle = "Public Playlists";
    playlist = await persistence.getPublicPlaylistTotal();
    if (!playlist) throw new NotFoundError();
    totalPages = Math.ceil(+playlist.count / ITEMS_PER_PAGE);
    if ((+page > totalPages && +page !== 1) || +page < 1)
      throw new NotFoundError();
    playlists = await persistence.getPublicPlaylistsPage(
      offset,
      ITEMS_PER_PAGE,
    );
  }
  if (playlistType === "your") {
    pageTitle = "Your Playlists";
    playlist = await persistence.getYourPlaylistTotal(userId);
    if (!playlist) throw new NotFoundError();
    totalPages = Math.ceil(+playlist.count / ITEMS_PER_PAGE);
    if ((+page > totalPages && +page !== 1) || +page < 1)
      throw new NotFoundError();
    playlists = await persistence.getYourPlaylistsPage(
      userId,
      offset,
      ITEMS_PER_PAGE,
    );
  }
  if (playlistType === "contribution") {
    pageTitle = "Contribution Playlists";
    playlist = await persistence.getContributionPlaylistTotal(userId);
    totalPages = Math.ceil(+playlist.count / ITEMS_PER_PAGE);
    if ((+page > totalPages && +page !== 1) || +page < 1)
      throw new NotFoundError();
    if (!playlist) throw new NotFoundError();
    playlists = await persistence.getContributionPlaylistsPage(
      userId,
      offset,
      ITEMS_PER_PAGE,
    );
  }
  const startPage = Math.max(+page - PAGE_OFFSET, 1);
  const endPage = Math.min(+page + PAGE_OFFSET, totalPages);
  return {
    startPage,
    endPage,
    totalPages,
    playlistType,
    pageTitle,
    playlists,
    page: +page,
    playlistTotal: +playlist.count,
  };
}

async function getPlaylist(
  persistence,
  ITEMS_PER_PAGE,
  PAGE_OFFSET,
  playlistType,
  playlistId,
  page,
  pagePl,
) {
  const offset = (+pagePl - 1) * ITEMS_PER_PAGE;
  const playlist = await persistence.getSongTotal(+playlistId);
  if (!playlist) throw new NotFoundError();
  const totalPages = Math.ceil(+playlist.count / ITEMS_PER_PAGE);
  if ((+pagePl > totalPages && +pagePl !== 1) || +pagePl < 1)
    throw new NotFoundError();
  const playlistObj = await persistence.getPlaylistInfoSongs(
    +playlistId,
    offset,
    ITEMS_PER_PAGE,
  );
  const videoIds = playlistObj.songs.map((song) => song.video_id);
  playlistObj.songs.forEach((song) => {
    song.duration_sec = durationSecsToHHMMSS(song.duration_sec);
  });
  const startPage = Math.max(+pagePl - PAGE_OFFSET, 1);
  const endPage = Math.min(+pagePl + PAGE_OFFSET, totalPages);
  return {
    playlist: playlistObj,
    pageTitle: playlistObj.info.title,
    videoIds,
    totalPages,
    page: +page,
    pagePl: +pagePl,
    endPage,
    startPage,
    playlistTotal: +playlistObj.count,
    playlistType,
    playlistId: +playlistId,
  };
}

module.exports = {
  getPlaylists,
  getPlaylist,
  requireAuth,
  apiAuth,
  apiAuthStream,
};
