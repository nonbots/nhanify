const client = require("./pg-connect.js");
const bcrypt = require("bcrypt");

class Persistence {
  async getPublicPlaylists() {
    const statement = `
    SELECT
      users.username,
      playlists.*,
      count(songs.id)
      FROM playlists
      LEFT JOIN "playlists-songs"
      ON "playlists-songs".playlist_id = playlists.id
      LEFT JOIN songs
      ON songs.id = "playlists-songs".song_id
      LEFT JOIN "playlists-users"
      ON "playlists-users".playlist_id = playlists.id
      LEFT JOIN users
      ON users.id = playlists.creator_id
      WHERE playlists.private = false 
      GROUP BY playlists.id, users.username;
   `;
    const result = await client.query(statement);
    return result.rows;
  }
  async getContributors(playlistId) {
    const statement = `
    SELECT users.id, users.username
    FROM users 
    JOIN "playlists-users"
    ON users.id = "playlists-users".user_id
    WHERE "playlists-users".playlist_id = $1`;
    const values = [playlistId];
    const result = await client.query(statement, values);
    return result.rows;
  }
  async deleteContributor(playlistId, contributorId) {
    const statement = `
    DELETE
    FROM "playlists-users" 
    WHERE "playlists-users".playlist_id = $1 AND "playlists-users".user_id = $2`;
    const values = [playlistId, contributorId];
    const result = await client.query(statement, values);
    console.log({ result });
    return result.rowCount;
  }
  /**
   *@param {"public"|"private"} visiability
   */
  async createPlaylist(title, visiability, creatorId) {
    const statement = `INSERT INTO playlists (title, private, creator_id) VALUES ($1, $2, $3) RETURNING id`;
    const isPrivate = visiability !== "public";
    const values = [title, isPrivate, creatorId];
    const playlistResult = await client.query(statement, values);
    const playlistId = playlistResult.rows[0].id;
    const ADDUSERTOPLAYLIST = `INSERT INTO "playlists-users" (playlist_id, user_id) VALUES ($1, $2)`;
    const values3 = [playlistId, creatorId];
    const result3 = await client.query(ADDUSERTOPLAYLIST, values3);
    console.log({ result3 });
    return result3;
  }
  async addContributor(username, playlistId) {
    const GETUSER = `SELECT id FROM users WHERE username = $1`;
    const values2 = [username];
    const sharedUserData = await client.query(GETUSER, values2);
    const sharedUserId = sharedUserData.rows[0].id;
    const ADDUSERTOPLAYLIST = `INSERT INTO "playlists-users" (playlist_id, user_id) VALUES ($1, $2)`;
    const values3 = [playlistId, sharedUserId];
    const result3 = await client.query(ADDUSERTOPLAYLIST, values3);
    return result3.rowCount;
  }

  async createUser(username, password) {
    const hashPassword = await bcrypt.hash(password, 10);
    console.log({ hashPassword });
    const statement = `INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username`;
    const values = [username, hashPassword];
    const result = await client.query(statement, values);
    console.log(result);
    return result.rows[0];
  }

  //query for username and password for login
  /**
   * @param   {string} username
   * @param   {string} password
   * @returns {object | false} - object if username is found otherwise false
   */
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
      count(songs.id)
      FROM playlists
      LEFT JOIN "playlists-songs"
      ON "playlists-songs".playlist_id = playlists.id
      LEFT JOIN songs
      ON songs.id = "playlists-songs".song_id
      LEFT JOIN "playlists-users"
      ON "playlists-users".playlist_id = playlists.id
      LEFT JOIN users
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
