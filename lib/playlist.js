/**
 * Is the URL input a valid url by hostname, pathname and is absolute.
 * @params {String} url - The url input.
 * @returns {boolean}
 */
const isValidURL = urlInput => {
  try {
    const { protocol, hostname, pathname, searchParams } = new URL(urlInput);
    const videoId = searchParams.get("v");
    return (
      (protocol === "https:" || protocol === "http:") &&
      (
        (hostname === "www.youtube.com" && pathname === "/watch" && videoId) ||
        (hostname === "youtu.be" && pathname) ||
        (hostname === "m.youtube.com" && pathname === "/watch" && videoId)
      )
    );
  } catch {
    return false;
  }
};


/**
 * Parses the url for the video id.
 * @params {String} URLInput - The url input.
 * @returns {String} - The video id.
 */
const parseURL = url => url.includes("youtu.be") ? url.split("/").pop().split("?")[0] : url.split("v=")[1]?.split("&")[0];

/**
 * Gets the 'v' parameter
 * @params {Array} - The collection of parameter strings.
 * @returns {String} - A 'v' string parameter.
 */
const getVideoIdParams = params => params.find(p => p.includes("v="));


/**
 * Is the URL input a valid url by hostname and is absolute.
 * @params {String} URLInput - The url input.
 * @returns {boolean}
 */
const isValidRedirectURL = urlInput => {
  try {
    const { protocol, hostname } = new URL(urlInput);
    return (protocol === "https:" || protocol === "http:") && hostname === "localhost";
  } catch {
    return false;
  }
};


module.exports = {
  parseURL,
  isValidURL,
  isValidRedirectURL,
};
