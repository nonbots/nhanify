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
    return false;
  }
}

module.exports = {
  parseURL,
  isValidURL,
  isValidRedirectURL,
};
