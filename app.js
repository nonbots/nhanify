const express = require("express");
const app = express();
const morgan = require("morgan");
const Persistence = require("./lib/pg-persistence.js");
const persistence = new Persistence(1);
const port = 3002;
const host = "localhost";

app.set("views", "./views");
app.set("view engine", "pug");
app.use(morgan("common"));

app.get("/playlists", async (req, res) => {
  const playlists = await persistence.getPlaylistsInfo();
  console.log("THESE ARE ALL THE PLAYLISTS FOR A USER", playlists);
  res.render("playlists", { playlists });
});

app.listen(port, host, () => {
  console.log(`App is listening on port ${port} of ${host}`);
});
