const { Router, json } = require("express");
const apiRouter = Router();
const { NotFoundError, ForbiddenError } = require("../lib/errors.js");
const { YT_API_KEY, NHANIFY_API_KEY } = process.env;
const { getVidInfo, durationSecsToHHMMSS } = require("../lib/playlist.js");
const catchError = require("./catch-error.js");
const { apiAuth } = require("./middleware.js");
let clients = [];

apiRouter.use(json());

apiRouter.get(
  "/playlists/public",
  apiAuth,
  catchError(async (req, res) => {
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
  }),
);

apiRouter.get(
  "/playlists/:id",
  catchError(async (req, res) => {
    const persistence = req.app.locals.persistence;
    const playlist = await persistence.getPublicPlaylist(req.params.id);
    if (!playlist) {
      res.status(404).json({ error: "404" });
      return;
    }
    const result = await persistence.getPlaylistInfoSongs(
      req.params.id,
      0,
      100,
    );
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
  }),
);

apiRouter.get(
  "/users/:id",
  catchError(async (req, res) => {
    const persistence = req.app.locals.persistence;
    const user = await persistence.getUserById(+req.params.id);
    console.log({ user });
    if (!user) {
      res.status(404).json({ error: "404" });
      return;
    }
    res.json({ username: user.username });
  }),
);

apiRouter.post(
  "/playlist/addSong",
  catchError(async (req, res) => {
    //check the API_KEY in nhanify and the passed in API_KEY
    if (`Bearer ${NHANIFY_API_KEY}` !== req.headers.authorization) {
      throw new ForbiddenError();
    }
    // make call to Youtube data api to get video
    //parse for videoId from Yotube URL
    //call to the database to add the song
    /*const persistence = req.app.locals.persistence;
    if (!isValidURL(req.body.url)) {
      res.status(404).json({ msg: "invalid_url" });
      return;
    }*/
    const persistence = req.app.locals.persistence;
    const playlistTitle = "Saved Songs";
    let createdPlaylist;
    let user = await persistence.getUserIdByUsername(req.body.addedBy);
    if (!user) {
      res.status(403).json({ msg: "no_user_account" });
      return;
    }
    const playlist = await persistence.getPlaylistByUserPlaylistName(
      req.body.addedBy,
      playlistTitle,
    );
    if (!playlist) {
      //create the playlist for the user called nhancodes Stream
      createdPlaylist = await persistence.createPlaylist(
        playlistTitle,
        true,
        user.id,
      );
      console.log({ createdPlaylist });
    }
    const vidInfo = await getVidInfo(req.body.url, YT_API_KEY);
    if (!vidInfo) {
      res.status(404).json({ msg: "invalid_video_id" });
      return;
    }
    const playlistId = !createdPlaylist ? playlist.id : createdPlaylist.id;
    try {
      const song = await persistence.addSong(
        vidInfo.title,
        vidInfo.videoId,
        playlistId,
        user.id,
        vidInfo.durationSecs,
      );
      if (song.rowCount === 0) {
        res.status(403).json({ msg: "playlist_max_limit" });
        return;
      }
    } catch (error) {
      if (error.constraint === "unique_video_id_playlist_id") {
        res.status(403).json({ msg: "duplicate_video_id" });
        return;
      }
      throw error;
    }
    //make a query for the added song in the playlist
    const addedSong = await persistence.getSong(vidInfo.videoId, playlistId);
    if (!addedSong) {
      throw new NotFoundError();
    } else {
      console.log({ addedSong });
      // a message to the bot
      // song title, url[video]
      sendEvent({
        title: addedSong.title,
        videoId: addedSong.video_id,
        playlistId: addedSong.playlist_id,
        songId: addedSong.id,
        addedBy: req.body.addedBy,
        duration: durationSecsToHHMMSS(addedSong.duration_sec),
      });
      res.json({ msg: "success", song: addedSong });
      // song title has been added to plsylist title
      // url
    }
  }),
);
apiRouter.get("/event", (req, res) => {
  console.log("IN EVENT");
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Status", "200");
  clients.push(res);
  req.on("close", () => {
    clients = [];
  });
});

function sendEvent(data) {
  console.log("IN SENTEVENT");
  console.log({ clients });
  clients.forEach((client) => {
    console.log({ data });
    try {
      client.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (err) {
      console.error(err);
    }
  });
}

// error handlers
apiRouter.use("*", (req, res, next) => {
  next(new NotFoundError());
});
apiRouter.use((err, req, res, _next) => {
  // do not remove next parameter
  console.log({ err });
  if (req.err instanceof ForbiddenError) {
    res.status(403).json({ error: "403" });
  } else if (err instanceof NotFoundError) {
    res.status(404).json({ error: "404" });
  } else {
    res.status(500).json({ error: "500" });
  }
});
module.exports = { apiRouter };
