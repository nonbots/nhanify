const { getFormattedDuration, parseURL, isValidURL } = require("./playlist.js");
xtest.each([
  [2, "00:00:02"],
  [22, "00:00:22"],
  [62, "00:01:02"],
  [600, "00:10:00"],
  [3_600, "01:00:00"],
  [36_000, "10:00:00"],
])("Format duration to HH:MM:SS", (durationSec, expected) => {
  expect(getFormattedDuration(durationSec)).toBe(expected);
});

//https://www.youtube.com/watch?v=_QkGAaYtXA0 --browser
//https://youtu.be/_QkGAaYtXA0?si=ypKoIW-8nJ2grUHZ  -- mobile phone shard copy feature
// https://m.youtube.com/watch?v=rlaNMJeA1EA --shared copy feature browser

test.each([
  ["https://www.youtube.com/watch?v=_QkGAaYtXA0", "_QkGAaYtXA0"],
  ["https://youtu.be/_QkGAaYtXA0?si=ypKoIW-8nJ2grUHZ", "_QkGAaYtXA0"],
  ["https://m.youtube.com/watch?v=rlaNMJeA1EA", "rlaNMJeA1EA"],
])("Parses %p to $p.", (url, expected) => {
  expect(parseURL(url)).toBe(expected);
});

test.each([
  ["https://www.youtube.com/watch?v=_QkGAaYtXA0", true], //X
  ["https://youtu.be/_QkGAaYtXA0?si=ypKoIW-8nJ2grUHZ", true],
  ["https://m.youtube.com/watch?v=rlaNMJeA1EA", true], //X
  ["https://m.youtube.com/watch?v=rlaNMJeA1EA?v=rlaNMJeA1EA", true], //x
  ["https://m.youtube.com/watch?v=huh", true], //X
  ["https://m.notyoutube.com/watch?v=rlaNMJeA1EA", false],
  ["socks://m.youtube.com/watch?v=rlaNMJeA1EA", false],
])("%p is valid: %p.", (url, expected) => {
  expect(isValidURL(url)).toBe(expected);
});
