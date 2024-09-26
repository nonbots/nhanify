async function getVidInfo(vidUrl, YT_API_KEY) {
  const videoId = parseURL(vidUrl);
  return await getVidInfoByVidId(videoId, YT_API_KEY);
}

async function getVidInfoByVidId(videoId, YT_API_KEY) {
  const headers = { headers: { Accept: "application/json" } };
  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.search = new URLSearchParams({
    key: YT_API_KEY,
    id: videoId,
    part: ["snippet", "contentDetails"],
  }).toString();
  const response = await fetch(url, headers);
  const result = await response.json();
  if (!result.items[0]) return null;
  const duration = convertDuration(result.items[0].contentDetails.duration);
  const durationSecs = convertToSec(duration);
  const vidInfo = {
    title: result.items[0].snippet.title,
    videoId: result.items[0].id,
    durationSecs,
  };
  return vidInfo;
}

function durationSecsToHHMMSS(secs) {
  const hrs = Math.floor(secs / 3600);
  secs -= hrs * 3600;
  const mins = Math.floor(secs / 60);
  secs -= mins * 60;
  const formatTime = `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  return formatTime;
}

function convertDuration(duration) {
  const numStrs = ["00", "00", "00"];
  const durationStr = duration.split("T")[1];
  let numStr = "";

  durationStr.split("").forEach((char) => {
    if (!Number.isNaN(Number(char))) {
      numStr += char;
    } else {
      if (char === "H" && numStr.length === 1) numStrs[0] = "0" + numStr;
      if (char === "H" && numStr.length === 2) numStrs[0] = numStr;
      if (char === "M" && numStr.length === 1) numStrs[1] = "0" + numStr;
      if (char === "M" && numStr.length === 2) numStrs[1] = numStr;
      if (char === "S" && numStr.length === 1) numStrs[2] = "0" + numStr;
      if (char === "S" && numStr.length === 2) numStrs[2] = numStr;
      numStr = "";
    }
  });
  return numStrs.join(":");
  //input "12:04:23"
}

function convertToSec(duration) {
  //input "12:04:23"
  const numArr = duration.split(":").map((numStr) => Number(numStr));
  return (numArr[0] * 60 + numArr[1]) * 60 + numArr[2];
}
/**
 * Is the URL input a valid url by hostname, pathname and is absolute.
 * @params {String} url - The url input.
 * @returns {boolean}
 */
function isValidURL(URLInput) {
  try {
    const url = new URL(URLInput);
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
  } catch (error) {
    console.error(error);
    return false;
  }
}

/**
 * Parses the url for the video id.
 * @params {String} URLInput - The url input.
 * @returns {String} - The video id.
 */
function parseURL(URLInput) {
  if (URLInput.includes("youtu.be")) {
    let hostPath = URLInput.split("?")[0];
    let path = hostPath.split("/");
    return path[path.length - 1];
  }
  let queryStr = URLInput.split("?")[1];
  let params = queryStr.split("&");
  let videoIdParam = getVideoIdParams(params);
  return videoIdParam.substring(2);
}

/**
 * Gets the 'v' parameter
 * @params {Array} - The collection of parameter strings.
 * @returns {String} - A 'v' string parameter.
 */
function getVideoIdParams(params) {
  for (let i = 0; i < params.length; i += 1) {
    let param = params[i];
    if (param.includes("v=")) return params[i];
  }
}

/**
 * Is the URL input a valid url by hostname and is absolute.
 * @params {String} URLInput - The url input.
 * @returns {boolean}
 */
function isValidRedirectURL(URLInput) {
  try {
    const url = new URL(URLInput);
    const protocol = url.protocol;
    const hostname = url.hostname;
    if (
      (protocol === "https:" || protocol === "http:") &&
      hostname === "localhost"
    )
      return true;
    return false;
  } catch (error) {
    console.error(error);
    return false;
  }
}

module.exports = {
  parseURL,
  isValidURL,
  isValidRedirectURL,
  durationSecsToHHMMSS,
  getVidInfo,
  getVidInfoByVidId,
};
