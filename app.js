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

function requireAuth(req, res, next) {
  if (!req.session.user) {
    res.redirect("/playlists/public");
  } else {
    next();
  }
}

app.use((req, res, next) => {
  res.locals.user = req.session.user;
  next();
});

app.post(
  "/:playlistType/playlist/:playlistId/contributors/add",
  requireAuth,
  async (req, res) => {
    const playlistId = +req.params.playlistId;
    const playlistType = req.params.playlistType;
    if (
      (await persistence.getOwnedPlaylist(playlistId, req.session.user.id)) !==
      1
    )
      return res.redirect("/playlists/your");
    const rowCount = await persistence.addContributor(
      req.body.username,
      playlistId,
    );
    if (rowCount >= 1)
      return res.redirect(
        `/${playlistType}/playlist/${playlistId}/contributors`,
      );
  },
);

app.get(
  "/:playlistType/playlist/:playlistId/contributors/add",
  requireAuth,
  async (req, res) => {
    //signed user that don't own the playlist
    const playlistId = +req.params.playlistId;
    if (
      (await persistence.getOwnedPlaylist(playlistId, req.session.user.id)) !==
      1
    )
      return res.redirect("/playlists/your");
    res.locals.pageTitle = `Add contributor to ${await persistence.getPlaylistTitle(playlistId)}`;
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
    //if you are logged in, is the playlist that you are requesting is yours, public or contributing playlist
    if (
      (await persistence.getUserAuthorizedPlaylist(
        playlistId,
        req.session.user.id,
      )) !== 1
    )
      return res.redirect("/playlists/your");
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
  const rowCount = await persistence.deletePlaylist(+req.params.playlistId);
  if (rowCount !== 1) {
    // if not equal to 1 display a error that playlist does not exist;
  }
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
    const playlistId = req.params.playlistId;
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

app.post("/playlists/create", requireAuth, async (req, res) => {
  const { title, visiability } = req.body;
  const rowCount = await persistence.createPlaylist(
    title,
    visiability,
    req.session.user.id,
  );
  if (rowCount >= 1) return res.redirect("/playlists/your");
});

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

app.post("/login", async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  const user = await persistence.validateUser(username, password);
  if (user) {
    req.session.user = user;
    return res.redirect("/playlists/your");
  } else {
    return res.redirect("/login");
  }
});

app.get("/signup", (req, res) => {
  return res.render("signup");
});

app.post("/signup", async (req, res) => {
  const { username, password } = req.body;
  const user = await persistence.createUser(username, password);
  req.session.user = user;
  return res.redirect("/playlists/your");
});

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
