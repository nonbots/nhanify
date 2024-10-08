const { Router } = require("express");
const songsRouter = Router();
const { requireAuth } = require("./middleware.js");
const catchError = require("./catch-error.js");
const { NotFoundError, ForbiddenError } = require("../lib/errors.js");
const { getPlaylist } = require("./middleware.js");
const { body, validationResult } = require("express-validator");
const { isValidURL, getVidInfo } = require("../lib/playlist.js");
const { YT_API_KEY} = process.env;
const SONGS_PER_PAGE = 100;
const MSG = require("../lib/msg.json");
const PAGE_OFFSET = 4;

// Get a playlist.
songsRouter.get(
  "/:playlistType/playlists/:page/playlist/:pagePl/:playlistId",
  requireAuth,
  catchError(async (req, res) => {
    const { page, pagePl, playlistType, playlistId } = req.params;

    const persistence = req.app.locals.persistence;
    const isReadAuth = await persistence.isReadPlaylistAuthorized(
      +playlistId,
      req.session.user.id,
    );
    if (!isReadAuth) throw new ForbiddenError();
    const data = await getPlaylist(
      req.app.locals.persistence,
      SONGS_PER_PAGE,
      PAGE_OFFSET,
      playlistType,
      playlistId,
      page,
      pagePl,
    );
    return res.render("playlist", data);
  }),
);

// Get the song's edit form.
songsRouter.get(
  "/:playlistType/playlists/:page/playlist/:pagePl/:playlistId/:songId/edit",
  requireAuth,
  catchError(async (req, res) => {
    const { playlistType, playlistId, songId, page, pagePl } = req.params;
    const persistence = req.app.locals.persistence;
    const writePlaylist = await persistence.isWriteSongAuthorized(
      playlistId,
      req.session.user.id,
    );
    if (!writePlaylist) throw new ForbiddenError();
    const song = await persistence.getSongTitle(songId);
    if (!song) throw new NotFoundError();
    res.render("edit_song", {
      title: song.title,
      playlistType,
      playlistId,
      songId,
      pageTitle: `Edit ${song.title}`,
      page: +page,
      pagePl: +pagePl,
    });
  }),
);

// Edit a song on a playlist.
songsRouter.post(
  "/:playlistType/playlists/:page/playlist/:pagePl/:playlistId/:songId/edit",
  requireAuth,
  [
    body("title")
      .trim()
      .isLength({ min: 1 })
      .withMessage("Title is empty.")
      .isLength({ max: 72 })
      .withMessage("Title is over the min limit of 72 characters."),
  ],
  catchError(async (req, res) => {
    const { playlistType, playlistId, songId, page, pagePl } = req.params;
    const persistence = req.app.locals.persistence;
    const writePlaylist = await persistence.isWriteSongAuthorized(
      +playlistId,
      req.session.user.id,
    );
    if (!writePlaylist) throw new ForbiddenError();
    const rerender = async () => {
      const song = await persistence.getSongTitle(songId);
      if (!song) throw new NotFoundError();
      res.render("edit_song", {
        flash: req.flash(),
        title: song.title,
        playlistType,
        playlistId,
        songId,
        pageTitle: `Edit ${song.title}`,
        page: +page,
        pagePl: +pagePl,
      });
    };
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      errors.array().forEach((message) => req.flash("errors", message.msg));
      await rerender();
      return;
    }
    try {
      const edited = await persistence.editSong(songId, req.body.title);
      if (!edited) {
        req.flash("errors", MSG.notExistSong);
        await rerender();
        return;
      }
    } catch (error) {
      if (error.constraint === "unique_title_playlist_id") {
        req.flash("errors", MSG.uniqueSong);
        await rerender();
        return;
      }
      throw error;
    }
    req.flash("successes", MSG.editedSong);
    return res.redirect(
      `/${playlistType}/playlists/${page}/playlist/${pagePl}/${playlistId}`,
    );
  }),
);

// Add a song to a playlist.
songsRouter.post(
  "/:playlistType/playlists/:page/playlist/:pagePl/:playlistId/add",
  requireAuth,
  [
    body("url")
      .trim()
      .isLength({ min: 1 })
      .withMessage("Url is empty.")
      .custom(isValidURL)
      .withMessage(MSG.invalidURL),
  ],
  catchError(async (req, res) => {
    const { playlistType, playlistId, page, pagePl } = req.params;
    const persistence = req.app.locals.persistence;
    const writePlaylist = await persistence.isWriteSongAuthorized(
      +playlistId,
      req.session.user.id,
    );
    if (!writePlaylist) throw new ForbiddenError();
    const rerender = async () => {
      const offset = (+pagePl - 1) * SONGS_PER_PAGE;
      const playlist = await persistence.getPlaylistInfoSongs(
        +playlistId,
        offset,
        SONGS_PER_PAGE,
      );
      const videoIds = playlist.songs.map((song) => song.video_id);
      const totalPages = Math.ceil(+playlist.songTotal / SONGS_PER_PAGE);
      if ((+pagePl > totalPages && +pagePl !== 1) || +pagePl < 1)
        throw new NotFoundError();
      const startPage = Math.max(+pagePl - PAGE_OFFSET, 1);
      const endPage = Math.min(+pagePl + PAGE_OFFSET, totalPages);
      return res.render("playlist", {
        flash: req.flash(),
        playlist,
        pageTitle: playlist.info.title,
        videoIds,
        totalPages,
        page: +page,
        pagePl: +pagePl,
        endPage,
        startPage,
        playlistTotal: +playlist.songTotal,
        playlistType,
        playlistId: +playlistId,
        url: req.body.url,
        title: req.body.title,
      });
    };
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      errors.array().forEach((message) => {
        req.flash("errors", message.msg);
      });
      await rerender();
      return;
    }
    //const videoId = parseURL(req.body.url);
    const vidInfo = await getVidInfo(req.body.url, YT_API_KEY);
    if (!vidInfo) {
      req.flash("errors", MSG.invalidVideoId);
      await rerender();
      return;
    }
    try {
      const song = await persistence.addSong(
        vidInfo.title,
        vidInfo.videoId,
        +playlistId,
        req.session.user.id,
        vidInfo.durationSecs,
      );
      if (song.rowCount === 0) {
        req.flash("errors", MSG.overSongsLimit);
        return res.redirect(
          `/${playlistType}/playlists/${page}/playlist/${pagePl}/${playlistId}`,
        );
      }
    } catch (error) {
      if (error.constraint === "unique_video_id_playlist_id") {
        req.flash("errors", MSG.uniqueSong);
        await rerender();
        return;
      }
      if (error.constraint === "unique_title_playlist_id") {
        req.flash("errors", MSG.uniqueSongTitle);
        await rerender();
        return;
      }
      throw error;
    }
    req.flash("successes", MSG.addedSong);
    return res.redirect(
      `/${playlistType}/playlists/${page}/playlist/${pagePl}/${playlistId}`,
    );
  }),
);

// Delete a song from playlist.
songsRouter.post(
  "/:playlistType/playlists/:page/playlist/:pagePl/:playlistId/:songId/delete",
  requireAuth,
  catchError(async (req, res) => {
    let { playlistType, playlistId, songId, page, pagePl } = req.params;
    const persistence = req.app.locals.persistence;
    const writePlaylist = await persistence.isWriteSongAuthorized(
      +playlistId,
      req.session.user.id,
    );
    if (!writePlaylist) throw new ForbiddenError();
    const deleted = await persistence.deleteSong(+songId);
    if (!deleted) throw new NotFoundError();
    const song = await persistence.getSongTotal(playlistId);
    if (!song) throw new NotFoundError();
    const totalPages = Math.ceil(+song.count / SONGS_PER_PAGE);
    req.flash("successes", MSG.deleteSong);
    if (+pagePl > totalPages && +pagePl !== 1) pagePl = +pagePl - 1;
    return res.redirect(
      `/${playlistType}/playlists/${page}/playlist/${pagePl}/${playlistId}`,
    );
  }),
);

module.exports = { songsRouter };
