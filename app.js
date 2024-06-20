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
app.get("/playlists/create", (req, res) => {
  res.render("create_playlist");
});
app.post("/playlists/create", async (req, res) => {
  const { title, username, visiability } = req.body;
  const result = await persistence.createPlaylist(
    title,
    username,
    visiability,
    req.session.user.id,
  );
  if (result.rowCount >= 1) res.redirect("/playlists");
});

app.get("/playlist/contributors", (req, res) => {
  console.log("IN CONTRIBUTORS");
  res.render("contributors");
});

app.post("/playlist/contributors", async (req, res) => {
  const contributors = await persistence.getContributors(req.session.playlistId);
  res.render("contributors", { contributors });

});

app.get("/playlist/:playlistId", async (req, res) => {
  console.log("IN PLAYLIST ROUTE");
  const playlistId = Number(req.params.playlistId);
  req.session.playlistId = playlistId;
  const playlist = await persistence.getPlaylist(playlistId);
  const updatedPlaylist = getUpdatedPlaylist(playlist);
  console.log("UPDATED PLAYLIST", updatedPlaylist);
  res.render("playlist", { playlist: updatedPlaylist });
});

app.get("/playlists", async (req, res) => {
  const playlists = await persistence.getPlaylists(req.session.user.id);
  console.log("IN PLAYLISTS ROUTE", { playlists });
  res.render("playlists", { playlists });
});


app.get("/login", (req, res) => {
  res.render("login");
});
app.post("/login", async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  const user = await persistence.validateUser(username, password);
  if (user) {
    //store in session
    req.session.user = user;
    //redired to playlists page
    res.redirect("/playlists");
  } else {
    //display an error message to user
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
  res.redirect("/playlists");
});

app.listen(port, host, () => {
  console.log(`🎵 Nhanify music ready to rock on http://${host}:${port} 🎵`);
});
