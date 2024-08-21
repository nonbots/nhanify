const { HOST, PORT, SECRET } = process.env;
const express = require("express");
const app = express();
const session = require("express-session");
const store = require("connect-loki");
const LokiStore = store(session);
const morgan = require("morgan");
const { NotFoundError, ForbiddenError } = require("./lib/errors.js");
const { body, validationResult } = require("express-validator");
const flash = require("express-flash");
const catchError = require("./lib/catch-error");
const Persistence = require("./lib/pg-persistence.js");
const persistence = new Persistence();
const {
  isValidRedirectURL,
  isValidURL,
  parseURL,
} = require("./lib/playlist.js");
const MSG = require("./lib/msg.json");
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
    secret: SECRET,
    store: new LokiStore({}),
  }),
);
app.use(flash());

function requireAuth(req, res, next) {
  if (!req.session.user) {
    const requestURL = encodeURIComponent(req.originalUrl);
    const fullRequestURL = `http://${HOST}:${PORT}${requestURL}`;
    req.session.requestMethod = req.method;
    req.session.referrer = req.header("Referrer");
    req.flash("errors", MSG.error401);
    res.redirect(`/login?fullRedirectUrl=${fullRequestURL}`);
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
    if (!isYourPlaylist) throw new ForbiddenError();
    const playlist = await persistence.getPlaylistTitle(+playlistId);
    if (!playlist) throw new NotFoundError();
    return res.render("add_contributors", {
      playlistId: +playlistId,
      pageTitle: `Add contributor to ${playlist.title}`,
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
    const rerender = async () => {
      const playlist = await persistence.getPlaylistTitle(+playlistId);
      if (!playlist) throw new NotFoundError();
      return res.render("add_contributors", {
        flash: req.flash(),
        username: req.body.username,
        playlistId: +playlistId,
        pageTitle: `Add contributor to ${playlist.title}`,
        playlistType,
        curPageNum: +curPageNum,
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
      `/${playlistType}/playlist/${playlistId}/${curPageNum}`,
    );
  }),
);

app.get(
  "/:playlistType/playlist/:playlistId/:songId/editSong/:curPageNum",
  requireAuth,
  catchError(async (req, res) => {
    const { playlistType, playlistId, songId, curPageNum } = req.params;
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
        curPageNum,
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
    const { title, url } = req.body;
    const writePlaylist = await persistence.isWriteSongAuthorized(
      +playlistId,
      req.session.user.id,
    );
    if (!writePlaylist) throw new ForbiddenError();
    const rerender = async () => {
      const offset = +curPageNum <= 1 ? 0 : (+curPageNum - 1) * ITEMS_PER_PAGE;
      const playlist = await persistence.getPlaylistInfoSongs(
        +playlistId,
        offset,
        ITEMS_PER_PAGE,
      );
      const videoIds = playlist.songs.map((song) => song.video_id);
      const totalPages = Math.ceil(playlist.songTotal / ITEMS_PER_PAGE);
      const isEmpty = totalPages === 0;
      const totalPagesUpdated = !isEmpty ? totalPages : totalPages + 1;
      if (+curPageNum > totalPagesUpdated || +curPageNum < 1)
        throw new NotFoundError();
      const startPage = Math.max(+curPageNum - PAGE_OFFSET, 1);
      const endPage = Math.min(+curPageNum + PAGE_OFFSET, totalPages);
      return res.render("playlist", {
        flash: req.flash(),
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
        url,
        title,
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
    const videoId = parseURL(url);
    try {
      await persistence.addSong(
        title,
        videoId,
        +playlistId,
        req.session.user.id,
      );
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
      `/${playlistType}/playlist/${playlistId}/${curPageNum}`,
    );
  }),
);

app.post(
  "/:playlistType/playlist/:playlistId/:songId/deleteSong/:curPageNum",
  requireAuth,
  catchError(async (req, res) => {
    let { playlistType, playlistId, songId, curPageNum } = req.params;
    const writePlaylist = await persistence.isWriteSongAuthorized(
      +playlistId,
      req.session.user.id,
    );
    if (!writePlaylist) throw new ForbiddenError();
    const deleted = await persistence.deleteSong(+songId);
    if (!deleted) throw new NotFoundError();
    const rowCount = await persistence.getSongTotal(playlistId);
    const totalPages = Math.ceil(rowCount.count / ITEMS_PER_PAGE);
    req.flash("successes", MSG.deleteSong);
    if (curPageNum > totalPages - 1) curPageNum -= 1;
    return res.redirect(
      `/${playlistType}/playlist/${playlistId}/${curPageNum}`,
    );
  }),
);

app.post(
  "/playlists/:playlistId/delete/contribution/:curPageNum",
  requireAuth,
  catchError(async (req, res) => {
    let { playlistId, curPageNum } = req.params;
    const userId = req.session.user.id;
    const contributionPlaylist = await persistence.deleteContributionPlaylist(
      +playlistId,
      userId,
    );
    if (!contributionPlaylist) throw new NotFoundError();
    const rowCount = await persistence.getContributionPlaylistTotal(userId);
    const totalPages = Math.ceil(rowCount.count / ITEMS_PER_PAGE);
    if (+curPageNum > totalPages - 1) curPageNum -= 1;
    req.flash("successes", MSG.deletePlaylist);
    return res.redirect(`/contribution/playlists/${curPageNum}`);
  }),
);

app.get(
  "/:playlistType/playlist/:playlistId/contributors/:curPageNum",
  requireAuth,
  catchError(async (req, res) => {
    const { playlistType, playlistId, curPageNum } = req.params;
    const offset = +curPageNum <= 1 ? 0 : (+curPageNum - 1) * ITEMS_PER_PAGE;
    const limit = ITEMS_PER_PAGE;
    const contributors = await persistence.getContributorsPage(
      +playlistId,
      offset,
      limit,
    );
    const countRow = await persistence.getContributorTotal(+playlistId);
    const totalPages = Math.ceil(countRow.count / ITEMS_PER_PAGE);
    const isEmpty = totalPages === 0;
    console.log({ isEmpty });
    const totalPagesUpdated = !isEmpty ? totalPages : totalPages + 1;
    if (+curPageNum > totalPagesUpdated || +curPageNum < 1)
      throw new NotFoundError();
    const startPage = Math.max(+curPageNum - PAGE_OFFSET, 1);
    const endPage = Math.min(+curPageNum + PAGE_OFFSET, totalPages);
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

app.post(
  "/:playlistType/playlist/:playlistId/contributors/delete/:contributorId/:curPageNum",
  requireAuth,
  catchError(async (req, res) => {
    const { contributorId, playlistId, curPageNum, playlistType } = req.params;
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
    //flash is not showing
    req.flash("successes", MSG.deleteContributor);
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
    const offset = +curPageNum <= 1 ? 0 : (+curPageNum - 1) * ITEMS_PER_PAGE;

    const isReadAuth = await persistence.isReadPlaylistAuthorized(
      playlistId,
      req.session.user.id,
    );
    if (!isReadAuth) throw new ForbiddenError();
    const playlist = await persistence.getPlaylistInfoSongs(
      +playlistId,
      offset,
      ITEMS_PER_PAGE,
    );
    const videoIds = playlist.songs.map((song) => song.video_id);
    const totalPages = Math.ceil(playlist.songTotal / ITEMS_PER_PAGE);
    const isEmpty = totalPages === 0;
    const totalPagesUpdated = !isEmpty ? totalPages : totalPages + 1;
    if (+curPageNum > totalPagesUpdated || +curPageNum < 1)
      throw new NotFoundError();
    startPage = Math.max(+curPageNum - PAGE_OFFSET, 1);
    endPage = Math.min(+curPageNum + PAGE_OFFSET, totalPages);
    console.log({ startPage, endPage }, "IN GET SONGS IN PLAYLIST");
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
    });
  }),
);

app.post(
  "/playlists/:playlistId/delete/:curPageNum",
  requireAuth,
  catchError(async (req, res) => {
    let { playlistId, curPageNum } = req.params;
    const userId = +req.session.user.id;
    const isYourPlaylist = await persistence.isYourPlaylist(
      +playlistId,
      userId,
    );
    if (!isYourPlaylist) throw new ForbiddenError();
    const deleted = await persistence.deletePlaylist(+playlistId);
    if (!deleted) throw new NotFoundError();
    const playlistTotal = await persistence.getYourPlaylistTotal(userId);
    const totalPages = Math.ceil(+playlistTotal / ITEMS_PER_PAGE);
    if (+curPageNum > totalPages - 1) curPageNum -= 1;
    /*
     *
    const totalPages = Math.ceil(rowCount.count / ITEMS_PER_PAGE);
    if (+curPageNum > totalPages - 1) curPageNum -= 1;
     */
    req.flash("successes", MSG.deletePlaylist);
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
    if (!isYourPlaylist) throw new ForbiddenError();
    const playlist = await persistence.getPlaylist(+playlistId);
    if (!playlist) throw new NotFoundError();
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
        curPageNum: +curPageNum,
      });
    };
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      errors.array().forEach((message) => req.flash("errors", message.msg));
      await rerender();
      return;
    }
    const isPrivate = req.body.visiability === "private" ? true : false;
    try {
      const edited = await persistence.editPlaylist(
        playlistId,
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
    return res.redirect(`/your/playlists/${curPageNum}`);
  }),
);

app.get(
  "/:playlistType/playlists/:curPageNum",
  requireAuth,
  catchError(async (req, res) => {
    const { playlistType, curPageNum } = req.params;
    console.log({ curPageNum }, "IN GET PLAYLIST");
    const userId = +req.session.user.id;
    const offset = +curPageNum <= 1 ? 0 : (+curPageNum - 1) * ITEMS_PER_PAGE;
    /*
const offset = +curPageNum <= 1 ? 0 : (+curPageNum - 1) * ITEMS_PER_PAGE;
    */
    // start of the records to grab from
    // 1 <= 1 ? 0* : 1 - 1 * 5 0
    // 2 < 1 ? 0 : 2 - 1 * 5* 5
    // 3 < 1 ? 0 : 3 - 1 * 5* 10
    // 4 < 1 ? 0 : 4 - 1 * 5* 15

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
    const totalPages = Math.ceil(+playlistTotal / ITEMS_PER_PAGE);
    const isEmpty = totalPages === 0;
    const totalPagesUpdated = !isEmpty ? totalPages : totalPages + 1;
    if (+curPageNum > totalPagesUpdated || +curPageNum < 1)
      throw new NotFoundError();
    const startPage = Math.max(+curPageNum - PAGE_OFFSET, 1);
    const endPage = Math.min(+curPageNum + PAGE_OFFSET, totalPages);

    /*
      const isEmpty = totalPages === 0;
      const totalPagesUpdated = !isEmpty ? totalPages : totalPages + 1;
      if (+curPageNum > totalPagesUpdated || +curPageNum < 1) throw new NotFoundError();
      const startPage = Math.max(+curPageNum - PAGE_OFFSET, 1);
      const endPage = Math.min(+curPageNum + PAGE_OFFSET, totalPages);
    */
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
        return res.render("create_playlist", {
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
      return res.redirect("/your/playlists/1");
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
      return res.render("login", { flash: req.flash() });
    }
    const { username, password } = req.body;
    const authenticatedUser = await persistence.authenticateUser(
      username,
      password,
    );
    if (!authenticatedUser) {
      req.flash("errors", MSG.invalidCred);
      return res.render("login", { flash: req.flash() });
    }
    req.session.user = authenticatedUser;
    req.flash("successes", MSG.loggedIn);
    console.log("THE REDIRECT URL", req.query.redirectUrl);
    if (!isValidRedirectURL(req.query.fullRedirectUrl)) {
      console.log("IN INVALID URL");
      return res.redirect("/your/playlists/1");
    } else {
      console.log("IN VALID URL");
      if (req.session.requestMethod === "POST")
        return res.redirect(req.session.referrer);
      return res.redirect(req.query.fullRedirectUrl);
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
    const { username, password } = req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      errors.array().forEach((message) => {
        req.flash("errors", message.msg);
      });
      return res.render("signup", { flash: req.flash() });
    }
    try {
      const createdUser = await persistence.createUser(username, password);
      req.session.user = createdUser;
    } catch (error) {
      if (error.constraint === "unique_username") {
        req.flash("errors", MSG.uniqueUsername);
        return res.render("signup", { flash: req.flash() });
      }
      throw error;
    }
    req.flash("successes", MSG.createUser);
    return res.redirect("/your/playlists/1");
  }),
);

app.get(
  "/",
  catchError((req, res) => {
    if (req.session.user) {
      return res.redirect("/your/playlists/1");
    } else {
      return res.redirect("/login");
    }
  }),
);

app.use("*", (req, res, next) => {
  next(new NotFoundError());
});

app.use((err, req, res, next) => {
  console.log(err);
  if (err instanceof ForbiddenError) {
    res.status(403);
    res.render("error", {
      statusCode: 403,
      msg: MSG.error403,
      msg2: MSG.errorNav,
    });
  } else if (err instanceof NotFoundError) {
    res.status(404);
    res.render("error", {
      statusCode: 404,
      msg: MSG.error404,
      msg2: MSG.errorNav,
    });
  } else {
    res.status(500);
    res.render("error", { statusCode: 500, msg: MSG.error500 });
  }
});

app.listen(PORT, HOST, () => {
  console.log(`🎵 Nhanify music ready to rock on http://${HOST}:${PORT} 🎵`);
});
