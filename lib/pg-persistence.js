const client = require("./pg-connect.js");
const bcrypt = require("bcrypt");

class Persistence {
  //query for username and password for login
  /**
   * @param   {string} username
   * @param   {string} password
   * @returns {object | false} - object if username is found otherwise false
   */
  async createUser(username, password) {
    const hashPassword = await bcrypt.hash(password, 10);
    console.log({ hashPassword });
    const statement = `INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username`;
    const values = [username, hashPassword];
    const result = await client.query(statement, values);
    console.log(result);
    return result.rows[0];
  }
  async validateUser(username, password) {
    const statement = `SELECT * FROM users WHERE username = $1`;
    const values = [username];
    const result = await client.query(statement, values);
    const user = result.rows[0];
    if (!user) return false;
    const passwordHash = user.password;
    const match = await bcrypt.compare(password, passwordHash);
    if (!match) return false;
    return { id: user.id, username: user.username };
  }

  //query for songs associated to the playlist
  async getPlaylist(playlistId) {
    const statement = `
    SELECT songs.* 
    FROM "playlists-songs"
    JOIN songs 
    ON "playlists-songs".song_id = songs.id
    WHERE "playlists-songs".playlist_id = $1;
    `;
    const values = [playlistId];
    const resultPlaylist = await client.query(statement, values);
    const resultPlaylistTitle = await this.getPlaylistTitle(playlistId);
    console.log("PLAYLISTTITLE", resultPlaylistTitle);
    return {
      songs: resultPlaylist.rows,
      title: resultPlaylistTitle[0].title,
    };
  }

  //query playlists info: title, owner, and total songs
  async getPlaylists(userId) {
    const statement = `
    SELECT
    users.username,
    playlists.*,
    count(playlists.id)
    FROM "playlists-songs"
    JOIN songs
    ON "playlists-songs".song_id = songs.id
    JOIN "playlists-users" 
    ON "playlists-users".playlist_id = "playlists-songs".playlist_id
    JOIN playlists 
    ON playlists.id = "playlists-users".playlist_id
    JOIN users
    ON users.id = playlists.creator_id
    WHERE "playlists-users".user_id = $1
    GROUP BY playlists.id, users.username;    
    `;
    const values = [userId];
    const result = await client.query(statement, values);
    return result.rows;
  }

  async getPlaylistTitle(playlistId) {
    const statement = `SELECT title FROM playlists WHERE id = $1`;
    const values = [playlistId];
    const result = await client.query(statement, values);
    return result.rows;
  }
}

module.exports = Persistence;
