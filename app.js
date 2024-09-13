const {
  DOMAIN,
  CLIENT_SECRET,
  REDIRECT_URI,
  CLIENT_ID,
  HOST,
  PORT,
  SESSION_SECRET,
} = process.env;
const express = require("express");
const app = express();
const session = require("express-session");
const store = require("connect-loki");
const LokiStore = store(session);
const morgan = require("morgan");
const { NotFoundError, ForbiddenError } = require("./lib/errors.js");
const { getPlaylists, getPlaylist } = require("./lib/middleware.js");
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
    secret: SESSION_SECRET,
    store: new LokiStore({}),
  }),
);
app.use(flash());

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

app.use((req, res, next) => {
  if (req.url === "/favicon.ico") return res.status(204).end();
  res.locals.user = req.session.user;
  res.locals.flash = req.session.flash;
  delete req.session.flash;
  next();
});

app.get("/twitchAuth", (req, res) => {
  res.redirect(
    `https://id.twitch.tv/oauth2/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=user:read:email&state=c3ab8aa609ea11e793ae92361f002671&nonce=c3ab8aa609ea11e793ae92361f002671`,
  );
});

app.get("/twitchAuthResponse", async (req, res) => {
  const payload = {
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code: req.query.code,
    grant_type: "authorization_code",
    redirect_uri: REDIRECT_URI,
  };
  const token = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(payload).toString(),
  });
  const response = await token.json();
  const authUser = await fetch("https://api.twitch.tv/helix/users", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${response.access_token}`,
      "Client-Id": CLIENT_ID,
    },
  });
  const responseAuthUser = await authUser.json();
  if (responseAuthUser.message === "Invalid OAuth token")
    return res.render("sigin");
  const username = responseAuthUser.data[0].display_name;
  const user = await persistence.findUser(username);
  if (!user) {
    req.flash("errors", "No account associated with the username. ");
    req.session.twitchUsername = username;
    return res.redirect("/twitchSignup");
  }
  req.flash("successes", "You are logged in");
  req.session.user = user;
  return res.redirect("/your/playlists/1");
});

app.get("/twitchSignup", (req, res) => {
  const twitchUsername = req.session.twitchUsername;
  if (!twitchUsername) return res.redirect("/signin");
  return res.render("twitch_signup", { twitchUsername });
});
app.post("/twitchSignup/create", async (req, res) => {
  const user = await persistence.createUserTwitch(req.session.twitchUsername);
  req.session.user = user;
  req.flash("successes", MSG.createUser);
  return res.redirect("/your/playlists/1");
});
app.post("/twitchSignup/cancel", (req, res) => {
  delete req.session.twitchUsername;
  return res.redirect("/signin");
});
// Get the add contributor's form.
app.get(
  "/:playlistType/playlists/:page/playlist/:pagePl/:playlistId/contributors/add",
  requireAuth,
  catchError(async (req, res) => {
    const { playlistId, playlistType, page, pagePl } = req.params;

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
// Delete contributor from a playlist.
app.post(
  "/:playlistType/playlists/:page/playlist/:pagePl/:playlistId/contributors/:pageCb/:contributorId/delete",
  requireAuth,
  catchError(async (req, res) => {
    let { pageCb, pagePl, contributorId, playlistId, page, playlistType } =
      req.params;
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

// Get the contributors on a playlist.
app.get(
  "/:playlistType/playlists/:page/playlist/:pagePl/:playlistId/contributors/:pageCb",
  requireAuth,
  catchError(async (req, res) => {
    const { playlistType, playlistId, page, pagePl, pageCb } = req.params;
    const auth = await persistence.isReadPlaylistAuthorized(
      +playlistId,
      req.session.user.id,
    );
    if (!auth) throw new ForbiddenError();
    const offset = (+pageCb - 1) * ITEMS_PER_PAGE;
    const contributor = await persistence.getContributorTotal(+playlistId);
    if (!contributor) throw new NotFound();
    const totalPages = Math.ceil(+contributor.count / ITEMS_PER_PAGE);
    if ((+pageCb > totalPages && +pageCb !== 1) || +pageCb < 1)
      throw new NotFoundError();
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
//Here

// Add contributor to a playlist.
app.post(
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

// Get the song's edit form.
app.get(
  "/:playlistType/playlists/:page/playlist/:pagePl/:playlistId/:songId/edit",
  requireAuth,
  catchError(async (req, res) => {
    const { playlistType, playlistId, songId, page, pagePl } = req.params;
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
app.post(
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
app.post(
  "/:playlistType/playlists/:page/playlist/:pagePl/:playlistId/add",
  requireAuth,
  [
    body("title")
      .trim()
      .custom((usernameInput) => {
        const input = usernameInput.replace(/[\u200B-\u200D\uFEFF]/g, "");
        return input.length !== 0;
      })
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
    const { playlistType, playlistId, page, pagePl } = req.params;
    const writePlaylist = await persistence.isWriteSongAuthorized(
      +playlistId,
      req.session.user.id,
    );
    if (!writePlaylist) throw new ForbiddenError();
    const rerender = async () => {
      const offset = (+pagePl - 1) * ITEMS_PER_PAGE;
      const playlist = await persistence.getPlaylistInfoSongs(
        +playlistId,
        offset,
        ITEMS_PER_PAGE,
      );
      const videoIds = playlist.songs.map((song) => song.video_id);
      const totalPages = Math.ceil(+playlist.songTotal / ITEMS_PER_PAGE);
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
    const videoId = parseURL(req.body.url);
    try {
      const song = await persistence.addSong(
        req.body.title,
        videoId,
        +playlistId,
        req.session.user.id,
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
app.post(
  "/:playlistType/playlists/:page/playlist/:pagePl/:playlistId/:songId/delete",
  requireAuth,
  catchError(async (req, res) => {
    let { playlistType, playlistId, songId, page, pagePl } = req.params;
    const writePlaylist = await persistence.isWriteSongAuthorized(
      +playlistId,
      req.session.user.id,
    );
    if (!writePlaylist) throw new ForbiddenError();
    const deleted = await persistence.deleteSong(+songId);
    if (!deleted) throw new NotFoundError();
    const song = await persistence.getSongTotal(playlistId);
    if (!song) throw new NotFoundError();
    const totalPages = Math.ceil(+song.count / ITEMS_PER_PAGE);
    req.flash("successes", MSG.deleteSong);
    if (+pagePl > totalPages && +pagePl !== 1) pagePl = +pagePl - 1;
    return res.redirect(
      `/${playlistType}/playlists/${page}/playlist/${pagePl}/${playlistId}`,
    );
  }),
);

// Get a playlist's edit form.
app.get(
  "/:playlistType/playlists/:page/playlist/:playlistId/edit",
  requireAuth,
  catchError(async (req, res) => {
    const { playlistId, playlistType, page } = req.params;
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
app.post(
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

// Get a playlist.
app.get(
  "/:playlistType/playlists/:page/playlist/:pagePl/:playlistId",
  requireAuth,
  catchError(async (req, res, next) => {
    const { page, pagePl, playlistType, playlistId } = req.params;

    const isReadAuth = await persistence.isReadPlaylistAuthorized(
      +playlistId,
      req.session.user.id,
    );
    if (!isReadAuth) throw new ForbiddenError();
    const data = await getPlaylist(
      persistence,
      ITEMS_PER_PAGE,
      PAGE_OFFSET,
      playlistType,
      playlistId,
      page,
      pagePl,
    );
    return res.render("playlist", data);
  }),
);

// Get playlist as anonymous user.
app.get(
  "/anon/public/playlists/:page/playlist/:pagePl/:playlistId",
  catchError(async (req, res) => {
    const { page, playlistId, pagePl } = req.params;
    const data = await getPlaylist(
      persistence,
      ITEMS_PER_PAGE,
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
app.post(
  "/contribution/playlists/:page/playlist/:playlistId/delete",
  requireAuth,
  catchError(async (req, res) => {
    let { playlistId, page } = req.params;
    const userId = req.session.user.id;
    const contributionPlaylist = await persistence.deleteContributionPlaylist(
      +playlistId,
      userId,
    );
    if (!contributionPlaylist) throw new NotFoundError();
    const playlist = await persistence.getContributionPlaylistTotal(userId);
    if (!playlist) throw new NotFoundError();
    const totalPages = Math.ceil(+playlist.count / ITEMS_PER_PAGE);
    req.flash("successes", MSG.deletePlaylist);
    if (+page > totalPages && +page !== 1) page = +page - 1;
    return res.redirect(`/contribution/playlists/${page}`);
  }),
);

// Delete a playlist.
app.post(
  "/:playlistType/playlists/:page/playlist/:playlistId/delete",
  requireAuth,
  catchError(async (req, res) => {
    let { playlistId, page } = req.params;
    const userId = +req.session.user.id;
    const isYourPlaylist = await persistence.isYourPlaylist(
      +playlistId,
      userId,
    );
    if (!isYourPlaylist) throw new ForbiddenError();
    const deleted = await persistence.deletePlaylist(+playlistId);
    if (!deleted) throw new NotFoundError();
    const playlist = await persistence.getYourPlaylistTotal(userId);
    if (!playlist) throw new NotFoundError();
    const totalPages = Math.ceil(+playlist.count / ITEMS_PER_PAGE);
    req.flash("successes", MSG.deletePlaylist);
    if (+page > totalPages && +page !== 1) page = +page - 1;
    return res.redirect(`/your/playlists/${page}`);
  }),
);

// Create a playlist.
app.post(
  "/:playlistType/playlists/:page/create",
  requireAuth,
  [
    body("title")
      .trim()
      .custom((usernameInput) => {
        const input = usernameInput.replace(/[\u200B-\u200D\uFEFF]/g, "");
        return input.length !== 0;
      })
      .withMessage("Title is empty.")
      .isLength({ max: 72 })
      .withMessage("Title is over the min limit of 72 characters."),
  ],
  catchError(async (req, res) => {
    const { playlistType, page } = req.params;
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
app.get(
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
app.get(
  "/:playlistType/playlists/:page",
  requireAuth,
  catchError(async (req, res) => {
    let { playlistType, page } = req.params;
    const userId = +req.session.user.id;
    const data = await getPlaylists(
      playlistType,
      page,
      ITEMS_PER_PAGE,
      persistence,
      PAGE_OFFSET,
      userId,
    );
    return res.render("playlists", data);
  }),
);

// get public playlists as anonymous user.
app.get(
  "/anon/public/playlists/:page",
  catchError(async (req, res) => {
    const { page } = req.params;
    const data = await getPlaylists(
      "anonPublic",
      page,
      ITEMS_PER_PAGE,
      persistence,
      PAGE_OFFSET,
    );
    return res.render("public_playlists", data);
  }),
);

// Sign out.
app.post(
  "/signout",
  requireAuth,
  catchError((req, res) => {
    req.session.destroy((error) => {
      if (error) console.error(error);
      return res.redirect("/signin");
    });
  }),
);

// Get signin form.
app.get(
  "/signin",
  catchError((req, res) => {
    if (req.session.user) {
      req.flash("info", MSG.alreadyLoggedIn);
      return res.redirect("/your/playlists/1");
    }
    req.session.originRedirectUrl = req.query.redirectUrl;
    return res.render("signin");
  }),
);

// Get the home page.
app.get(
  "/",
  catchError((req, res) => {
    if (req.session.user) {
      return res.redirect("/your/playlists/1");
    } else {
      return res.redirect("/signin");
    }
  }),
);

// error handlers
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
