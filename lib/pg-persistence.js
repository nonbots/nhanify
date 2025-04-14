const client = require("./pg-connect.js");
const bcrypt = require("bcrypt");
const { KEY } = process.env;

class Persistence {
  async createApiKey(apiKey, userId) {
    const response = await client.query(
      `UPDATE users SET api_key = pgp_sym_encrypt($1, $2) WHERE id = $3`,
      [apiKey, KEY, userId],
    );
    return response.rows[0];
  }
  async decryptedApiKey(userId) {
    const response = await client.query(
      `SELECT pgp_sym_decrypt(api_key::BYTEA, $2) AS decrypted_api_key
      FROM users
      WHERE id = $1`,
      [userId, KEY],
    );
    return response.rows[0];
  }
  async addRequest(userId, maxRequest) {
    console.log("CALLED ADDREQUEST");
    const Query = `
    INSERT INTO api_requests (user_id, create_at) 
    SELECT $1, NOW()
    WHERE (SELECT COUNT(id) FROM api_requests WHERE user_id = $1 AND create_at::date = CURRENT_DATE) < $2
    RETURNING id
    `;
    const result = await client.query(Query, [userId, maxRequest]);
    return result.rows[0];
  }
  /*

SELECT COUNT(*) 
FROM your_table
WHERE user_id = 1 
  AND created_at::date = CURRENT_DATE  -- or use a specific date like '2025-03-12'
  AND EXISTS (
      INSERT INTO your_table (user_id, column1, column2, created_at)
      VALUES (1, 'value1', 'value2', NOW())
      RETURNING 1
  );
  */
  /**
   * Finds and authenicate the user signing in.
   * @param   {string} username - The user's username.
   * @param   {string} password - The user's password.
   * @returns {object | false} - The user object or false.
   */
  async authenticateUser(username, password) {
    const FIND_USER = `SELECT * FROM users WHERE username = $1`;
    const result = await client.query(FIND_USER, [username]);
    const user = result.rows[0];
    if (!user) return false;
    const match = await bcrypt.compare(password, user.password);
    if (!match) return false;
    return user;
  }

  async updateUser(username, twitchId) {
    const FIND_USER = `UPDATE users SET username = $1 WHERE twitch_id = $2 RETURNING *`;
    const result = await client.query(FIND_USER, [username, twitchId]);
    return result.rows[0];
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

  async createUserTwitch(username, twitchId) {
    const CREATE_USER = `INSERT INTO users (username, twitch_id) VALUES ($1, $2) RETURNING id, username`;
    const result = await client.query(CREATE_USER, [username, twitchId]);
    return result.rows[0];
  }

  async getUserIdByUsername(username) {
    const statement = `SELECT id FROM users WHERE username ILIKE $1`;
    const result = await client.query(statement, [username]);
    return result.rows[0];
  }
  /**
   * Creates a playlist.
   * @param {String} title - The title of the playlist.
   * @param {boolean} isPrivate - The visibility of the playlist.
   * @param {number} creatorId - The creator of the playlist.
   * @param {number} maxPlaylists - The maximum number of playlists a user can create. Default is 100.
   * @returns {object} - Object containing the id of the created playlist.
   */
  async createPlaylist(title, isPrivate, creatorId, maxPlaylists = 100) {
    const statement = `
    INSERT INTO playlists (title, private, creator_id) 
    SELECT $1, $2, $3 
    WHERE (SELECT COUNT(*) FROM playlists WHERE creator_id = $3) < $4 RETURNING id`;
    const result = await client.query(statement, [
      title,
      isPrivate,
      creatorId,
      maxPlaylists,
    ]);
    return result.rows[0];
  }

  /**
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
    ORDER BY playlists.title, users.username, count
    OFFSET $1 LIMIT $2;
    `;
    const result = await client.query(statement, [offset, limit]);
    return result.rows;
  }

  /**
   * Gets public playlist total.
   * @returns {object}  - The object containing count property.
   */
  async getPublicPlaylistTotal() {
    const statement = `SELECT count(id) FROM playlists WHERE private = $1`;
    const result = await client.query(statement, [false]);
    return result.rows[0];
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
      ORDER BY playlists.title, count
      OFFSET $2 LIMIT $3;
   `;
    const values = [userId, offset, limit];
    const result = await client.query(statement, values);
    return result.rows;
  }
  /**
   * Gets a user's created playlist total.
   * @params {number} userId - The user's id.
   * @returns {Object}  - The object containing the count property.
   */
  async getYourPlaylistTotal(userId) {
    const statement = `SELECT count(id) FROM playlists WHERE creator_id = $1`;
    const result = await client.query(statement, [userId]);
    return result.rows[0];
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
      ORDER BY playlists.title, users.username, count
      OFFSET $2 LIMIT $3;
   `;
    const values = [userId, offset, limit];
    const result = await client.query(statement, values);
    return result.rows;
  }
  /**
   * Gets a user's contribution playlist total.
   * @params {number} userId - The user's id.
   * @returns {Object}  - The Object containing the count property.
   */
  async getContributionPlaylistTotal(userId) {
    const statement = `SELECT count(id) FROM playlists_users WHERE contributor_id  = $1`;
    const result = await client.query(statement, [userId]);
    return result.rows[0];
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
    const result = await client.query(statement, [
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
  async isReadPlaylistAuthorized(playlistId, userId) {
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

  async getPublicPlaylist(playlistId) {
    const statement = `SELECT * FROM playlists WHERE private = $1 AND id = $2`;
    const result = await client.query(statement, [false, playlistId]);
    return result.rowCount === 1;
  }
  /**
   * Does user have read authorization to playlist.
   * param {number} playlistId - The playlist id.
   * param {number} userId - The user's id.
   * @returns {boolean}
   */
  async isWriteSongAuthorized(playlistId, userId) {
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
  /**
   * Gets the playlist songs, info and song total.
   * param {number} playlistId - The playlist id.
   * @param {number} offset - The starting playlist of a page.
   * @param {number} limit - The number of playlists on a page.
   * @returns {object} - The object of songs collection, playlist info, and song total.
   */
  async getPlaylistInfoSongs(playlistId, offset, limit) {
    const statement = `
    SELECT songs.id, songs.title, songs.video_id,  users.username AS added_by, songs.duration_sec
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

  /**
   * Adds a song.
   * @param {String} title - The title of the playlist.
   * @param {String} videoId  - The video's id.
   * @param {number} playlistId  - The playlist the song is added to.
   * @param {String} addedBy - The user that added the song.
   * @param {number} durationSecs - The duration of the song in seconds.
   * @param {number} maxPlaylistSongs - The maximum number of songs in a playlist. Default is 500.
   * @returns {void | error} - The unique_title_playlist_id or unique_video_id_playlist_id  constraint
   */
  async addSong(title, videoId, playlistId, addedBy, durationSecs, maxPlaylistSongs = 500) {
    const statement = `INSERT INTO songs (title, video_id, playlist_id, creator_id, duration_sec) 
    SELECT $1, $2, $3, $4, $5
    WHERE (SELECT COUNT(*) FROM songs WHERE playlist_id = $3) < $6;`;
    return await client.query(statement, [
      title,
      videoId,
      playlistId,
      addedBy,
      durationSecs,
      maxPlaylistSongs,
    ]);
  }

  /**
   * Gets contributors of a playlist of a page.
   * params {number} playlistId - The playlist's id.
   * @param {number} offset - The starting playlist of a page.
   * @param {number} limit - The number of playlists on a page.
   * @returns {array} - The collection of contributors of a page .
   */
  async getContributorsPage(playlistId, offset, limit) {
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

  /**
   * Gets the total number of songs in a playlist.
   * @param {number} playlstId - The playlist's id.
   * returns {object} - The object containing a count property.
   */
  async getContributorTotal(playlistId) {
    const statement = `SELECT count(id) FROM playlists_users WHERE playlist_id  = $1`;
    const result = await client.query(statement, [playlistId]);
    return result.rows[0];
  }

  /**
   * Gets the title of a song.
   * params {number} songId - The song's id.
   * returns {object} - The object containing title property.
   */
  async getSongTitle(songId) {
    const statement = `SELECT title FROM songs WHERE id = $1`;
    const result = await client.query(statement, [songId]);
    return result.rows[0];
  }

  /**
   * Gets the title and videoId of a song.
   * params {string} videoId - The video's id.
   * returns {object} - The object containing title and videoId property.
   */
  async getSong(videoId, playlistId) {
    const statement = `SELECT title, video_id, id, playlist_id, duration_sec FROM songs WHERE playlist_id = $1 AND video_id = $2`;
    const result = await client.query(statement, [playlistId, videoId]);
    return result.rows[0];
  }

  /**
   * Deletes the song.
   * param {number} songId - The song's id.
   * @returns {boolean} - If the song has been deleted.
   */
  async deleteSong(songId) {
    const statement = `DELETE FROM songs WHERE songs.id = $1`;
    const result = await client.query(statement, [songId]);
    return result.rowCount === 1;
  }

  /**
   * Deletes a contributor.
   * param {number} playlistId - The playlist's id.
   * param {number} contributorId - The contributor's id.
   * @returns {boolean} - If the contributor has been deleted.
   */
  async deleteContributor(playlistId, contributorId) {
    const statement = `
    DELETE
    FROM playlists_users 
    WHERE playlists_users.playlist_id = $1 AND playlists_users.contributor_id = $2`;
    const values = [playlistId, contributorId];
    const result = await client.query(statement, values);
    return result.rowCount === 1;
  }

  /**
   * Deletes a contribution playlist.
   * param {number} playlistId - The playlist's id.
   * param {number} contributorId - The contributor's id.
   * @returns {boolean} - If the contribution playlist has been deleted.
   */
  async deleteContributionPlaylist(playlistId, contributorId) {
    const statement = `
    DELETE 
    FROM playlists_users 
    WHERE playlists_users.playlist_id = $1 AND playlists_users.contributor_id = $2;
    `;
    const result = await client.query(statement, [playlistId, contributorId]);
    return result.rowCount === 1;
  }

  /**
   * Gets a contributor' id.
   * @param {string} username - The contributor's username.
   * @returns {object} - The object containing an id property.
   */
  async getContributor(username) {
    const GETUSER = `SELECT id FROM users WHERE username = $1`;
    const result = await client.query(GETUSER, [username]);
    return result.rows[0];
  }

  /**
   * Adds a contributor.
   * @param {number} contributorId - The contributor's id.
   * @param {number} playlistId - The playlist's id.
   * @returns {void | error} - The unique contributor constraint
   */
  async addContributor(contributorId, playlistId) {
    const ADD_CONTRIBUTOR = `
      INSERT INTO playlists_users (playlist_id, contributor_id) 
      VALUES ($1, $2)
    `;
    await client.query(ADD_CONTRIBUTOR, [playlistId, contributorId]);
  }

  /**
   * Gets the total number of songs in a playlist.
   * @param {number} playlstId - The playlist's id.
   * returns {object} - The object containing a count property.
   */
  async getSongTotal(playlistId) {
    const statement = `SELECT count(id) FROM songs WHERE playlist_id = $1`;
    const result = await client.query(statement, [playlistId]);
    return result.rows[0];
  }

  /**
   * Edits a song
   * @param {number} songId - The song's id.
   * @param {String} newTitle - The new title of the song.
   * @returns {boolean | error} - If song  was edited | The unique_title_playlist_id constraint.
   */
  async editSong(songId, newTitle) {
    const statement = `UPDATE songs SET title = $1 WHERE id = $2;`;
    const result = await client.query(statement, [newTitle, songId]);
    return result.rowCount === 1;
  }
  // for api
  async getUserById(id) {
    const statement = `SELECT * FROM users WHERE id = $1`;
    const result = await client.query(statement, [id]);
    return result.rows[0];
  }
  async getPlaylistByUserPlaylistName(username, playlistName) {
    console.log({ username, playlistName });
    const statement = `SELECT playlists.id FROM users JOIN playlists ON users.id = playlists.creator_id WHERE lower(users.username) = $1 AND playlists.title = $2`;
    const result = await client.query(statement, [username, playlistName]);
    return result.rows[0];
  }

  /**
   *@param {number []} playlistIds - The collection of playlist ids.
   * Gets a page of playlists by id in alphabetical order.
   * @returns {array} - The collection of song objects on a page.
   */
  async getPlaylistsByIdPage(playlistIds) {
    const indexValues = playlistIds
      .map((__, index) => `$${index + 1}`)
      .join(",");
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
    WHERE playlists.id IN (${indexValues})
    GROUP BY playlists.id, users.username
    ORDER BY playlists.title, users.username, count
    `;
    const result = await client.query(statement, playlistIds);
    return result.rows;
  }
}

module.exports = Persistence;
