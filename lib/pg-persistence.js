const client = require("./pg-connect.js");
const bcrypt = require("bcrypt");

class Persistence {

  /**
   * Finds and authenicate the user signing in.
   * @param   {string} username - The user's username.
   * @param   {string} password - The user's password.
   * @returns {object | false} - The user object or false.
   */
  async authenticateUser(username, password) {
    const FIND_USER  = `SELECT * FROM users WHERE username = $1`;
    const result = await client.query(FIND_USER, [username]);
    const user = result.rows[0];
    if (!user) return false;
    const match = await bcrypt.compare(password, user.password);
    if (!match) return false;
    return user;
  }

/**
 * Creates a user account.
 * @param {string} username - The user's username.
 * @param {string} password - The user's password.
 * @returns {object | error} - The user object or unique_username constraint.
 */
  async createUser(username, password) {
    const hashPassword = await bcrypt.hash(password, 10);
    const CREATE_USER = `INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username`;
    const result = await client.query(CREATE_USER, [username, hashPassword]);
    return result.rows[0];
  }

  /**
   * Creates a playlist.
   * @param {String} title - The title of the playlist.
   * @param {boolean} isPrivate - The visibility of the playlist.
   * @param {number} creatorId - The creator of the playlist.
   * @returns {void | error} - The unique_creator_id_title constraint 
   */
  async createPlaylist(title, isPrivate, creatorId) {
    const statement = `
    INSERT INTO playlists (title, private, creator_id) 
    VALUES ($1, $2, $3) RETURNING id`;
    await client.query(statement, [title, isPrivate, creatorId]);
  }

  /*
   * Gets a page of public playlists in alphabetical order.
   * @param {number} offset - The starting playlist of a page.
   * @param {number} limit - The number of playlists on a page.
   * @returns {array} - The collection of song objects on a page.
   */
  async getPublicPlaylistsPage(offset, limit) {
    const statement = `
    SELECT
      users.username,
      playlists.*,
      count(songs.id)
    FROM playlists
    LEFT JOIN songs
    ON songs.playlist_id = playlists.id
    LEFT JOIN users
    ON users.id = playlists.creator_id
    WHERE playlists.private = false 
    GROUP BY playlists.id, users.username
    ORDER BY playlists.title, users.username
    OFFSET $1 LIMIT $2;
    `;
    const result = await client.query(statement, [offset, limit]);
    return result.rows;
  }

  /**
   * Gets a user's public playlist total.
   * @params {number} userId - The user's id.
   * @returns {number}  - The total count.
   */
  async getPublicPlaylistTotal() {
    const statement = `SELECT count(id) FROM playlists WHERE private = $1`;
    const result = await client.query(statement, [false]);
    return result.rows[0].count;
  }

  /**
   * Gets a page of the user's created playlists in alphabetical order.
   * @param {number} userId - The user's id.
   * @param {number} offset - The starting playlist of a page.
   * @param {number} limit - The number of playlists on a page.
   * @returns {array} - The collection of song objects on a page.
   */
  async getYourPlaylistsPage(userId, offset, limit) {
    const statement = `
    SELECT
      users.username,
      playlists.*,
      count(songs.id)
      FROM playlists
      LEFT JOIN songs
      ON songs.playlist_id = playlists.id
      LEFT JOIN users
      ON users.id = playlists.creator_id
      WHERE playlists.creator_id = $1
      GROUP BY playlists.id, users.username
      ORDER BY playlists.title
      OFFSET $2 LIMIT $3;
   `;
    const values = [userId, offset, limit];
    const result = await client.query(statement, values);
    return result.rows;
  }
  /**
   * Gets a user's created playlist total.
   * @params {number} userId - The user's id.
   * @returns {number}  - The total count.
   */
  async getYourPlaylistTotal(userId) {
    const statement = `SELECT count(id) FROM playlists WHERE creator_id = $1`;
    const result = await client.query(statement, [userId]);
    return result.rows[0].count;
  }

  /**
   * Gets a page of the user's contribution playlists in alphabetical order.
   * @param {number} userId - The user's id.
   * @param {number} offset - The starting playlist of a page.
   * @param {number} limit - The number of playlists on a page.
   * @returns {array} - The collection of song objects on a page.
   */
  async getContributionPlaylistsPage(userId, offset, limit) {
    const statement = `
    SELECT
      users.username,
      playlists.*,
      count(songs.id)
      FROM playlists
      LEFT JOIN songs
      ON songs.playlist_id = playlists.id
      LEFT JOIN playlists_users
      ON playlists_users.playlist_id = playlists.id
      LEFT JOIN users
      ON users.id = playlists.creator_id
      WHERE playlists_users.contributor_id = $1 
      GROUP BY playlists.id, users.username
      ORDER BY playlists.title, users.username
      OFFSET $2 LIMIT $3;
   `;
    const values = [userId, offset, limit];
    const result = await client.query(statement, values);
    return result.rows;
  }
  /**
   * Gets a user's contribution playlist total.
   * @params {number} userId - The user's id.
   * @returns {number}  - The total count.
   */
  async getContributionPlaylistTotal(userId) {
    const statement = `SELECT count(id) FROM playlists_users WHERE contributor_id  = $1`;
    const result = await client.query(statement, [userId]);
    return result.rows[0].count;
  }

  /**
   * Is the playlist created by the user.
   * @param {number} playlistId - The playlist's id.
   * @param {number} userId - The user's id.
   * @returns {boolean} 
   */
  async isYourPlaylist(playlistId, userId) {
    const statement = `
    SELECT * FROM playlists WHERE id = $1 AND creator_id = $2;`;
    const result = await client.query(statement, [playlistId, userId]);
    return result.rowCount === 1;
  }

  /**
   * Edits a playlist.
   * @param {number} playlistId - The playlist's id.
   * @param {String} newTitle - The new title of the playlist.
   * @param {boolean} isPrivate - The visibility of the playilst.
   * @returns {boolean \ error} - If palylist was edited | The unique_creator_id_title constraint.
   */
  async editPlaylist(playlistId, newTitle, isPrivate) {
    const statement = `
    UPDATE playlists 
    SET title = $1, 
    private = $2 
    WHERE id = $3;
    `;
    const result =  await client.query(statement, [
      newTitle,
      isPrivate,
      playlistId,
    ]);
    return result.rowCount === 1;
  }
  /**
   * Gets the playlist title.
   * param {number} playlistId - The playlist's id.
   * @returns {object} - Object containing title property.
   */
  async getPlaylistTitle(playlistId) {
    const statement = `SELECT title FROM playlists WHERE id = $1`;
    const result = await client.query(statement, [playlistId]);
    return result.rows[0];
  }

  /**
   * Gets the playlist.
   * param {number} playlistId - The playlist's id.
   * @returns {object} - The playlist object.
   */
  async getPlaylist(playlistId) {
    const statement = `SELECT title, creator_id, private  FROM playlists WHERE id = $1`;
    const result = await client.query(statement, [playlistId]);
    return result.rows[0];
  }

  /**
   * Deletes the playlist.
   * param {number} playlistId - The playlist's id.
   * @returns {boolean} - If the playlist has been deleted.
   */
  async deletePlaylist(playlistId) {
    const statement = `
    DELETE 
    FROM playlists 
    WHERE playlists.id = $1;
    `;
    const result = await client.query(statement, [playlistId]);
    return result.rowCount === 1;
  }

  /**
   * Does user have read authorization to playlist.
   * param {number} playlistId - The playlist id.
   * param {number} userId - The user's id.
   * @returns {boolean} 
   */
  async isReadAuthorizedPlaylist(playlistId, userId) {
    const statement = `
    SELECT DISTINCT playlists.id  
    FROM playlists 
    LEFT JOIN playlists_users
    ON playlists.id = playlists_users.playlist_id 
    WHERE (playlists.creator_id = $2 AND playlists.id = $1)
    OR (playlists.private = $3 AND playlists.id = $1)
    OR (playlists_users.playlist_id = $1 AND playlists_users.contributor_id = $2)`;
    const result = await client.query(statement, [playlistId, userId, false]);
    return result.rowCount === 1;
  }
  /**
   * Gets the playlist songs, info and song total.
   * param {number} playlistId - The playlist id.
   * @param {number} offset - The starting playlist of a page.
   * @param {number} limit - The number of playlists on a page.
   * @returns {object} - The object of songs collection, playlist info, and song total.
   */
  async getPlaylistInfoSongs(playlistId, offset, limit) {
    const statement = `
    SELECT songs.id, songs.title, songs.video_id,  users.username AS added_by
    FROM playlists
    JOIN songs 
    ON playlists.id = songs.playlist_id
    JOIN users
    ON users.id = songs.creator_id 
    WHERE songs.playlist_id = $1
    ORDER BY songs.title, users.username
    OFFSET $2 LIMIT $3; 
    `;
    const values = [playlistId, offset, limit];
    const resultPlaylist = await client.query(statement, values);
    const playlist = await this.getPlaylist(playlistId);
    const countRow = await this.getSongTotal(playlistId);
    return {
      songs: resultPlaylist.rows,
      info: playlist,
      songTotal: countRow.count,
    };
  }

  async getContributors(playlistId, offset, limit) {
    const statement = `
    SELECT users.id, users.username
    FROM users 
    JOIN playlists_users
    ON users.id = playlists_users.contributor_id
    WHERE playlists_users.playlist_id = $1
    ORDER BY users.username
    OFFSET $2 LIMIT $3`;
    const values = [playlistId, offset, limit];
    const result = await client.query(statement, values);
    const playlist = await this.getPlaylist(playlistId);
    return {
      contributors: result.rows,
      playlistTitle: playlist.title,
    };
  }
  async getContributorTotal(playlistId) {
    const statement = `SELECT count(id) FROM playlists_users WHERE playlist_id  = $1`;
    const result = await client.query(statement, [playlistId]);
    return result.rows[0];
  }
  async getSong(songId) {
    const statement = `SELECT title FROM songs WHERE id = $1`;
    const result = await client.query(statement, [songId]);
    return result.rows[0];
  }
  async deleteSong(songId) {
    const statement = `DELETE FROM songs WHERE songs.id = $1`;
    const result = await client.query(statement, [songId]);
    return result.rowCount === 1;
  }
  async addSong(title, videoId, playlistId, userId) {
    const statement = `INSERT INTO songs (title, video_id, playlist_id, creator_id) VALUES ( $1, $2, $3, $4);`;
    await client.query(statement, [title, videoId, playlistId, userId]);
  }

  async getUserAuthorizedWrite(playlistId, userId) {
    const statement = `
    SELECT DISTINCT playlists.id  
    FROM playlists 
    LEFT JOIN playlists_users
    ON playlists.id = playlists_users.playlist_id 
    WHERE (playlists.creator_id = $2 AND playlists.id = $1)
    OR (playlists_users.playlist_id = $1 AND playlists_users.contributor_id = $2)`;
    const result = await client.query(statement, [playlistId, userId]);
    return result.rowCount === 1;
  }

  async deleteContributor(playlistId, contributorId) {
    const statement = `
    DELETE
    FROM playlists_users 
    WHERE playlists_users.playlist_id = $1 AND playlists_users.contributor_id = $2`;
    const values = [playlistId, contributorId];
    const result = await client.query(statement, values);
    return result.rowCount === 1;
  }


  async deleteContributionPlaylist(playlistId, userId) {
    const statement = `
    DELETE 
    FROM playlists_users 
    WHERE playlists_users.playlist_id = $1 AND playlists_users.contributor_id = $2;
    `;
    const result = await client.query(statement, [playlistId, userId]);
    console.log({ result }, "IN THE PG METHOD");
    return result.rowCount === 1;
  }

  async getContributor(username) {
    const GETUSER = `SELECT id FROM users WHERE username = $1`;
    const result = await client.query(GETUSER, [username]);
    return result.rows[0];
  }
  async getPublicPlaylist(playlistId) {
    const statement = ` 
    SELECT * FROM playlists WHERE id = $1 AND private = $2`;
    const result = await client.query(statement, [playlistId, false]);
    return result.rowCount === 1;
  }
  async addContributor(userId, playlistId) {
    const ADDUSERTOPLAYLIST = `
      INSERT INTO playlists_users (playlist_id, contributor_id) 
      VALUES ($1, $2)`;
      await client.query(ADDUSERTOPLAYLIST, [playlistId, userId]);
  }


  async getSongTotal(playlistId) {
    const statement = `SELECT count(id) FROM songs WHERE playlist_id = $1`;
    const result = await client.query(statement, [playlistId]);
    return result.rows[0];
  }

  async getSongCount(playlistId) {
    const statement = `SELECT count(id) FROM songs WHERE playlist_id = $1`;
    const result = await client.query(statement, [playlistId]);
    return result.rows[0];
  }

  async editSong(songId, newTitle) {
    const statement = `UPDATE songs 
    SET title = $1 
    WHERE id = $2;
    `;
    const result = await client.query(statement, [newTitle, songId]);
    return result.rowCount === 1;
  }
}

module.exports = Persistence;
