const Persistence = require("./pg-persistence.js");
const persistence = new Persistence(2);

//async callback function passed to express route
(async () => {
  const user = await persistence.validateUser("username2", "jfkdfdl");
  console.log("THIS IS THE USER", user);
  const playlists = await persistence.getPlaylists();
  console.log("THIS IS ALL THE PLAYLISTS FOR A USER", playlists);
})();
