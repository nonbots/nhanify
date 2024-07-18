const client = require("./pg-connect.js");
const bcrypt = require("bcrypt");

class Persistence {
  async getOwnedPlaylist(playlistId, userId) {
    const statement = `
    SELECT * FROM playlists WHERE id = $1 AND creator_id = $2;`;
    const result = await client.query(statement, [playlistId, userId]);
    return result.rowCount === 1;
  }

  async getUserAuthorizedPlaylist(playlistId, userId) {
    const statement = `
    SELECT DISTINCT playlists.id  FROM playlists 
    LEFT JOIN playlists_users
    ON playlists.id = playlists_users.playlist_id 
    WHERE (playlists.creator_id = $2 AND playlists.id = $1)
    OR (playlists.private = $3 AND playlists.id = $1)
    OR (playlists_users.playlist_id = $1 AND playlists_users.user_id = $2)`;
    const result = await client.query(statement, [playlistId, userId, false]);
    return result.rowCount === 1;
  }

  async getPublicPlaylists() {
    const statement = `
    SELECT
      users.username,
      playlists.*,
      count(playlists_songs.id)
      FROM playlists
      LEFT JOIN playlists_songs
      ON playlists_songs.playlist_id = playlists.id
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
    JOIN playlists_users
    ON users.id = playlists_users.user_id
    WHERE playlists_users.playlist_id = $1`;
    const values = [playlistId];
    const result = await client.query(statement, values);
    const playlistTitle = await this.getPlaylistTitle(playlistId);
    return {
      contributors: result.rows,
      playlistTitle: playlistTitle,
    };
  }

  async deleteContributor(playlistId, contributorId) {
    const statement = `
    DELETE
    FROM playlists_users 
    WHERE playlists_users.playlist_id = $1 AND playlists_users.user_id = $2`;
    const values = [playlistId, contributorId];
    const result = await client.query(statement, values);
    return result.rowCount === 1;
  }

  async deletePlaylist(playlistId) {
    const statement = `
    DELETE 
    FROM playlists 
    WHERE playlists.id = $1;
    `;
    const result = await client.query(statement, [playlistId]);
    console.log({ result });
    return result.rowCount === 1;
  }

  async deleteContributionPlaylist(playlistId, userId) {
    const statement = `
    DELETE 
    FROM playlists_users 
    WHERE playlists_users.playlist_id = $1 AND playlists_users.user_id = $2;
    `;
    const result = await client.query(statement, [playlistId, userId]);
    return result.rowCount === 1;
  }
  /**
   *@param {"public"|"private"} visiability
   */
  async createPlaylist(title, visiability, creatorId) {
    const statement = `
    INSERT INTO playlists (title, private, creator_id) 
    VALUES ($1, $2, $3) RETURNING id`;
    const isPrivate = visiability !== "public";
    const values = [title, isPrivate, creatorId];
    const playlistResult = await client.query(statement, values);
    return playlistResult.rowCount === 1;
  }

  async getContributor(username) {
    const GETUSER = `SELECT id FROM users WHERE username = $1`;
    const result = await client.query(GETUSER, [username]);
    return result.rows[0];
  }

  async addContributor(userId, playlistId) {
    const ADDUSERTOPLAYLIST = `
      INSERT INTO playlists_users (playlist_id, user_id) 
      VALUES ($1, $2)`;
    const values = [playlistId, userId];
    try {
      const result = await client.query(ADDUSERTOPLAYLIST, values);
      return result.rowCount === 1;
    } catch (error) {
      if (error.constraint === "unique_playlist_id_user_id") return false;
      throw error;
    }
  }

  async createUser(username, password) {
    const hashPassword = await bcrypt.hash(password, 10);
    const statement = `INSERT INTO users (username, password) 
    VALUES ($1, $2) 
    RETURNING id, username`;
    const values = [username, hashPassword];
    const result = await client.query(statement, values);
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
    SELECT songs.title, songs.duration_sec, users.username AS added_by
    FROM playlists_songs
    JOIN songs 
    ON playlists_songs.song_id = songs.id
    JOIN users
    ON users.id = playlists_songs.user_id 
    WHERE playlists_songs.playlist_id = $1;
    `;
    const values = [playlistId];
    const resultPlaylist = await client.query(statement, values);
    const playlistTitle = await this.getPlaylistTitle(playlistId);
    return {
      songs: resultPlaylist.rows,
      title: playlistTitle,
    };
  }

  //query playlists created by the logged in user: title, owner, and total songs
  async getUserCreatedPlaylists(userId) {
    const statement = `
    SELECT
      users.username,
      playlists.*,
      count(playlists_songs.id)
      FROM playlists
      LEFT JOIN playlists_songs
      ON playlists_songs.playlist_id = playlists.id
      LEFT JOIN users
      ON users.id = playlists.creator_id
      WHERE playlists.creator_id = $1
      GROUP BY playlists.id, users.username;
   `;
    const values = [userId];
    const result = await client.query(statement, values);
    return result.rows;
  }

  //query playlists logged in  user contributes to: title, owner, and total songs
  async getContributedPlaylists(userId) {
    const statement = `
    SELECT
      users.username,
      playlists.*,
      count(playlists_songs.id)
      FROM playlists
      LEFT JOIN playlists_songs
      ON playlists_songs.playlist_id = playlists.id
      LEFT JOIN playlists_users
      ON playlists_users.playlist_id = playlists.id
      LEFT JOIN users
      ON users.id = playlists.creator_id
      WHERE playlists_users.user_id = $1 
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
    return result.rows[0].title;
  }
}

module.exports = Persistence;
