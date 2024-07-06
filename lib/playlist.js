function getUpdatedPlaylist(playlist) {
  const songs = playlist.songs.map((song) => ({
    formattedDuration: getFormattedDuration(Number(song.duration_sec)),
    ...song,
  }));
  console.log({ songs });
  return { songs, title: playlist.title };
}

function getFormattedDuration(duration) {
  let seconds = duration;
  const hours = String(Math.floor(seconds / 3_600)).padStart(2, "0");
  seconds -= hours * 3_600;
  const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
  seconds -= minutes * 60;
  seconds = String(seconds).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

module.exports = { getUpdatedPlaylist, getFormattedDuration };
