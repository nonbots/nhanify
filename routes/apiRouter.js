const { Router } = require("express");
const apiRouter = Router();

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

apiRouter.get("/playlists/:id", (req, res) => {
  /*
    check if the playlist id is a public playlist 
        {playlist: {},
        songs: [{}]}
    else 
        return 403 as a response 
   */
});
module.exports = { apiRouter };
