const { Router } = require("express");
const apiRouter = Router();
const { NotFoundError } = require("../lib/errors.js");

apiRouter.get("/playlists/public", async (req, res) => {
  const persistence = req.app.locals.persistence;
  const playlists = await persistence.getPublicPlaylistsPage(0, 1000);
  const formattedData = playlists.map((playlist) => {
    return {
      id: playlist.id,
      title: playlist.title,
      creator: { id: playlist.creator_id, username: playlist.username },
      isPrivate: playlist.private,
      songCount: +playlist.count,
    };
  });
  res.json({ playlists: formattedData });
});

apiRouter.get("/playlists/:id", async (req, res) => {
  const persistence = req.app.locals.persistence;
  const playlist = await persistence.getPublicPlaylist(req.params.id);
  if (!playlist) {
    res.status(404).json({ error: "404" });
    return;
  }
  const result = await persistence.getPlaylistInfoSongs(req.params.id, 0, 100);
  const info = result.info;
  const songs = result.songs.map((song) => {
    return {
      id: song.id,
      title: song.title,
      videoId: song.video_id,
      addedBy: song.username,
      durationSec: song.duration_sec,
    };
  });

  res.json({
    id: +req.params.id,
    title: info.title,
    creatorId: info.creator_id,
    isPrivate: info.private,
    songCount: result.songTotal,
    songs,
  });
});

/*async function addSongtoStreamPlaylist(API_KEY, addedBy) {

}
*/
// error handlers
apiRouter.use("*", (req, res, next) => {
  console.log("IN * ROUTE");
  //  req.NotFoundError = new NotFoundError();
  // next();
  next(new NotFoundError());
});
apiRouter.use((err, req, res, _next) => {
  // do not remove next parameter
  console.log({ err });
  if (req.err instanceof NotFoundError) {
    res.status(404).json({ error: "404" });
  } else if (err instanceof NotFoundError) {
    res.status(404).json({ error: "404" });
  } else {
    res.status(500).json({ error: "500" });
  }
});
module.exports = { apiRouter };
