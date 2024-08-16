const MSG = require("./lib/msg.json");
const express = require("express");
const app = express();
const session = require("express-session");
const store = require("connect-loki");
const LokiStore = store(session);
const morgan = require("morgan");
const Persistence = require("./lib/pg-persistence.js");
const persistence = new Persistence();
const port = 3002;
const host = "localhost";
const { isValidURL, parseURL } = require("./lib/playlist.js");
const flash = require("express-flash");
const { body, validationResult } = require("express-validator");
const catchError = require("./lib/catch-error");
const SONGS_PER_PAGE = 5;
const VISIBLE_OFFSET = 2;
app.set("views", "./views");
app.set("view engine", "pug");
app.use(express.static("public"));
app.use(morgan("common"));
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    cookie: {
      httpOnly: true,
      maxAge: 3_600_000 * 1,
      path: "/",
      secure: false,
    },
    name: "nhanify-id",
    resave: false,
    saveUninitialized: true,
    secret: "this is not very secure",
    store: new LokiStore({}),
  }),
);
app.use(flash());

function requireAuth(req, res, next) {
  if (!req.session.user) {
    //res.status(401);
    //res.render("error", { statusCode: "401", msg: MSG.error401 });
    const request = encodeURIComponent(req.originalUrl);
    req.flash("errors", MSG.error401);
    res.redirect(`/login?redirectUrl=${request}`);
  } else {
    next();
  }
}

app.use((req, res, next) => {
  res.locals.user = req.session.user;
  res.locals.flash = req.session.flash;
  delete req.session.flash;
  next();
});

app.post(
  "/:playlistType/playlist/:playlistId/contributors/add",
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
    const errors = validationResult(req);
    const { playlistId, playlistType } = req.params;
    if (!errors.isEmpty()) {
      errors.array().forEach((message) => {
        req.flash("errors", message.msg);
        if (message.path === "username") username = "";
      });
      res.render("add_contributors", {
        pageTitle: `Add contributor to ${req.session.title}`,
        flash: req.flash(),
        username,
        playlistType,
        playlistId: +playlistId,
      });
      return;
    }
    const userId = req.session.user.id;
    const yourPlaylist = await persistence.getOwnedPlaylist(playlistId, userId);
    if (!yourPlaylist) {
      res.status(403);
      res.render("error", { statusCode: "403", msg: MSG.error403 });
    }
    const user = await persistence.getContributor(req.body.username);
    if (!user) {
      req.flash("errors", MSG.notExistUsername);
      return res.redirect(
        `/${playlistType}/playlist/${playlistId}/contributors/add/0`,
      );
    }
    const created = await persistence.addContributor(user.id, playlistId);
    if (!created) {
      req.flash("errors", MSG.uniqueContributor);
      return res.redirect(
        `/${playlistType}/playlist/${playlistId}/contributors/add/0`,
      );
    } else {
      req.flash("successes", MSG.addContributor);
      return res.redirect(
        ///:playlistType/playlist/:playlistId/:curPageNum
        `/${playlistType}/playlist/${playlistId}/0`,
      );
    }
  }),
);

app.get(
  "/:playlistType/playlist/:playlistId/contributors/add/:curPageNum",
  requireAuth,
  catchError(async (req, res) => {
    const { playlistId, playlistType, curPageNum } = req.params;

    let yourPlaylist;
    yourPlaylist = await persistence.getOwnedPlaylist(
      +playlistId,
      req.session.user.id,
    );
    if (!yourPlaylist) {
      res.status(403);
      res.render("error", { statusCode: "403", msg: MSG.error403 });
    }
    const titleRow = await persistence.getPlaylistTitle(+playlistId);
    req.session.title = titleRow.title;
    return res.render("add_contributors", {
      playlistId: +playlistId,
      pageTitle: `Add contributor to ${titleRow.title}`,
      playlistType,
      curPageNum: +curPageNum,
    });
  }),
);

app.get(
  "/:playlistType/playlist/:playlistId/contributors/:curPageNum",
  requireAuth,
  catchError(async (req, res) => {
    const { playlistType, playlistId, curPageNum } = req.params;
    const offset = +curPageNum < 0 ? 0 : +curPageNum * SONGS_PER_PAGE;
    const limit = SONGS_PER_PAGE;
    const contributors = await persistence.getContributors(
      +playlistId,
      offset,
      limit,
    );
    const countRow = await persistence.getContributorTotal(+playlistId);
    const totalPages = Math.ceil(countRow.count / SONGS_PER_PAGE);
    const isEmpty = totalPages === 0;
    let startPage;
    let endPage;
    if (!isEmpty) {
      if (+curPageNum >= totalPages) return next();
      startPage = Math.max(+curPageNum - VISIBLE_OFFSET, 0);
      endPage = Math.min(+curPageNum + VISIBLE_OFFSET, totalPages - 1);
    }
    return res.render("contributors", {
      contributors,
      playlistId,
      pageTitle: `${contributors.playlistTitle} Contributors`,
      playlistType,
      startPage,
      curPageNum: +curPageNum,
      endPage,
      totalPages,
      totalContributors: +countRow.count,
    });
  }),
);

app.get(
  "/:playlistType/playlist/:playlistId/edit/:curPageNum",
  requireAuth,
  catchError(async (req, res) => {
    const { playlistId, playlistType, curPageNum } = req.params;
    const yourPlaylist = await persistence.getOwnedPlaylist(
      +playlistId,
      req.session.user.id,
    );
    if (!yourPlaylist) {
      res.status(403);
      res.render("error", { statusCode: "403", msg: MSG.error403 });
    }
    const playlist = await persistence.getPlaylist(+playlistId);
    if (!playlist) {
      req.flash("errors", MSG.notExistPlaylist);
      req.redirect(`${playlistType}/playlist/${playlistId}/edit/${curPageNum}`);
    }
    res.render("edit_playlist", {
      playlist,
      pageTitle: `Edit ${playlist.title}`,
      playlistId: +playlistId,
      playlistType,
      curPageNum: +curPageNum,
    });
  }),
);

app.post(
  "/:playlistType/playlist/:playlistId/edit/:curPageNum",
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
    const { playlistType, playlistId, curPageNum } = req.params;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      errors.array().forEach((message) => req.flash("errors", message.msg));
      return res.redirect(
        `/${playlistType}/playlist/${playlistId}/edit/${curPageNum}`,
      );
    }

    const yourPlaylist = await persistence.getOwnedPlaylist(
      +playlistId,
      req.session.user.id,
    );
    if (!yourPlaylist) {
      res.status(403);
      res.render("error", { statusCode: "403", msg: MSG.error403 });
    }
    const visibility = req.body.visiability === "private" ? true : false;
    try {
      const edited = await persistence.editPlaylist(
        playlistId,
        req.body.title,
        visibility,
      );
      if (!edited) {
        req.flash("errors", MSG.notExistPlaylist);
      } else {
        req.flash("successes", MSG.playlistEdited);
      }
    } catch (error) {
      if (error.constraint === "unique_creator_id_title") {
        req.flash("errors", MSG.uniquePlaylist);
        return res.redirect(
          `/${playlistType}/playlist/${playlistId}/edit/${curPageNum}`,
        );
      }
      throw error;
    }
    return res.redirect(`/your/playlists/${curPageNum}`);
  }),
);
app.get(
  "/:playlistType/playlist/:playlistId/:songId/editSong/:curPageNum",
  requireAuth,
  catchError(async (req, res) => {
    const { playlistType, playlistId, songId, curPageNum } = req.params;
    const writePlaylist = await persistence.getUserAuthorizedWrite(
      playlistId,
      req.session.user.id,
    );
    if (!writePlaylist) {
      res.status(403);
      res.render("error", { statusCode: "403", msg: MSG.error403 });
    }
    const song = await persistence.getSong(songId);
    if (!song) {
      res.flash("errors", MSG.notExistSong);
    }
    res.render("edit_song", {
      title: song.title,
      playlistType,
      playlistId,
      songId,
      pageTitle: `Edit ${song.title}`,
      curPageNum,
    });
  }),
);

app.post(
  "/:playlistType/playlist/:playlistId/:songId/editSong/:curPageNum",
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
    const { playlistType, playlistId, songId, curPageNum } = req.params;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      errors.array().forEach((message) => req.flash("errors", message.msg));
      return res.redirect(
        `/${playlistType}/playlist/${playlistId}/${songId}/editSong/${curPageNum}`,
      );
    }
    const writePlaylist = await persistence.getUserAuthorizedWrite(
      playlistId,
      req.session.user.id,
    );
    if (!writePlaylist) {
      res.status(403);
      res.render("error", { statusCode: "403", msg: MSG.error403 });
    }
    try {
      const edited = await persistence.editSong(songId, req.body.title);
      if (!edited) {
        req.flash("errors", MSG.notExistSong);
      } else {
        req.flash("successes", MSG.editedSong);
      }
    } catch (error) {
      if (error.constraint === "unique_title_playlist_id") {
        req.flash("errors", MSG.uniqueSong);
        return res.redirect(
          `/${playlistType}/playlist/${playlistId}/${songId}/editSong/${curPageNum}`,
        );
      }
      throw error;
    }
    return res.redirect(
      `/${playlistType}/playlist/${playlistId}/${curPageNum}`,
    );
  }),
);

app.post(
  "/:playlistType/playlist/:playlistId/addSong/:curPageNum",
  requireAuth,
  [
    body("title")
      .trim()
      .isLength({ min: 1 })
      .withMessage("Title is empty.")
      .isLength({ max: 72 })
      .withMessage("Title is over the min limit of 72 characters."),
    body("url")
      .trim()
      .isLength({ min: 1 })
      .withMessage("Url is empty.")
      .custom(isValidURL)
      .withMessage(MSG.invalidURL),
  ],
  catchError(async (req, res) => {
    const { playlistType, playlistId, curPageNum } = req.params;
    let { title, url } = req.body;
    const writePlaylist = await persistence.getUserAuthorizedWrite(
      +playlistId,
      req.session.user.id,
    );
    if (!writePlaylist) {
      res.status(403);
      res.render("error", { statusCode: "403", msg: MSG.error403 });
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      errors.array().forEach((message) => {
        req.flash("errors", message.msg);
      });
      req.session.url = url;
      req.session.title = title;
      return res.redirect(
        `/${playlistType}/playlist/${playlistId}/${curPageNum}`,
      );
    }
    const videoId = parseURL(url);
    try {
      await persistence.addSong(
        title,
        videoId,
        +playlistId,
        req.session.user.id,
      );
      req.flash("successes", MSG.addedSong);
      req.session.title = "";
    } catch (error) {
      console.log("CONSTRAINT", error.constraint);
      if (error.constraint === "unique_video_id_playlist_id") {
        req.flash("errors", MSG.uniqueSong);
        req.session.title = title;
        return res.redirect(
          `/${playlistType}/playlist/${playlistId}/${curPageNum}`,
        );
      }
      if (error.constraint === "unique_title_playlist_id") {
        req.flash("errors", MSG.uniqueSongTitle);
        req.session.title = title;
        return res.redirect(
          `/${playlistType}/playlist/${playlistId}/${curPageNum}`,
        );
      }
      throw error;
    }
    return res.redirect(
      `/${playlistType}/playlist/${playlistId}/${curPageNum}`,
    );
  }),
);

app.post(
  "/:playlistType/playlist/:playlistId/:songId/deleteSong/:curPageNum",
  requireAuth,
  catchError(async (req, res) => {
    const { playlistType, playlistId, songId, curPageNum } = req.params;
    const writePlaylist = await persistence.getUserAuthorizedWrite(
      +playlistId,
      req.session.user.id,
    );
    if (!writePlaylist) {
      res.status(403);
      res.render("error", { statusCode: "403", msg: MSG.error403 });
    }
    const deleted = await persistence.deleteSong(+songId);
    if (!deleted) {
      req.flash("errors", MSG.notExistSong);
    } else {
      req.flash("successes", MSG.deleteSong);
    }
    const rowCount = await persistence.getSongCount(playlistId);
    const totalPages = Math.ceil(rowCount.count / SONGS_PER_PAGE);
    if (curPageNum > totalPages - 1)
      return res.redirect(
        `/${playlistType}/playlist/${playlistId}/${totalPages - 1}`,
      );
    return res.redirect(
      `/${playlistType}/playlist/${playlistId}/${curPageNum}`,
    );
  }),
);

app.get(
  "/public/playlist/:playlistId/:curPageNum",
  catchError(async (req, res, next) => {
    const { curPageNum, playlistId } = req.params;
    const offset = +curPageNum < 0 ? 0 : +curPageNum * SONGS_PER_PAGE;
    const limit = SONGS_PER_PAGE;
    const playlist = await persistence.getPlaylistInfoSongs(
      +playlistId,
      offset,
      limit,
    );
    console.log({ playlist, curPageNum }, "IN PUBLIC");
    const videoIds = playlist.songs.map((song) => song.video_id);
    const totalPages = Math.ceil(playlist.songTotal / SONGS_PER_PAGE);
    const isEmpty = totalPages === 0;
    let startPage;
    let endPage;
    if (!isEmpty) {
      if (+curPageNum >= totalPages) return next();
      startPage = Math.max(+curPageNum - VISIBLE_OFFSET, 0);
      endPage = Math.min(+curPageNum + VISIBLE_OFFSET, totalPages - 1);
    }
    return res.render("playlist", {
      playlist,
      pageTitle: playlist.info.title,
      videoIds,
      totalPages,
      curPageNum: +curPageNum,
      endPage,
      startPage,
      isEmpty,
      playlistType: "public",
      playlistId: +playlistId,
      url: req.session.url,
      title: req.session.title,
    });
  }),
);

app.get(
  "/:playlistType/playlist/:playlistId/:curPageNum",
  requireAuth,
  catchError(async (req, res, next) => {
    const { curPageNum, playlistType, playlistId } = req.params;
    const offset = +curPageNum < 0 ? 0 : +curPageNum * SONGS_PER_PAGE;
    const limit = SONGS_PER_PAGE;

    const authPlaylist = await persistence.getUserAuthorizedPlaylist(
      playlistId,
      req.session.user.id,
    );
    console.log({ authPlaylist });
    if (!authPlaylist) {
      res.status(403);
      res.render("error", { statusCode: "403", msg: MSG.error403 });
      return;
    }
    const playlist = await persistence.getPlaylistInfoSongs(
      +playlistId,
      offset,
      limit,
    );
    const videoIds = playlist.songs.map((song) => song.video_id);
    const totalPages = Math.ceil(playlist.songTotal / SONGS_PER_PAGE);
    const isEmpty = totalPages === 0;
    let startPage;
    let endPage;
    if (!isEmpty) {
      if (+curPageNum >= totalPages) return next();
      startPage = Math.max(+curPageNum - VISIBLE_OFFSET, 0);
      endPage = Math.min(+curPageNum + VISIBLE_OFFSET, totalPages - 1);
    }
    return res.render("playlist", {
      playlist,
      pageTitle: playlist.info.title,
      videoIds,
      totalPages,
      curPageNum: +curPageNum,
      endPage,
      startPage,
      isEmpty,
      playlistType,
      playlistId: +playlistId,
      url: req.session.url,
      title: req.session.title,
    });
  }),
);

app.post(
  "/playlists/:playlistId/delete/contribution/:curPageNum",
  requireAuth,
  catchError(async (req, res) => {
    const { playlistId, curPageNum } = req.params;
    const userId = req.session.user.id;
    const contributionPlaylist = await persistence.deleteContributionPlaylist(
      +playlistId,
      userId,
    );
    if (!contributionPlaylist) {
      req.flash("errors", MSG.notExistPlaylistt); // should be no playlist not found
    } else {
      req.flash("successes", MSG.deletePlaylist);
    }

    res.locals.playlistType = "contribution";
    const rowCount = await persistence.getContributionPlaylistTotal(userId);
    const totalPages = Math.ceil(rowCount.count / SONGS_PER_PAGE);
    if (+curPageNum > totalPages - 1)
      return res.redirect(`/playlists/contributing/${totalPages - 1}`);
    return res.redirect(`/playlists/contributing/${curPageNum}`);
  }),
);

app.post(
  "/playlists/:playlistId/delete/:curPageNum",
  requireAuth,
  catchError(async (req, res) => {
    console.log("IN THIS ROUTE");
    const { playlistId, curPageNum } = req.params;
    const userId = +req.session.user.id;
    const yourPlaylist = await persistence.getOwnedPlaylist(
      +playlistId,
      userId,
    );
    if (!yourPlaylist) {
      res.status(403);
      res.render("error", { statusCode: "403", msg: MSG.error403 });
    }
    const deleted = await persistence.deletePlaylist(+playlistId);
    if (!deleted) {
      req.flash("errors", MSG.notExistPlaylist);
    } else {
      req.flash("successes", MSG.deletePlaylist);
    }
    const rowCount = await persistence.getYourPlaylistTotal(userId);
    const totalPages = Math.ceil(rowCount.count / SONGS_PER_PAGE);
    if (+curPageNum > totalPages - 1)
      return res.redirect(`/your/playlists/${totalPages - 1}`);
    return res.redirect(`/your/playlists/${curPageNum}`);
  }),
);

app.post(
  "/:playlistType/playlist/:playlistId/contributors/delete/:contributorId/:curPageNum",
  requireAuth,
  catchError(async (req, res) => {
    const { contributorId, playlistId, curPageNum, playlistType } = req.params;
    const yourPlaylist = await persistence.getOwnedPlaylist(
      +playlistId,
      req.session.user.id,
    );
    if (!yourPlaylist) {
      res.status(403);
      res.render("error", { statusCode: "403", msg: MSG.error403 });
    }
    const deleted = await persistence.deleteContributor(
      +playlistId,
      +contributorId,
    );
    if (!deleted) {
      req.flash("errors", MSG.notExistPlaylist);
    } else {
      req.flash("successes", MSG.deleteContributor);
    }
    return res.redirect(
      `/${playlistType}/playlist/${+playlistId}/contributors/${+curPageNum}`,
    );
  }),
);

app.get(
  "/anon/public/playlists/:curPageNum",
  catchError(async (req, res) => {
    const { curPageNum } = req.params;
    const offset = +curPageNum < 0 ? 0 : +curPageNum * SONGS_PER_PAGE;
    const limit = SONGS_PER_PAGE;

    const playlists = await persistence.getPublicPlaylistsPage(offset, limit);
    const countRow = await persistence.getPublicPlaylistTotal();

    const totalPages = Math.ceil(countRow.count / SONGS_PER_PAGE);
    const isEmpty = totalPages === 0;
    let startPage;
    let endPage;
    if (!isEmpty) {
      if (+curPageNum >= totalPages) return next();
      startPage = Math.max(+curPageNum - VISIBLE_OFFSET, 0);
      endPage = Math.min(+curPageNum + VISIBLE_OFFSET, totalPages - 1);
    }
    return res.render("public_playlists", {
      startPage,
      endPage,
      curPageNum: +curPageNum,
      totalPages,
      playlists,
      playlistType: "anonPublic",
      pageTitle: "Public Playlists",
      playlistTotal: +countRow.count,
    });
  }),
);

app.get(
  "/:playlistType/playlists/:curPageNum",
  requireAuth,
  catchError(async (req, res) => {
    const { playlistType, curPageNum } = req.params;
    console.log({ playlistType }, "IN GET PLAYLIST");
    const userId = +req.session.user.id;
    const offset = +curPageNum < 0 ? 0 : +curPageNum * SONGS_PER_PAGE;
    let playlists, countRow, pageTitle;
    if (playlistType === "public") {
      pageTitle = "Public Playlists";
      playlists = await persistence.getPublicPlaylistsPage(
        offset,
        SONGS_PER_PAGE,
      );
      countRow = await persistence.getPublicPlaylistTotal();
    }
    if (playlistType === "your") {
      pageTitle = "Your Playlists";
      playlists = await persistence.getYourPlaylistsPage(
        userId,
        offset,
        SONGS_PER_PAGE,
      );
      countRow = await persistence.getYourPlaylistTotal(userId);
    }
    if (playlistType === "contribution") {
      pageTitle = "Contribution Playlists";
      playlists = await persistence.getContributionPlaylistsPage(
        userId,
        offset,
        SONGS_PER_PAGE,
      );
      countRow = await persistence.getContributionPlaylistTotal(userId);
    }
    const totalPages = Math.ceil(countRow.count / SONGS_PER_PAGE);
    const isEmpty = totalPages === 0;
    let startPage;
    let endPage;
    if (!isEmpty) {
      if (+curPageNum >= totalPages) return next();
      startPage = Math.max(+curPageNum - VISIBLE_OFFSET, 0);
      endPage = Math.min(+curPageNum + VISIBLE_OFFSET, totalPages - 1);
    }
    return res.render("playlists", {
      startPage,
      endPage,
      totalPages,
      playlistType,
      pageTitle,
      playlists,
      curPageNum: +curPageNum,
      playlistTotal: +countRow.count,
    });
  }),
);

app.get(
  "/:playlistType/playlists/create/:curPageNum",
  requireAuth,
  catchError((req, res) => {
    const { playlistType, curPageNum } = req.params;
    return res.render("create_playlist", {
      curPageNum: +curPageNum,
      playlistType,
      isPrivate: true,
    });
  }),
);

app.post(
  "/:playlistType/playlists/create/:curPageNum",
  [
    body("title")
      .trim()
      .isLength({ min: 1 })
      .withMessage("Title is empty.")
      .isLength({ max: 72 })
      .withMessage("Title is over the min limit of 72 characters."),
  ],
  requireAuth,
  catchError(async (req, res) => {
    let { title, visiability } = req.body;
    const isPrivate = visiability === "private";
    const { playlistType, curPageNum } = req.params;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      errors.array().forEach((message) => {
        req.flash("errors", message.msg);
      });
      res.render("create_playlist", {
        title: req.body.title,
        playlistType,
        curPageNum: +curPageNum,
        isPrivate,
        flash: req.flash(),
      });
      return;
    }
    try {
      await persistence.createPlaylist(title, visiability, req.session.user.id);
    } catch (error) {
      if (error.constraint === "unique_creator_id_title") {
        req.flash("errors", MSG.uniquePlaylist);
        return res.redirect(`/${playlistType}/playlists/create/${curPageNum}`);
      }
      throw error;
    }
    req.flash("successes", MSG.createPlaylist);
    req.session.isPrivate = isPrivate;
    return res.redirect(`/your/playlists/${curPageNum}`);
  }),
);

app.post(
  "/signout",
  requireAuth,
  catchError((req, res) => {
    // req.flash("successes", MSG.signout);
    req.session.destroy((error) => {
      if (error) console.error(error);
      return res.redirect("/login");
    });
  }),
);

app.get(
  "/login",
  catchError((req, res) => {
    const redirectUrl = req.query.redirectUrl;
    if (req.session.user) {
      req.flash("info", MSG.alreadyLoggedIn);
      res.redirect("/your/playlists/0");
      return;
    }
    return res.render("login", { redirectUrl });
  }),
);

app.post(
  "/login",
  [
    body("username").trim().isLength({ min: 1 }).withMessage(MSG.emptyUsername),
    body("password").trim().isLength({ min: 1 }).withMessage(MSG.emptyPassword),
  ],
  catchError(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      errors.array().forEach((message) => req.flash("errors", message.msg));
      return res.redirect("/login");
    }
    const redirectUrl = req.query.redirectUrl;
    const username = req.body.username;
    const password = req.body.password;
    const user = await persistence.validateUser(username, password);
    if (user) {
      req.session.user = user;
      req.flash("successes", MSG.loggedIn);
      if (!redirectUrl) {
        return res.redirect("/your/playlists/0");
      } else {
        // check of redirectUrl is the same the url in the query
        return res.redirect(redirectUrl.replaceAll("`", ""));
      }
    } else {
      req.flash("errors", MSG.invalidCred);
      return res.redirect("/login");
    }
  }),
);

app.get(
  "/signup",
  catchError((req, res) => {
    return res.render("signup");
  }),
);

app.post(
  "/signup",
  [
    body("username")
      .trim()
      .isLength({ min: 1 })
      .withMessage(MSG.emptyUsername)
      .isLength({ max: 30 })
      .withMessage(MSG.maxUsername),
    body("password")
      .trim()
      .isLength({ min: 12 })
      .withMessage(MSG.minPassword)
      .isLength({ max: 72 })
      .withMessage(MSG.maxPassword),
  ],
  catchError(async (req, res) => {
    let { username, password } = req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      errors.array().forEach((message) => {
        req.flash("errors", message.msg);
      });
      res.redirect("/signup");
      return;
    }
    const user = await persistence.createUser(username, password);
    if (!user) {
      req.flash("errors", MSG.uniqueUsername);
      return res.redirect("/signup");
    }
    req.session.user = user;
    req.flash("successes", MSG.createUser);
    return res.redirect("/your/playlists/0");
  }),
);

app.get(
  "/",
  catchError((req, res) => {
    if (req.session.user) {
      return res.redirect("/your/playlists/0");
    } else {
      return res.redirect("/login");
    }
  }),
);

app.get("*", (req, res, next) => {
  res.status(404);
  res.render("error", { statusCode: 404, msg: MSG.error404 });
});

app.use((err, req, res, next) => {
  console.log(err);
  res.status(500);
  res.render("error", { statusCode: 500, msg: MSG.error500 });
});

app.listen(port, host, () => {
  console.log(`🎵 Nhanify music ready to rock on http://${host}:${port} 🎵`);
});
