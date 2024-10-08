const { Router } = require("express");
const contributorsRouter = Router();
const { requireAuth } = require("./middleware.js");
const catchError = require("./catch-error.js");
const { NotFoundError, ForbiddenError } = require("../lib/errors.js");
const { body, validationResult } = require("express-validator");
const { ITEMS_PER_PAGE } = process.env;
const MSG = require("../lib/msg.json");
const PAGE_OFFSET = 4;

// Delete contributor from a playlist.
contributorsRouter.post(
  "/:playlistType/playlists/:page/playlist/:pagePl/:playlistId/contributors/:pageCb/:contributorId/delete",
  requireAuth,
  catchError(async (req, res) => {
    let { pageCb, pagePl, contributorId, playlistId, page, playlistType } =
      req.params;
    const persistence = req.app.locals.persistence;
    const yourPlaylist = await persistence.isYourPlaylist(
      +playlistId,
      req.session.user.id,
    );
    if (!yourPlaylist) throw new ForbiddenError();
    const deleted = await persistence.deleteContributor(
      +playlistId,
      +contributorId,
    );
    if (!deleted) throw new NotFoundError();
    const contributor = await persistence.getContributorTotal(+playlistId);
    if (!contributor) throw new NotFoundError();
    const totalPages = Math.ceil(+contributor.count / ITEMS_PER_PAGE);
    req.flash("successes", MSG.deleteContributor);
    if (+pageCb > totalPages && +pageCb !== 1) pageCb = +pageCb - 1;
    return res.redirect(
      `/${playlistType}/playlists/${page}/playlist/${pagePl}/${playlistId}`,
    );
  }),
);
// Get the add contributor's form.
contributorsRouter.get(
  "/:playlistType/playlists/:page/playlist/:pagePl/:playlistId/contributors/add",
  requireAuth,
  catchError(async (req, res) => {
    const { playlistId, playlistType, page, pagePl } = req.params;
    const persistence = req.app.locals.persistence;
    const isYourPlaylist = await persistence.isYourPlaylist(
      +playlistId,
      req.session.user.id,
    );
    if (!isYourPlaylist) throw new ForbiddenError();
    const playlist = await persistence.getPlaylistTitle(+playlistId);
    if (!playlist) throw new NotFoundError();
    return res.render("add_contributors", {
      playlistId: +playlistId,
      pageTitle: `Add contributor to ${playlist.title}`,
      playlistType,
      page: +page,
      pagePl: +pagePl,
    });
  }),
);

// Get the contributors on a playlist.
contributorsRouter.get(
  "/:playlistType/playlists/:page/playlist/:pagePl/:playlistId/contributors/:pageCb",
  requireAuth,
  catchError(async (req, res) => {
    const { playlistType, playlistId, page, pagePl, pageCb } = req.params;
    const persistence = req.app.locals.persistence;
    const auth = await persistence.isReadPlaylistAuthorized(
      +playlistId,
      req.session.user.id,
    );
    if (!auth) throw new ForbiddenError();
    const offset = (+pageCb - 1) * ITEMS_PER_PAGE;
    const contributor = await persistence.getContributorTotal(+playlistId);
    if (!contributor) throw new NotFoundError();
    const totalPages = Math.ceil(+contributor.count / ITEMS_PER_PAGE);
    if ((+pageCb > totalPages && +pageCb !== 1) || +pageCb < 1)
      throw new NotFoundError();
    console.log("LOOK HERE", +playlistId, offset, +pageCb, ITEMS_PER_PAGE);
    const contributors = await persistence.getContributorsPage(
      +playlistId,
      offset,
      ITEMS_PER_PAGE,
    );
    const startPage = Math.max(+pageCb - PAGE_OFFSET, 1);
    const endPage = Math.min(+pageCb + PAGE_OFFSET, totalPages);
    return res.render("contributors", {
      contributors,
      playlistId,
      pageTitle: `${contributors.playlistTitle} Contributors`,
      playlistType,
      startPage,
      page: +page,
      pagePl: +pagePl,
      pageCb: +pageCb,
      endPage,
      totalPages,
      totalContributors: +contributor.count,
    });
  }),
);

// Add contributor to a playlist.
contributorsRouter.post(
  "/:playlistType/playlists/:page/playlist/:pagePl/:playlistId/contributors/add",
  requireAuth,
  [
    body("username")
      .trim()
      .isLength({ min: 1 })
      .withMessage(MSG.emptyUsername)
      .custom((usernameInput, { req }) => {
        return !(usernameInput === req.session.user.username);
      })
      .withMessage(MSG.creatorContributor),
  ],
  catchError(async (req, res) => {
    const persistence = req.app.locals.persistence;
    const errors = validationResult(req);
    const { playlistId, playlistType, page, pagePl } = req.params;
    const rerender = async () => {
      const playlist = await persistence.getPlaylistTitle(+playlistId);
      if (!playlist) throw new NotFoundError();
      return res.render("add_contributors", {
        flash: req.flash(),
        username: req.body.username,
        playlistId: +playlistId,
        pageTitle: `Add contributor to ${playlist.title}`,
        playlistType,
        page: +page,
        pagePl: +pagePl,
      });
    };
    if (!errors.isEmpty()) {
      errors.array().forEach((message) => {
        req.flash("errors", message.msg);
      });
      await rerender();
      return;
    }
    const userId = req.session.user.id;
    const isYourPlaylist = await persistence.isYourPlaylist(playlistId, userId);
    if (!isYourPlaylist) throw new ForbiddenError();
    const contributor = await persistence.getContributor(req.body.username);
    if (!contributor) {
      req.flash("errors", MSG.notExistUsername);
      await rerender();
      return;
    }
    try {
      await persistence.addContributor(contributor.id, +playlistId);
    } catch (error) {
      if (error.constraint === "unique_playlist_id_user_id") {
        req.flash("errors", MSG.uniqueContributor);
        await rerender();
        return;
      }
    }
    req.flash("successes", MSG.addContributor);
    return res.redirect(
      `/${playlistType}/playlists/${page}/playlist/${pagePl}/${playlistId}`,
    );
  }),
);

module.exports = { contributorsRouter };
