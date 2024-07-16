const MSG = require("./lib/msg.json");
console.log("MSG", MSG);
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
const { getUpdatedPlaylist } = require("./lib/playlist.js");
const flash = require("express-flash");
const { body, validationResult } = require("express-validator");
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
    console.log("WE ARE IN THE REQUIREAUTH MIDDLEWARE");
    res.redirect("/playlists/public?a");
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
      .withMessage(MSG.maxUsername),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    const playlistId = +req.params.playlistId;
    const playlistType = req.params.playlistType;
    if (!errors.isEmpty()) {
      errors.array().forEach((message) => req.flash("errors", message.msg));
      return res.redirect(
        `/${playlistType}/playlist/${playlistId}/contributors/add`,
      );
    }
    const username = req.body.username;
    if (username === req.session.user.username) {
      req.flash("errors", "Creator of the playlist can not be a contributor.");
      return res.redirect(
        `/${playlistType}/playlist/${playlistId}/contributors/add`,
      );
    }
    const userId = req.session.user.id;
    const ownedPlaylist = await persistence.getOwnedPlaylist(
      playlistId,
      userId,
    );
    if (ownedPlaylist !== 1) {
      req.flash("errors", MSG.unauthorizedUser);
      console.log("IN THE OWNEDPLAYLIST");
      return res.redirect("/playlists/your?b");
    }
    const user = await persistence.getContributor(username);
    if (!user) {
      req.flash("errors", "Username does not exist.");
      return res.redirect(
        `/${playlistType}/playlist/${playlistId}/contributors/add`,
      );
    }
    try {
      await persistence.addContributor(user.id, playlistId);
    } catch (error) {
      if (error.constraint === "unique_playlist_id_user_id") {
        req.flash(
          "errors",
          "Username is already a contributor on the playlist.",
        );
      } else {
        req.flash(
          "errors",
          "Sorry something went wrong with your request. Please try again.",
        );
      }
      return res.redirect(
        `/${playlistType}/playlist/${playlistId}/contributors/add`,
      );
    }
    req.flash(
      "successes",
      "Contributor was successfully added to the playlist.",
    );
    return res.redirect(`/${playlistType}/playlist/${playlistId}/contributors`);
  },
);

app.get(
  "/:playlistType/playlist/:playlistId/contributors/add",
  requireAuth,
  async (req, res) => {
    //signed user that don't own the playlist
    const playlistId = +req.params.playlistId;
    let ownedPlaylist;
    try {
      ownedPlaylist = await persistence.getOwnedPlaylist(
        playlistId,
        req.session.user.id,
      );
    } catch (error) {
      req.flash("errors", MSG.unknownDbError);
      return res.redirect("/playlists/your");
    }
    if (ownedPlaylist !== 1) {
      req.flash("errors", MSG.unauthorizedUser);
      return res.redirect("/playlists/your");
    }
    let playlistTitle;
    try {
      await persistence.getPlaylistTitle(playlistId);
    } catch (error) {
      req.flash("errors", MSG.unknownDbError);
      return res.redirect("/playlists/your");
    }
    res.locals.pageTitle = `Add contributor to ${playlistTitle}`;
    res.locals.playlistType = req.params.playlistType;
    return res.render("add_contributors", { playlistId });
  },
);

app.get(
  "/:playlistType/playlist/:playlistId/contributors",
  requireAuth,
  async (req, res) => {
    const playlistId = Number(req.params.playlistId);
    const contributors = await persistence.getContributors(playlistId);
    res.locals.pageTitle = `${contributors.playlistTitle} Contributors`;
    res.locals.playlistType = req.params.playlistType;
    return res.render("contributors", {
      contributors,
      playlistId,
    });
  },
);

app.get("/:playlistType/playlist/:playlistId", async (req, res) => {
  const playlistId = Number(req.params.playlistId);
  if (!req.session.user) {
    if ((await persistence.getPublicPlaylist(playlistId)) !== 1)
      return res.redirect("/playlists/public");
  } else {
    const authPlaylist = await persistence.getUserAuthorizedPlaylist(
      playlistId,
      req.session.user.id,
    );
    console.log({ authPlaylist });
    if (authPlaylist !== 1) return res.redirect("/playlists/your");
  }
  const playlist = await persistence.getPlaylist(playlistId);
  const updatedPlaylist = getUpdatedPlaylist(playlist);
  //if (playlistId === req.session.user.id) res.locals:
  res.locals.playlistType = req.params.playlistType;
  return res.render("playlist", {
    playlist: updatedPlaylist,
    playlistId,
    pageTitle: updatedPlaylist.title,
  });
});

app.post("/playlists/:playlistId/delete", requireAuth, async (req, res) => {
  const playlistId = +req.params.playlistId;
  if (
    (await persistence.getOwnedPlaylist(playlistId, req.session.user.id)) !== 1
  )
    return res.redirect("/playlists/your");
  try {
    await persistence.deletePlaylist(playlistId);
  } catch (error) {
    req.flash("errors", MSG.unknownDbError);
  }
  req.flash("successes", "Playlist was successfully deleted");
  return res.redirect("/playlists/your");
});

app.post(
  "/playlists/:playlistId/delete/contribution",
  requireAuth,
  async (req, res) => {
    const playlistId = +req.params.playlistId;
    const rowCount = await persistence.deleteContributionPlaylist(
      playlistId,
      req.session.user.id,
    );
    if (rowCount !== 1) {
      // if not equal to 1 display a error that playlist does not exist;
    }
    return res.redirect("/playlists/contributing");
  },
);

app.post(
  "/:playlistType/playlist/:playlistId/contributors/delete/:contributorId",
  requireAuth,
  async (req, res) => {
    const playlistId = +req.params.playlistId;
    if (
      (await persistence.getOwnedPlaylist(playlistId, req.session.user.id)) !==
      1
    )
      return res.redirect("/playlists/your");
    const playlistType = req.params.playlistType;
    const rowCount = await persistence.deleteContributor(
      playlistId,
      req.params.contributorId,
    );
    if (rowCount >= 1)
      return res.redirect(
        `/${playlistType}/playlist/${playlistId}/contributors`,
      );
  },
);

app.get("/playlists/public", async (req, res) => {
  const playlists = await persistence.getPublicPlaylists();
  res.locals.playlists = playlists;
  res.locals.playlistType = "public";
  res.locals.pageTitle = "Public playlists";
  return res.render("playlists");
});

app.get("/playlists/your", requireAuth, async (req, res) => {
  const playlists = await persistence.getUserCreatedPlaylists(
    req.session.user.id,
  );
  res.locals.playlists = playlists;
  res.locals.playlistType = "owned";
  res.locals.pageTitle = "Your playlists";
  return res.render("playlists");
});

app.get("/playlists/contributing", requireAuth, async (req, res) => {
  const playlists = await persistence.getContributedPlaylists(
    req.session.user.id,
  );
  res.locals.playlists = playlists;
  res.locals.playlistType = "contribution";
  res.locals.pageTitle = "Contributing playlists";
  return res.render("playlists");
});

app.get("/:playlistType/playlists/create", requireAuth, (req, res) => {
  res.locals.playlistType = req.params.playlistType;
  return res.render("create_playlist");
});

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
  async (req, res) => {
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
      req.flash(
        "errors",
        "Sorry something went wrong with your request. Please try again.",
      );
      return res.redirect(`/${playlistType}/playlists/create`);
    }
    req.flash("successes", "Playlist was successfully created.");
    return res.redirect("/playlists/your");
  },
);

app.post("/signout", requireAuth, (req, res) => {
  req.session.destroy((error) => {
    if (error) console.error(error);
    return res.redirect("/playlists/public");
  });
});

app.get("/login", (req, res) => {
  if (req.session.user) return res.redirect("/playlists/your");
  return res.render("login");
});

app.post(
  "/login",
  [
    body("username")
      .trim()
      .isLength({ min: 1 })
      .withMessage("Username is empty."),
    body("password")
      .trim()
      .isLength({ min: 1 })
      .withMessage("Password is empty."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      errors.array().forEach((message) => req.flash("errors", message.msg));
    }
    const username = req.body.username;
    const password = req.body.password;
    const user = await persistence.validateUser(username, password);
    if (user) {
      req.session.user = user;
      req.flash("successes", "You have successfully logged in.");
      return res.redirect("/playlists/your");
    } else {
      req.flash("errors", "Credentials are invalid.");
      return res.redirect("/login");
    }
  },
);

app.get("/signup", (req, res) => {
  return res.render("signup");
});

app.post(
  "/signup",
  [
    body("username")
      .trim()
      .isLength({ min: 1 })
      .withMessage("Username is empty.")
      .isLength({ max: 30 })
      .withMessage("Username is over the maxium of 30 characters"),
    body("password")
      .trim()
      .isLength({ min: 12 })
      .withMessage("Password is under the minium of 12 characters.")
      .isLength({ max: 72 })
      .withMessage("Password is over the maxium of 72 characters."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      errors.array().forEach((message) => req.flash("errors", message.msg));
      return res.redirect("/signup");
    }
    const { username, password } = req.body;
    let user;
    try {
      user = await persistence.createUser(username, password);
    } catch (error) {
      if (error.constraint === "unique_username") {
        req.flash("errors", "Username is already taken");
      } else {
        console.log({ error });
        req.flash("errors", "Sorry something went wrong the your request.");
      }
      return res.redirect("/signup");
    }
    req.session.user = user;
    req.flash("successes", "User account was successfully created.");
    return res.redirect("/playlists/your");
  },
);

app.get("/", (req, res) => {
  if (req.session.user) {
    return res.redirect("/playlists/your");
  } else {
    return res.redirect("/playlists/public");
  }
});

app.listen(port, host, () => {
  console.log(`🎵 Nhanify music ready to rock on http://${host}:${port} 🎵`);
});
