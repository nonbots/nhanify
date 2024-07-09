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

app.use((req, res, next) => {
  res.locals.user = req.session.user;
  next();
});

app.post(
  "/:playlistType/playlist/:playlistId/contributors/add",
  async (req, res) => {
    if (!req.session.user) return res.redirect("playlists/pubilc");
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
  async (req, res) => {
    // anonymous user
    if (!req.session.user) return res.redirect("/playlists/public");
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

app.post("/playlists/:playlistId/delete", async (req, res) => {
  const rowCount = await persistence.deletePlaylist(+req.params.playlistId);

  if (rowCount !== 1) {
    // if not equal to 1 display a error that playlist does not exist;
  }
  return res.redirect("/playlists/your");
});

app.post("/playlists/:playlistId/delete/contribution", async (req, res) => {
  const playlistId = +req.params.playlistId;
  const rowCount = await persistence.deleteContributionPlaylist(
    playlistId,
    req.session.user.id,
  );

  if (rowCount !== 1) {
    // if not equal to 1 display a error that playlist does not exist;
  }
  return res.redirect("/playlists/contributing");
});

app.post(
  "/:playlistType/playlist/:playlistId/contributors/delete/:contributorId",
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

app.get("/playlists/your", async (req, res) => {
  const playlists = await persistence.getUserCreatedPlaylists(
    req.session.user.id,
  );
  res.locals.playlists = playlists;
  res.locals.playlistType = "owned";
  res.locals.pageTitle = "Your playlists";
  return res.render("playlists");
});

app.get("/playlists/contributing", async (req, res) => {
  const playlists = await persistence.getContributedPlaylists(
    req.session.user.id,
  );
  res.locals.playlists = playlists;
  res.locals.playlistType = "contribution";
  res.locals.pageTitle = "Contributing playlists";
  return res.render("playlists");
});

app.get("/:playlistType/playlists/create", (req, res) => {
  res.locals.playlistType = req.params.playlistType;
  return res.render("create_playlist");
});

app.post("/playlists/create", async (req, res) => {
  const { title, visiability } = req.body;
  const rowCount = await persistence.createPlaylist(
    title,
    visiability,
    req.session.user.id,
  );
  if (rowCount >= 1) return res.redirect("/playlists/your");
});

app.post("/signout", (req, res) => {
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
