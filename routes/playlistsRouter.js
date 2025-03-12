const { Router } = require("express");
const { v7: uuidv7 } = require("uuid");
const playlistsRouter = Router();
const { requireAuth } = require("./middleware.js");
const catchError = require("./catch-error.js");
const { NotFoundError, ForbiddenError } = require("../lib/errors.js");
const { getPlaylists, getPlaylist } = require("./middleware.js");
const { body, validationResult } = require("express-validator");
const PLAYLISTS_PER_PAGE = 10;
const MSG = require("../lib/msg.json");
const PAGE_OFFSET = 4;
// Get a playlist's edit form.
playlistsRouter.get(
  "/:playlistType/playlists/:page/playlist/:playlistId/edit",
  requireAuth,
  catchError(async (req, res) => {
    const { playlistId, playlistType, page } = req.params;
    const persistence = req.app.locals.persistence;
    const isYourPlaylist = await persistence.isYourPlaylist(
      +playlistId,
      req.session.user.id,
    );
    if (!isYourPlaylist) throw new ForbiddenError();
    const playlist = await persistence.getPlaylist(+playlistId);
    if (!playlist) throw new NotFoundError();
    res.render("edit_playlist", {
      playlist,
      pageTitle: `Edit ${playlist.title}`,
      playlistId: +playlistId,
      playlistType,
      page: +page,
    });
  }),
);

// Edit a playlist.
playlistsRouter.post(
  "/:playlistType/playlists/:page/playlist/:playlistId/edit",
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
    const { playlistType, playlistId, page } = req.params;
    const persistence = req.app.locals.persistence;
    const isYourPlaylist = await persistence.isYourPlaylist(
      +playlistId,
      req.session.user.id,
    );
    if (!isYourPlaylist) throw new ForbiddenError();
    const rerender = async () => {
      const playlist = await persistence.getPlaylist(+playlistId);
      if (!playlist) throw new NotFoundError();
      res.render("edit_playlist", {
        flash: req.flash(),
        playlist,
        pageTitle: `Edit ${playlist.title}`,
        playlistId: +playlistId,
        playlistType,
        page: +page,
      });
    };
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      errors.array().forEach((message) => req.flash("errors", message.msg));
      await rerender();
      return;
    }
    const isPrivate = req.body.visiability === "private";
    try {
      const edited = await persistence.editPlaylist(
        +playlistId,
        req.body.title,
        isPrivate,
      );
      if (!edited) throw new NotFoundError();
    } catch (error) {
      if (error.constraint === "unique_creator_id_title") {
        req.flash("errors", MSG.uniquePlaylist);
        await rerender();
        return;
      }
      throw error;
    }
    req.flash("successes", MSG.playlistEdited);
    return res.redirect(`/your/playlists/${page}`);
  }),
);

// Get playlist as anonymous user.
playlistsRouter.get(
  "/anon/public/playlists/:page/playlist/:pagePl/:playlistId",
  catchError(async (req, res) => {
    const { page, playlistId, pagePl } = req.params;
    const data = await getPlaylist(
      req.app.locals.persistence,
      PLAYLISTS_PER_PAGE,
      PAGE_OFFSET,
      "anonPublic",
      +playlistId,
      +page,
      +pagePl,
    );
    return res.render("playlist", data);
  }),
);

// Delete contribution playlist.
playlistsRouter.post(
  "/contribution/playlists/:page/playlist/:playlistId/delete",
  requireAuth,
  catchError(async (req, res) => {
    let { playlistId, page } = req.params;
    const userId = req.session.user.id;
    const persistence = req.app.locals.persistence;
    const contributionPlaylist = await persistence.deleteContributionPlaylist(
      +playlistId,
      userId,
    );
    if (!contributionPlaylist) throw new NotFoundError();
    const playlist = await persistence.getContributionPlaylistTotal(userId);
    if (!playlist) throw new NotFoundError();
    const totalPages = Math.ceil(+playlist.count / PLAYLISTS_PER_PAGE);
    req.flash("successes", MSG.deletePlaylist);
    if (+page > totalPages && +page !== 1) page = +page - 1;
    return res.redirect(`/contribution/playlists/${page}`);
  }),
);

// Delete a playlist.
playlistsRouter.post(
  "/:playlistType/playlists/:page/playlist/:playlistId/delete",
  requireAuth,
  catchError(async (req, res) => {
    let { playlistId, page } = req.params;
    const userId = +req.session.user.id;
    const persistence = req.app.locals.persistence;
    const isYourPlaylist = await persistence.isYourPlaylist(
      +playlistId,
      userId,
    );
    if (!isYourPlaylist) throw new ForbiddenError();
    const deleted = await persistence.deletePlaylist(+playlistId);
    if (!deleted) throw new NotFoundError();
    const playlist = await persistence.getYourPlaylistTotal(userId);
    if (!playlist) throw new NotFoundError();
    const totalPages = Math.ceil(+playlist.count / PLAYLISTS_PER_PAGE);
    req.flash("successes", MSG.deletePlaylist);
    if (+page > totalPages && +page !== 1) page = +page - 1;
    return res.redirect(`/your/playlists/${page}`);
  }),
);

// Create a playlist.
playlistsRouter.post(
  "/:playlistType/playlists/:page/create",
  requireAuth,
  [
    body("title")
      .trim()
      .custom((usernameInput) => {
        const input = usernameInput.replace(
          // eslint-disable-next-line no-control-regex
          /[\x00|\x01|\x02|\x03|\x04|\x05|\x06|\x07|\x08|\x09|\x0A|\x0B|\x0C|\x0D|\x0E|\x0F|\x10|\x11|\x12|\x13|\x14|\x15|\x16|\x17|\x18|\x19|\x1A|\x1B|\x1C|\x1D|\x1E|\x1F|\xA0]/g,
          "",
        );
        return input.length !== 0;
      })
      .withMessage("Title is empty.")
      .isLength({ max: 72 })
      .withMessage("Title is over the min limit of 72 characters."),
  ],
  catchError(async (req, res) => {
    const { playlistType, page } = req.params;
    const persistence = req.app.locals.persistence;
    const isPrivate = req.body.visibility === "private";
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      errors.array().forEach((message) => {
        req.flash("errors", message.msg);
      });
      return res.render("create_playlist", {
        title: req.body.title,
        playlistType,
        page: +page,
        isPrivate,
        flash: req.flash(),
      });
    }
    try {
      const playlist = await persistence.createPlaylist(
        req.body.title,
        isPrivate,
        req.session.user.id,
      );
      if (+playlist.rowCount === 0) {
        req.flash("errors", MSG.overPlaylistsLimit);
        return res.redirect(`/your/playlists/${page}`);
      }
    } catch (error) {
      if (error.constraint === "unique_creator_id_title") {
        req.flash("errors", MSG.uniquePlaylist);
        return res.render("create_playlist", {
          title: req.body.title,
          playlistType,
          page: +page,
          isPrivate,
          flash: req.flash(),
        });
      }
      throw error;
    }
    req.flash("successes", MSG.createPlaylist);
    return res.redirect(`/your/playlists/${page}`);
  }),
);

// Get a create playlist form.
playlistsRouter.get(
  "/:playlistType/playlists/:page/create",
  requireAuth,
  catchError((req, res) => {
    const { playlistType, page } = req.params;
    return res.render("create_playlist", {
      page: +page,
      playlistType,
      isPrivate: true,
    });
  }),
);

// Get a page of playlists.
playlistsRouter.get(
  "/:playlistType/playlists/:page",
  requireAuth,
  catchError(async (req, res) => {
    let { playlistType, page } = req.params;
    const userId = +req.session.user.id;
    const data = await getPlaylists(
      playlistType,
      page,
      PLAYLISTS_PER_PAGE,
      req.app.locals.persistence,
      PAGE_OFFSET,
      userId,
    );

    res.render("playlists", { apiKey: req.session.apiKey, ...data });
    req.session.apiKey = "";
    return;
    //return res.render("playlists", {flash: req.flash(), ...data});
  }),
);

playlistsRouter.post(
  "/your/playlists/:page/createApiKey",
  catchError(async (req, res) => {
    const apiKey = uuidv7();
    const persistence = req.app.locals.persistence;
    await persistence.createApiKey(apiKey, req.session.user.id);
    req.session.apiKey = apiKey;
    return res.redirect(`/your/playlists/${req.params.page}`);
  }),
);

// get public playlists as anonymous user.
playlistsRouter.get(
  "/anon/public/playlists/:page",
  catchError(async (req, res) => {
    const { page } = req.params;
    const data = await getPlaylists(
      "anonPublic",
      page,
      PLAYLISTS_PER_PAGE,
      req.app.locals.persistence,
      PAGE_OFFSET,
    );
    return res.render("public_playlists", data);
  }),
);

module.exports = { playlistsRouter };
