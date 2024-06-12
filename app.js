const express = require("express");
const app = express();
const morgan = require("morgan");
const Persistence = require("./lib/pg-persistence.js");
const persistence = new Persistence(1);
const port = 3002;
const host = "localhost";
const {getUpdatedPlaylist} = require("./lib/playlist.js");
app.set("views", "./views");
app.set("view engine", "pug");
app.use(express.static("public"));
app.use(morgan("common"));

app.get("/playlists", async (req, res) => {
  const playlists = await persistence.getPlaylists();
  res.render("playlists", { playlists });
});

app.get("/playlist/:playlistId", async (req, res) => {
  const playlistId = Number(req.params.playlistId); 
  const playlist = await persistence.getPlaylist(playlistId);
  const updatedPlaylist = getUpdatedPlaylist(playlist);
  console.log("UPDATED PLAYLIST", updatedPlaylist);
  res.render("playlist", { playlist: updatedPlaylist });
});

app.listen(port, host, () => {
  console.log(`🎵 Nhanify music ready to rock on http://${host}:${port} 🎵`);
});


