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

app.post("/playlist/:playlistId/contributors/add", async (req, res) => {
  const playlistId = Number(req.params.playlistId);
  const rowCount = await persistence.addContributor(
    req.body.username,
    playlistId,
  );
  if (rowCount >= 1) res.redirect(`/playlist/${playlistId}/contributors`);
});

app.get("/playlist/:playlistId/contributors/add", (req, res) => {
  res.render("add_contributors", { playlistId: req.params.playlistId });
});

app.get("/playlist/:playlistId/contributors", async (req, res) => {
  const playlistId = Number(req.params.playlistId);
  const contributors = await persistence.getContributors(playlistId);
  res.render("contributors", {
    contributors,
    playlistId,
  });
});

app.get("/:playlistType/playlist/:playlistId", async (req, res) => {
  const playlistId = Number(req.params.playlistId);
  const playlist = await persistence.getPlaylist(playlistId);
  const updatedPlaylist = getUpdatedPlaylist(playlist);
  //if (playlistId === req.session.user.id) res.locals:
  res.locals.playlistType = req.params.playlistType;
  res.render("playlist", {
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
  res.redirect("/playlists/your");
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
  res.redirect("/playlists/contributing");
});

app.post(
  "/playlist/:playlistId/contributors/delete/:contributorId",
  async (req, res) => {
    const playlistId = req.params.playlistId;
    const rowCount = await persistence.deleteContributor(
      playlistId,
      req.params.contributorId,
    );
    if (rowCount >= 1) res.redirect(`/playlist/${playlistId}/contributors`);
  },
);

app.get("/playlists/public", async (req, res) => {
  const playlists = await persistence.getPublicPlaylists();
  res.locals.playlists = playlists;
  res.locals.playlistType = "public";
  res.locals.pageTitle = "Public playlists";
  res.render("playlists");
});

app.get("/playlists/your", async (req, res) => {
  const playlists = await persistence.getUserCreatedPlaylists(
    req.session.user.id,
  );
  res.locals.playlists = playlists;
  res.locals.playlistType = "owned";
  res.locals.pageTitle = "Your playlists";
  res.render("playlists");
});

app.get("/playlists/contributing", async (req, res) => {
  const playlists = await persistence.getContributedPlaylists(
    req.session.user.id,
  );
  res.locals.playlists = playlists;
  res.locals.playlistType = "contribution";
  res.locals.pageTitle = "Contributing playlists";
  res.render("playlists");
});

app.get("/playlists/create", (req, res) => {
  res.render("create_playlist");
});

app.post("/playlists/create", async (req, res) => {
  const { title, visiability } = req.body;
  const rowCount = await persistence.createPlaylist(
    title,
    visiability,
    req.session.user.id,
  );
  if (rowCount >= 1) res.redirect("/playlists/your");
});

app.post("/signout", (req, res) => {
  req.session.destroy((error) => {
    if (error) console.error(error);
    res.redirect("/playlists/public");
  });
});

app.get("/login", (req, res) => {
  if (req.session.user) res.redirect("/playlists/your");
  res.render("login");
});

app.post("/login", async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  const user = await persistence.validateUser(username, password);
  if (user) {
    req.session.user = user;
    res.redirect("/playlists/your");
  } else {
    res.redirect("/login");
  }
});

app.get("/signup", (req, res) => {
  res.render("signup");
});

app.post("/signup", async (req, res) => {
  const { username, password } = req.body;
  const user = await persistence.createUser(username, password);
  req.session.user = user;
  res.redirect("/playlists/your");
});

app.get("/", (req, res) => {
  if (req.session.user) {
    res.redirect("/playlists/your");
  } else {
    res.redirect("/playlists/public");
  }
});

app.listen(port, host, () => {
  console.log(`🎵 Nhanify music ready to rock on http://${host}:${port} 🎵`);
});
