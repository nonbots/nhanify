const express = require("express");
const app = express();
const session = require("express-session");
const store = require("connect-loki");
const LokiStore = store(session);
const morgan = require("morgan");
const { body, validationResult } = require("express-validator");
const flash = require("express-flash");
const catchError = require("./lib/catch-error");
const Persistence = require("./lib/pg-persistence.js");
const persistence = new Persistence();
const { isValidURL, parseURL } = require("./lib/playlist.js");
const MSG = require("./lib/msg.json");
const PORT = 3002;
const HOST = "localhost";
const ITEMS_PER_PAGE = 5;
const PAGE_OFFSET = 2;

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
    const requestURL = encodeURIComponent(req.originalUrl);
    req.session.requestMethod =  req.method;
    req.session.referrer = req.header('Referrer');
    req.flash("errors", MSG.error401);
    res.redirect(`/login?redirectUrl=${requestURL}`);
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

app.get(
  "/:playlistType/playlist/:playlistId/contributors/add/:curPageNum",
  requireAuth,
  catchError(async (req, res) => {
    const { playlistId, playlistType, curPageNum } = req.params;

    const isYourPlaylist = await persistence.isYourPlaylist(
      +playlistId,
      req.session.user.id,
    );
    if (!isYourPlaylist) {
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
app.post(
  "/:playlistType/playlist/:playlistId/contributors/add/:curPageNum",
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
    const { playlistId, playlistType, curPageNum } = req.params;
    if (!errors.isEmpty()) {
      errors.array().forEach((message) => {req.flash("errors", message.msg)});
      return res.render("add_contributors", {
        pageTitle: `Add contributor to ${req.session.title}`,
        flash: req.flash(),
        username: req.body.username,
        playlistType,
        playlistId: +playlistId,
      });
    }
    const userId = req.session.user.id;
    const isYourPlaylist = await persistence.isYourPlaylist(playlistId, userId);
    if (!isYourPlaylist) {
      res.status(403);
      res.render("error", { statusCode: "403", msg: MSG.error403 });
    }
    const contributor = await persistence.getContributor(req.body.username);
    if (!contributor) {
      req.flash("errors", MSG.notExistUsername);
      return res.redirect(
        `/${playlistType}/playlist/${playlistId}/contributors/add/0`,
      );
    }
    try {
      await persistence.addContributor(contributor.id, +playlistId);
    } catch (error) {
      if (error.constraint === "unique_playlist_id_user_id") {
        req.flash("errors", MSG.uniqueContributor);
        return res.redirect(
          `/${playlistType}/playlist/${playlistId}/contributors/add/0`,
        );
      }
    }
    req.flash("successes", MSG.addContributor);
    return res.redirect(
      `/${playlistType}/playlist/${playlistId}/${curPageNum}`,
    );
  }),
);


app.get(
  "/:playlistType/playlist/:playlistId/contributors/:curPageNum",
  requireAuth,
  catchError(async (req, res) => {
    const { playlistType, playlistId, curPageNum } = req.params;
    const offset = +curPageNum < 0 ? 0 : +curPageNum * ITEMS_PER_PAGE;
    const limit = ITEMS_PER_PAGE;
    const contributors = await persistence.getContributors(
      +playlistId,
      offset,
      limit,
    );
    const countRow = await persistence.getContributorTotal(+playlistId);
    const totalPages = Math.ceil(countRow.count / ITEMS_PER_PAGE);
    const isEmpty = totalPages === 0;
    let startPage;
    let endPage;
    if (!isEmpty) {
      if (+curPageNum >= totalPages) return next();
      startPage = Math.max(+curPageNum - PAGE_OFFSET, 0);
      endPage = Math.min(+curPageNum + PAGE_OFFSET, totalPages - 1);
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
      req.session.url = "";
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
    const totalPages = Math.ceil(rowCount.count / ITEMS_PER_PAGE);
    if (curPageNum > totalPages - 1)
      return res.redirect(
        `/${playlistType}/playlist/${playlistId}/${totalPages - 1}`,
      );
    return res.redirect(
      `/${playlistType}/playlist/${playlistId}/${curPageNum}`,
    );
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
    const totalPages = Math.ceil(rowCount.count / ITEMS_PER_PAGE);
    if (+curPageNum > totalPages - 1)
      return res.redirect(`/playlists/contributing/${totalPages - 1}`);
    return res.redirect(`/playlists/contributing/${curPageNum}`);
  }),
);


app.post(
  "/:playlistType/playlist/:playlistId/contributors/delete/:contributorId/:curPageNum",
  requireAuth,
  catchError(async (req, res) => {
    const { contributorId, playlistId, curPageNum, playlistType } = req.params;
    const yourPlaylist = await persistence.isYourPlaylist(
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
  "/:playlistType/playlist/:playlistId/:curPageNum",
  requireAuth,
  catchError(async (req, res, next) => {
    const { curPageNum, playlistType, playlistId } = req.params;
    const offset = +curPageNum < 0 ? 0 : +curPageNum * ITEMS_PER_PAGE;
    const limit = ITEMS_PER_PAGE;

    const isAuth= await persistence.isReadAuthorizedPlaylist(
      playlistId,
      req.session.user.id,
    );
    if (!isAuth) {
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
    const totalPages = Math.ceil(playlist.songTotal / ITEMS_PER_PAGE);
    const isEmpty = totalPages === 0;
    let startPage;
    let endPage;
    if (!isEmpty) {
      if (+curPageNum >= totalPages) return next();
      startPage = Math.max(+curPageNum - PAGE_OFFSET, 0);
      endPage = Math.min(+curPageNum + PAGE_OFFSET, totalPages - 1);
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
  "/playlists/:playlistId/delete/:curPageNum",
  requireAuth,
  catchError(async (req, res) => {
    console.log("IN THIS ROUTE");
    const { playlistId, curPageNum } = req.params;
    const userId = +req.session.user.id;
    const isYourPlaylist = await persistence.isYourPlaylist(
      +playlistId,
      userId,
    );
    if (!isYourPlaylist) {
      res.status(403);
      res.render("error", { statusCode: "403", msg: MSG.error403 });
    }
    const deleted = await persistence.deletePlaylist(+playlistId);
    if (!deleted) {
      req.flash("errors", MSG.notExistPlaylist);
    } else {
      req.flash("successes", MSG.deletePlaylist);
    }
    const playlistTotal = await persistence.getYourPlaylistTotal(userId);
    const totalPages = Math.ceil(playlistTotal / ITEMS_PER_PAGE);
    if (+curPageNum > totalPages - 1)
      return res.redirect(`/your/playlists/${totalPages - 1}`);
    return res.redirect(`/your/playlists/${curPageNum}`);
  }),
);

app.get(
  "/:playlistType/playlist/:playlistId/edit/:curPageNum",
  requireAuth,
  catchError(async (req, res) => {
    const { playlistId, playlistType, curPageNum } = req.params;
    const isYourPlaylist = await persistence.isYourPlaylist(
      +playlistId,
      req.session.user.id,
    );
    if (!isYourPlaylist) {
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
    const isYourPlaylist = await persistence.isYourPlaylist(
      +playlistId,
      req.session.user.id,
    );
    if (!isYourPlaylist) {
      res.status(403);
      res.render("error", { statusCode: "403", msg: MSG.error403 });
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      errors.array().forEach((message) => req.flash("errors", message.msg));
      return res.redirect(
        `/${playlistType}/playlist/${playlistId}/edit/${curPageNum}`,
      );
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
        return res.redirect(
          `/${playlistType}/playlist/${playlistId}/edit/${curPageNum}`,
        );
      }
    } catch (error) {
      if (error.constraint === "unique_creator_id_title") {
        req.flash("errors", MSG.uniquePlaylist);
        // change to a render later ? 
        return res.redirect(
          `/${playlistType}/playlist/${playlistId}/edit/${curPageNum}`,
        );
      }
      throw error;
    }
    req.flash("successes", MSG.playlistEdited);
    return res.redirect(`/your/playlists/${curPageNum}`);
  }),
);
app.get(
  "/anon/public/playlist/:playlistId/:curPageNum",
  catchError(async (req, res, next) => {
    const { curPageNum, playlistId } = req.params;
    const offset = +curPageNum < 0 ? 0 : +curPageNum * ITEMS_PER_PAGE;
    const playlist = await persistence.getPlaylistInfoSongs(
      +playlistId,
      offset,
      ITEMS_PER_PAGE,
    );
    console.log({ playlist, curPageNum }, "IN PUBLIC");
    const videoIds = playlist.songs.map((song) => song.video_id);
    const totalPages = Math.ceil(playlist.songTotal / ITEMS_PER_PAGE);
    const isEmpty = totalPages === 0;
    let startPage;
    let endPage;
    if (!isEmpty) {
      if (+curPageNum >= totalPages) return next();
      startPage = Math.max(+curPageNum - PAGE_OFFSET, 0);
      endPage = Math.min(+curPageNum + PAGE_OFFSET, totalPages - 1);
    }
    return res.render("playlist", {
      playlist,
      pageTitle: playlist.info.title,
      videoIds,
      totalPages,
      curPageNum: +curPageNum,
      playlistType:"anonPublic",
      endPage,
      startPage,
      isEmpty,
      playlistId: +playlistId,
      url: req.session.url,
      title: req.session.title,
    });
  }),
);

app.get(
  "/:playlistType/playlists/:curPageNum",
  requireAuth,
  catchError(async (req, res) => {
    const { playlistType, curPageNum } = req.params;
    const userId = +req.session.user.id;
    const offset = +curPageNum < 0 ? 0 : +curPageNum * ITEMS_PER_PAGE;
    let playlists, playlistTotal, pageTitle;
    if (playlistType === "public") {
      pageTitle = "Public Playlists";
      playlists = await persistence.getPublicPlaylistsPage(
        offset,
        ITEMS_PER_PAGE,
      );
      playlistTotal = await persistence.getPublicPlaylistTotal();
    }
    if (playlistType === "your") {
      pageTitle = "Your Playlists";
      playlists = await persistence.getYourPlaylistsPage(
        userId,
        offset,
        ITEMS_PER_PAGE,
      );
      playlistTotal = await persistence.getYourPlaylistTotal(userId);
    }
    if (playlistType === "contribution") {
      pageTitle = "Contribution Playlists";
      playlists = await persistence.getContributionPlaylistsPage(
        userId,
        offset,
        ITEMS_PER_PAGE,
      );
      playlistTotal = await persistence.getContributionPlaylistTotal(userId);
    }
    const totalPages = Math.ceil(playlistTotal / ITEMS_PER_PAGE);
    const isEmpty = totalPages === 0;
    let startPage;
    let endPage;
    if (!isEmpty) {
      if (+curPageNum >= totalPages) return next();
      startPage = Math.max(+curPageNum - PAGE_OFFSET, 0);
      endPage = Math.min(+curPageNum + PAGE_OFFSET, totalPages - 1);
    }
    return res.render("playlists", {
      startPage,
      endPage,
      totalPages,
      playlistType,
      pageTitle,
      playlists,
      curPageNum: +curPageNum,
      playlistTotal,
    });
  }),
);

app.get(
  "/anon/public/playlists/:curPageNum",
  catchError(async (req, res) => {
    const { curPageNum } = req.params;
    const offset = +curPageNum < 0 ? 0 : +curPageNum * ITEMS_PER_PAGE;
    const limit = ITEMS_PER_PAGE;

    const playlists = await persistence.getPublicPlaylistsPage(offset, limit);
    const playlistTotal  = await persistence.getPublicPlaylistTotal();

    const totalPages = Math.ceil(playlistTotal / ITEMS_PER_PAGE);
    const isEmpty = totalPages === 0;
    let startPage;
    let endPage;
    if (!isEmpty) {
      if (+curPageNum >= totalPages) return next();
      startPage = Math.max(+curPageNum - PAGE_OFFSET, 0);
      endPage = Math.min(+curPageNum + PAGE_OFFSET, totalPages - 1);
    }
    return res.render("public_playlists", {
      startPage,
      endPage,
      curPageNum: +curPageNum,
      totalPages,
      playlistType: "anonPublic",
      playlists,
      pageTitle: "Public Playlists",
      playlistTotal,
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
    const { playlistType, curPageNum } = req.params;
    const { title, visibility } = req.body;
    const isPrivate = visibility === "private";
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      errors.array().forEach((message) => {
        req.flash("errors", message.msg);
      });
      return res.render("create_playlist", {
        title,
        playlistType,
        curPageNum: +curPageNum,
        isPrivate,
        flash: req.flash(),
      });
    }
    try {
      await persistence.createPlaylist(title, isPrivate, req.session.user.id);
    } catch (error) {
      if (error.constraint === "unique_creator_id_title") {
        req.flash("errors", MSG.uniquePlaylist);
        return res.render("create_playlist",{
          title,
          playlistType,
          curPageNum: +curPageNum,
          isPrivate,
          flash: req.flash(),
        });
      }
      throw error;
    }
    req.flash("successes", MSG.createPlaylist);
    return res.redirect(`/your/playlists/${curPageNum}`);
  }),
);

app.post(
  "/signout",
  requireAuth,
  catchError((req, res) => {
    req.session.destroy((error) => {
      if (error) console.error(error);
      return res.redirect("/login");
    });
  }),
);

app.get(
  "/login",
  catchError((req, res) => {
    if (req.session.user) {
      req.flash("info", MSG.alreadyLoggedIn);
      return res.redirect("/your/playlists/0");
    }
    // store original url
    req.session.originRedirectUrl = req.query.redirectUrl;
    return res.render("login");
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
      return res.render("login", {flash: req.flash()});
    }
    const redirectUrl = req.query.redirectUrl;
    const {username, password} = req.body;
    const authenticatedUser = await persistence.authenticateUser(username, password);
    if (!authenticatedUser) {
      req.flash("errors", MSG.invalidCred);
      return res.render("login", {flash: req.flash()});
    }
    req.session.user = authenticatedUser;
    req.flash("successes", MSG.loggedIn);
    if (!redirectUrl || redirectUrl !== req.session.originRedirectUrl) return res.redirect("/your/playlists/0");
    if (req.session.requestMethod === "POST") return res.redirect(req.session.referrer);
    //browser takes care of of cross scripting
    return res.redirect(redirectUrl);
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
    const {username, password } = req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      errors.array().forEach((message) => {
        req.flash("errors", message.msg);
      });
      return res.render("signup", {flash: req.flash()});
    }
    try {
      const createdUser = await persistence.createUser(username, password);
      req.session.user = createdUser;
    } catch (error) {
    if (error.constraint === "unique_username") {
        req.flash("errors", MSG.uniqueUsername);
        return res.render("signup", {flash: req.flash()});
      }
      throw error;
    }
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

app.listen(PORT, HOST, () => {
  console.log(`🎵 Nhanify music ready to rock on http://${HOST}:${PORT} 🎵`);
});
