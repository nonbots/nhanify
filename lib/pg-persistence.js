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

  //query for songs associated to the playlist
  async getSongs(playlistId) {
    const statement = `
    SELECT songs.*
    FROM "playlists-songs"
    JOIN songs 
    ON "playlists-songs".song_id = songs.id
    WHERE "playlists-songs".playlist_id = $1;
    `;
    const values = [playlistId];
    const result = await client.query(statement, values);
    return result.rows;
  }

  //query for the total number of songs for each playlist
  async getPlaylistsInfo() {
    const statement = `
    SELECT
    playlists.*,
    count(playlists.id)
    FROM "playlists-songs"
    JOIN songs
    ON "playlists-songs".song_id = songs.id
    JOIN "playlists-users" 
    ON "playlists-users".playlist_id = "playlists-songs".playlist_id
    JOIN playlists 
    ON playlists.id = "playlists-users".playlist_id
    WHERE "playlists-users".user_id = $1
    GROUP BY playlists.id;    
    `;
    const values = [this.userId];
    const result = await client.query(statement, values);
    return result.rows;
  }
}

module.exports = Persistence;
