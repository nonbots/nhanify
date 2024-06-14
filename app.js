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

app.get("/playlists", async (req, res) => {
  const playlists = await persistence.getPlaylists(req.session.user.id);
  res.render("playlists", { playlists });
});

app.get("/playlist/:playlistId", async (req, res) => {
  const playlistId = Number(req.params.playlistId);
  const playlist = await persistence.getPlaylist(playlistId);
  const updatedPlaylist = getUpdatedPlaylist(playlist);
  console.log("UPDATED PLAYLIST", updatedPlaylist);
  res.render("playlist", { playlist: updatedPlaylist });
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  console.log({ password });
  const user = await persistence.validateUser(username, password);
  if (user) {
    //store in session
    req.session.user = user;
    //redired to playlists page
    res.redirect("/playlists");
  } else {
    //display an error message to user
  }
});
app.listen(port, host, () => {
  console.log(`🎵 Nhanify music ready to rock on http://${host}:${port} 🎵`);
});
