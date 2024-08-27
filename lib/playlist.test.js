const { parseURL, isValidURL } = require("./playlist.js");

test.each([
  ["https://www.youtube.com/watch?v=_QkGAaYtXA0", "_QkGAaYtXA0"],
  ["https://youtu.be/_QkGAaYtXA0?si=ypKoIW-8nJ2grUHZ", "_QkGAaYtXA0"],
  ["https://m.youtube.com/watch?v=rlaNMJeA1EA", "rlaNMJeA1EA"],
])("Parses %p to $p.", (url, expected) => {
  expect(parseURL(url)).toBe(expected);
});

test.each([
  ["https://www.youtube.com/watch?v=_QkGAaYtXA0", true],
  ["https://youtu.be/_QkGAaYtXA0?si=ypKoIW-8nJ2grUHZ", true],
  ["https://m.youtube.com/watch?v=rlaNMJeA1EA", true],
  ["https://m.youtube.com/watch?v=rlaNMJeA1EA?v=rlaNMJeA1EA", true],
  ["https://m.youtube.com/watch?v=huh", true],
  ["https://m.notyoutube.com/watch?v=rlaNMJeA1EA", false],
  ["socks://m.youtube.com/watch?v=rlaNMJeA1EA", false],
])("%p is valid: %p.", (url, expected) => {
  expect(isValidURL(url)).toBe(expected);
});
