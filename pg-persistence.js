const client = require("./pg-connect.js");

class Persistence {
  constructor(userId) {
    this.userId = userId;
  }

  //query for username and password for login
  async validateUser(username, password) {
    const statement = `SELECT * FROM users WHERE username = $1`;
    const values = [username];
    const result = await client.query(statement, values);
    return result.rows;
  }

  //query for playlist assocaiate with user
  async getPlaylists() {
    const statement = `SELECT
  playlists.id,
  playlists.title,
  playlists.creator_id
FROM
  playlists
  JOIN "playlists-users" ON playlists.id = "playlists-users".playlist_id
WHERE
  "playlists-users".user_id = $1;`;
    const values = [this.userId];
    const result = await client.query(statement, values);
    return result.rows;
  }

  //query for songs associated to the playlist and user
}

module.exports = Persistence;
