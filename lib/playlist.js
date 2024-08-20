function getStartEndPages(totalPages, visiblePageTotal) {
  const startEndPages = [];
  let startPage;
  let endPage;
  let currentPage;
  for (let page = 0; page < totalPages; page++) {
    console.log({ page });
    console.log({ totalPages });
    if (page < visiblePageTotal) {
      startPage = 0;
      endPage = visiblePageTotal - 1;
    } else if (page >= visiblePageTotal) {
      startPage = startEndPages[startEndPages.length - 3] + 1;
      endPage = startEndPages[startEndPages.length - 2] + 1;
    }
    currentPage = page;
    startEndPages.push(startPage, endPage, currentPage);
  }
  return startEndPages;
}

function getUpdatedPlaylist(playlist) {
  const songs = playlist.songs.map((song) => ({
    formattedDuration: getFormattedDuration(Number(song.duration_sec)),
    ...song,
  }));
  return { songs, title: playlist.playlistInfo.title };
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
//https://www.youtube.com/watch?v=_QkGAaYtXA0 --browser
//https://youtu.be/_QkGAaYtXA0?si=ypKoIW-8nJ2grUHZ  -- mobile phone shard copy feature
// https://m.youtube.com/watch?v=rlaNMJeA1EA --shared copy feature browser

function isValidURL(urlInput) {
  let url;
  try {
    url = new URL(urlInput);
  } catch (error) {
    return false;
  }
  const protocol = url.protocol;
  const hostname = url.hostname;
  const pathname = url.pathname;
  const videoId = url.searchParams.get("v");

  if (protocol === "https:" || protocol === "http:") {
    if (
      (hostname === "www.youtube.com" && pathname === "/watch" && videoId) ||
      (hostname === "youtu.be" && pathname) ||
      (hostname === "m.youtube.com" && pathname === "/watch" && videoId)
    )
      return true;
  }
  return false;
}

function isValidRedirectURL(urlInput) {
  console.log("IN ISVALID REDIRECTURL FUNC");
  let url;
  try {
    url = new URL(urlInput);
  } catch (error) {
    return false;
  }
  const protocol = url.protocol;
  const hostname = url.hostname;
  console.log({ hostname });
  if (
    (protocol === "https:" || protocol === "http:") &&
    hostname === "localhost"
  )
    return true;
  return false;
}
//
//valid url
function parseURL(url) {
  console.log({ url });
  if (url.includes("youtu.be")) {
    let parsed = url.split("?")[0];
    let parsed2 = parsed.split("/");
    return parsed2[parsed2.length - 1];
  }
  let stringQuery = url.split("?")[1];
  let params = stringQuery.split("&");
  let videoIdParam = getVideoIdParams(params);
  return videoIdParam.substring(2);
}
function getVideoIdParams(params) {
  for (let i = 0; i < params.length; i += 1) {
    let param = params[i];
    if (param.includes("v=")) return params[i];
  }
}

module.exports = {
  getUpdatedPlaylist,
  getFormattedDuration,
  parseURL,
  isValidURL,
  getStartEndPages,
  isValidRedirectURL,
};
