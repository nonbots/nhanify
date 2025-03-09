const { YT_API_KEY } = process.env;

// import in the db client and connect to the database
const setTimeout = require("timers/promises");
const client = require("../lib/pg-connect.js");
const getVidInfoByVidId = require("../lib/playlist.js");
// query the db for all songs where the duration is null
async function getNullDurSong() {
  const result = await client.query(
    "SELECT DISTINCT video_id FROM songs WHERE duration_sec IS NULL",
  );
  return result.rows;
}
(async () => {
  const songs = await getNullDurSong();

  console.log(songs);
  // iterate through the songs and get the video id and pass to the YT Data api
  for (const song of songs) {
    // connecting to the YOUTUBE Data API to grab the duration and return an object containing duration
    const vidInfo = await getVidInfoByVidId(song.video_id, YT_API_KEY); //vidInfo.ducation => sec
    await setTimeout(100);
    console.log(`Title: ${vidInfo.title}`);
    await updateSongDuration(song.video_id, vidInfo.durationSecs);
  }
})();
// insert the duration into the specific record associated with the video id.
async function updateSongDuration(videoId, duration) {
  try {
    await client.query(
      "UPDATE songs SET duration_sec = $1 WHERE video_id = $2",
      [duration, videoId],
    ); //dont bother batching, just blast this bitch fast af boi
    console.log(`${duration} was added to ${videoId} `);
  } catch (err) {
    console.error(`Error updating song ${videoId}`, err);
  }
}
