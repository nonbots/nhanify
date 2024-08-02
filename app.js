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
const { parseURL } = require("./lib/playlist.js");
const flash = require("express-flash");
const { body, validationResult } = require("express-validator");
const catchError = require("./lib/catch-error");
const SONGS_PER_PAGE = 2;
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
    req.flash("errors", MSG.unauthorizedUser);
    res.redirect("/playlists/public");
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
      .isLength({ max: 30 })
      .withMessage(MSG.maxUsername)
      .custom((usernameInput, { req }) => {
        return !(usernameInput === req.session.user.username);
      })
      .withMessage(MSG.creatorContributor),
  ],
  catchError(async (req, res) => {
    const errors = validationResult(req);
    const playlistId = +req.params.playlistId;
    const playlistType = req.params.playlistType;
    if (!errors.isEmpty()) {
      errors.array().forEach((message) => req.flash("errors", message.msg));
      return res.redirect(
        `/${playlistType}/playlist/${playlistId}/contributors/add`,
      );
    }
    const userId = req.session.user.id;
    const ownedPlaylist = await persistence.getOwnedPlaylist(
      playlistId,
      userId,
    );
    if (!ownedPlaylist) {
      req.flash("errors", MSG.unauthorizedUser);
      return res.redirect("/playlists/your");
    }
    const user = await persistence.getContributor(req.body.username);
    if (!user) {
      req.flash("errors", MSG.notExistUsername);
      return res.redirect(
        `/${playlistType}/playlist/${playlistId}/contributors/add`,
      );
    }
    const created = await persistence.addContributor(user.id, playlistId);
    if (!created) {
      req.flash("errors", MSG.uniqueContributor);
      return res.redirect(
        `/${playlistType}/playlist/${playlistId}/contributors/add`,
      );
    } else {
      req.flash("successes", MSG.addContributor);
      return res.redirect(
        `/${playlistType}/playlist/${playlistId}/contributors`,
      );
    }
  }),
);

app.get(
  "/:playlistType/playlist/:playlistId/contributors/add",
  requireAuth,
  catchError(async (req, res) => {
    const playlistId = +req.params.playlistId;
    let ownedPlaylist;
    ownedPlaylist = await persistence.getOwnedPlaylist(
      playlistId,
      req.session.user.id,
    );
    if (!ownedPlaylist) {
      req.flash("errors", MSG.unauthorizedUser);
      return res.redirect("/playlists/your");
    }
    const playlist = await persistence.getPlaylist(playlistId);
    res.locals.pageTitle = `Add contributor to ${playlist.title}`;
    res.locals.playlistType = req.params.playlistType;
    return res.render("add_contributors", { playlistId });
  }),
);

app.get(
  "/:playlistType/playlist/:playlistId/contributors",
  requireAuth,
  catchError(async (req, res) => {
    const playlistId = Number(req.params.playlistId);
    const contributors = await persistence.getContributors(playlistId);
    res.locals.pageTitle = `${contributors.playlistTitle} Contributors`;
    res.locals.playlistType = req.params.playlistType;
    return res.render("contributors", {
      contributors,
      playlistId,
    });
  }),
);

app.get(
  "/:playlistType/playlist/:playlistId/edit",
  requireAuth,
  catchError(async (req, res) => {
    const playlistId = +req.params.playlistId;
    const playlist = await persistence.getPlaylist(playlistId);
    if (!playlist) {
      req.flash("errors", MSG.notExistPlaylist);
      //return to get page
    }
    res.locals.playlistId = playlistId;
    res.locals.playlistType = req.params.playlistType;
    res.render("edit_playlist", {
      playlist,
      pageTitle: `Edit ${playlist.title}`,
    });
  }),
);

app.get(
  "/:playlistType/playlist/:playlistId/:songId/editSong",
  requireAuth,
  catchError(async (req, res) => {
    const { playlistType, playlistId, songId } = req.params;
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
    });
  }),
);

app.post(
  "/:playlistType/playlist/:playlistId/:songId/editSong",
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
    const { playlistType, playlistId, songId } = req.params;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      errors.array().forEach((message) => req.flash("errors", message.msg));
      return res.redirect(
        `/${playlistType}/playlist/${playlistId}/${songId}/editSong`,
      );
    }
    const ownedPlaylist = await persistence.getOwnedPlaylist(
      playlistId,
      req.session.user.id,
    );
    if (!ownedPlaylist) {
      req.flash("errors", MSG.unauthorizedUser);
      return res.redirect("/playlists/your");
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
          `/${playlistType}/playlist/${playlistId}/${songId}/editSong`,
        );
      }
      throw error;
    }
    return res.redirect(`/${playlistType}/playlist/${playlistId}`);
  }),
);

app.post(
  "/:playlistType/playlist/:playlistId/edit",
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
    const { playlistType, playlistId } = req.params;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      errors.array().forEach((message) => req.flash("errors", message.msg));
      return res.redirect(`/${playlistType}/playlist/${playlistId}/edit`);
    }
    const ownedPlaylist = await persistence.getOwnedPlaylist(
      playlistId,
      req.session.user.id,
    );
    if (!ownedPlaylist) {
      req.flash("errors", MSG.unauthorizedUser);
      return res.redirect("/playlists/your");
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
        return res.redirect(`/${playlistType}/playlist/${playlistId}/edit`);
      }
      throw error;
    }
    return res.redirect(`/playlists/your`);
  }),
);

app.get(
  "/:playlistType/playlist/:playlistId/:songId/:videoId/play",
  async (req, res) => {},
);
app.post(
  "/:playlistType/playlist/:playlistId/:songId/deleteSong",
  requireAuth,
  catchError(async (req, res) => {
    const { playlistType, playlistId, songId } = req.params;
    const ownedPlaylist = await persistence.getOwnedPlaylist(
      playlistId,
      req.session.user.id,
    );
    if (!ownedPlaylist) {
      req.flash("errors", MSG.unauthorizedUser);
      return res.redirect("/playlists/your");
    }
    const deleted = await persistence.deleteSong(+songId);
    if (!deleted) {
      req.flash("errors", MSG.notExistSong);
    } else {
      req.flash("successes", MSG.deleteSong);
    }
    return res.redirect(`/${playlistType}/playlist/${playlistId}`);
  }),
);
app.post(
  "/:playlistType/playlist/:playlistId/addSong",
  requireAuth,
  [
    body("title")
      .trim()
      .isLength({ min: 1 })
      .withMessage("Title is empty.")
      .isLength({ max: 72 })
      .withMessage("Title is over the min limit of 72 characters."),
    body("url").trim().isLength({ min: 1 }).withMessage("Url is empty."),
  ],
  catchError(async (req, res) => {
    const { playlistType, playlistId } = req.params;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      errors.array().forEach((message) => req.flash("errors", message.msg));
      return res.redirect(`/${playlistType}/playlist/${playlistId}`);
    }
    let videoId;
    try {
      videoId = parseURL(req.body.url);
    } catch (error) {
      console.log("ERROR", error.message);
      if (error.message === "invalidURL") {
        req.flash("errors", MSG.invalidURL);
        return res.redirect(`/${playlistType}/playlist/${playlistId}`);
      }
      throw error;
    }
    try {
      await persistence.addSong(
        req.body.title,
        req.body.url,
        videoId,
        +playlistId,
        req.session.user.id,
      );
      req.flash("successes", MSG.addedSong);
    } catch (error) {
      console.log("CONSTRAINT", error.constraint);
      if (error.constraint === "unique_video_id_playlist_id") {
        console.log("IN CATCH ERROR CONSTRAINT");
        req.flash("errors", MSG.uniqueSong);
        return res.redirect(`/${playlistType}/playlist/${playlistId}`);
      }

      throw error;
    }
    return res.redirect(`/${playlistType}/playlist/${playlistId}`);
  }),
);

app.get(
  "/:playlistType/playlist/:playlistId/:pageNum",
  catchError(async (req, res, next) => {
    const curPageNum = +req.params.pageNum;
    const offset = curPageNum * SONGS_PER_PAGE; //start page number at 0
    const limit = SONGS_PER_PAGE;
    const playlistId = Number(req.params.playlistId);

    if (!req.session.user) {
      if (!(await persistence.getPublicPlaylist(playlistId))) {
        return res.redirect("/playlists/public");
      }
    } else {
      const authPlaylist = await persistence.getUserAuthorizedPlaylist(
        playlistId,
        req.session.user.id,
      );
      if (!authPlaylist) {
        req.flash("errors", MSG.unauthorizedUser);
        return res.redirect("/playlists/your");
      }
    }
    const playlist = await persistence.getPlaylistInfoSongs(
      playlistId,
      offset,
      limit,
    );
    const videoIds = playlist.songs.map((song) => song.video_id);
    res.locals.playlistType = req.params.playlistType;
    res.locals.playlistId = req.params.playlistId;
    const totalPages = Math.ceil(playlist.songTotal / SONGS_PER_PAGE);
    console.log({ totalPages });
    if (req.params.pageNum >= totalPages) return next();
    const startPage = Math.max(curPageNum - VISIBLE_OFFSET, 0);
    let endPage = Math.min(curPageNum + VISIBLE_OFFSET, totalPages - 1);
    console.log({ startPage }, { curPageNum }, { endPage });
    return res.render("playlist", {
      playlist,
      pageTitle: playlist.info.title,
      videoIds,
      totalPages,
      curPageNum,
      endPage,
      startPage,
    });
  }),
);

app.post(
  "/playlists/:playlistId/delete",
  requireAuth,
  catchError(async (req, res) => {
    const playlistId = +req.params.playlistId;
    const ownedPlaylist = await persistence.getOwnedPlaylist(
      playlistId,
      req.session.user.id,
    );
    if (!ownedPlaylist) {
      req.flash("errors", MSG.unauthorizedUser);
      return res.redirect("/playlists/your");
    }
    const deleted = await persistence.deletePlaylist(playlistId);
    if (!deleted) {
      req.flash("errors", MSG.notExistPlaylist);
    } else {
      req.flash("successes", MSG.deletePlaylist);
    }
    return res.redirect("/playlists/your");
  }),
);

app.post(
  "/playlists/:playlistId/delete/contribution",
  requireAuth,
  catchError(async (req, res) => {
    const playlistId = +req.params.playlistId;
    const contributionPlaylist = await persistence.deleteContributionPlaylist(
      playlistId,
      req.session.user.id,
    );
    if (!contributionPlaylist) {
      req.flash("errors", MSG.unauthorizedUser);
    } else {
      req.flash("successes", MSG.deletePlaylist);
    }
    return res.redirect("/playlists/contributing");
  }),
);

app.post(
  "/:playlistType/playlist/:playlistId/contributors/delete/:contributorId",
  requireAuth,
  catchError(async (req, res) => {
    const playlistId = +req.params.playlistId;
    const ownedPlaylist = await persistence.getOwnedPlaylist(
      playlistId,
      req.session.user.id,
    );
    if (!ownedPlaylist) {
      req.flash("errors", MSG.unauthorizedUser);
      return res.redirect("/playlists/your");
    }
    const playlistType = req.params.playlistType;
    const deleted = await persistence.deleteContributor(
      playlistId,
      req.params.contributorId,
    );
    if (!deleted) {
      req.flash("errors", MSG.notExistPlaylist);
    } else {
      req.flash("successes", MSG.deleteContributor);
    }
    return res.redirect(`/${playlistType}/playlist/${playlistId}/contributors`);
  }),
);

app.get(
  "/playlists/public",
  catchError(async (req, res) => {
    const playlists = await persistence.getPublicPlaylists();
    res.locals.playlists = playlists;
    res.locals.playlistType = "public";
    res.locals.pageTitle = "Public playlists";
    return res.render("playlists");
  }),
);

app.get(
  "/playlists/your",
  requireAuth,
  catchError(async (req, res) => {
    const playlists = await persistence.getUserCreatedPlaylists(
      req.session.user.id,
    );
    res.locals.playlists = playlists;
    res.locals.playlistType = "owned";
    res.locals.pageTitle = "Your playlists";
    return res.render("playlists");
  }),
);

app.get(
  "/playlists/contributing",
  requireAuth,
  catchError(async (req, res) => {
    const playlists = await persistence.getContributedPlaylists(
      req.session.user.id,
    );
    res.locals.playlists = playlists;
    res.locals.playlistType = "contribution";
    res.locals.pageTitle = "Contributing playlists";
    return res.render("playlists");
  }),
);

app.get(
  "/:playlistType/playlists/create",
  requireAuth,
  catchError((req, res) => {
    res.locals.playlistType = req.params.playlistType;
    return res.render("create_playlist", { pageTitle: "Create Playlist" });
  }),
);

app.post(
  "/:playlistType/playlists/create",
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
    const playlistType = req.params.playlistType;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      errors.array().forEach((message) => req.flash("errors", message.msg));
      return res.redirect(`/${playlistType}/playlists/create`);
    }
    const { title, visiability } = req.body;
    try {
      await persistence.createPlaylist(title, visiability, req.session.user.id);
    } catch (error) {
      if (error.constraint === "unique_creator_id_title") {
        req.flash("errors", MSG.uniquePlaylist);
        return res.redirect(`/${playlistType}/playlists/create`);
      }
      throw error;
    }
    req.flash("successes", MSG.createPlaylist);
    return res.redirect("/playlists/your");
  }),
);

app.post(
  "/signout",
  requireAuth,
  catchError((req, res) => {
    req.session.destroy((error) => {
      if (error) console.error(error);
      return res.redirect("/playlists/public");
    });
  }),
);

app.get(
  "/login",
  catchError((req, res) => {
    if (req.session.user) return res.redirect("/playlists/your");
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
      return res.redirect("/login");
    }
    const username = req.body.username;
    const password = req.body.password;
    const user = await persistence.validateUser(username, password);
    if (user) {
      req.session.user = user;
      req.flash("successes", MSG.loggedIn);
      return res.redirect("/playlists/your");
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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      errors.array().forEach((message) => req.flash("errors", message.msg));
      return res.redirect("/signup");
    }
    const { username, password } = req.body;
    const user = await persistence.createUser(username, password);
    if (!user) {
      req.flash("errors", MSG.uniqueUsername);
      return res.redirect("/signup");
    }
    req.session.user = user;
    req.flash("successes", MSG.createUser);
    return res.redirect("/playlists/your");
  }),
);

app.get(
  "/",
  catchError((req, res) => {
    if (req.session.user) {
      return res.redirect("/playlists/your");
    } else {
      return res.redirect("/playlists/public");
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
