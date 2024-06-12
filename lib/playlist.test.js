const {getFormattedDuration} = require("./playlist.js");
console.log("WHAT IS THIS", require("./playlist.js"));
test.each([
  [2, "00:00:02"],
  [22, "00:00:22"],
  [62, "00:01:02"],
  [600, "00:10:00"],
  [3_600, "01:00:00"],
  [36_000, "10:00:00"],
])("format duration to HH:MM:SS", (durationSec, expected) => {
  expect(getFormattedDuration(durationSec)).toBe(expected);
});
