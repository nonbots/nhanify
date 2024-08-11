const client = require("./pg-connect.js");
const bcrypt = require("bcrypt");

class Persistence {
  async getSong(songId) {
    const statement = `SELECT title FROM songs WHERE id = $1`;
    const result = await client.query(statement, [songId]);
    console.log(result);
    return result.rows[0];
  }
  async deleteSong(songId) {
    const statement = `DELETE FROM songs WHERE songs.id = $1`;
    const result = await client.query(statement, [songId]);
    return result.rowCount === 1;
  }
  async addSong(title, url, videoId, playlistId, userId) {
    const statement = `INSERT INTO songs (title, url, video_id, playlist_id, creator_id) VALUES ( $1, $2, $3, $4, $5);`;
    await client.query(statement, [title, url, videoId, playlistId, userId]);
  }
  async getOwnedPlaylist(playlistId, userId) {
    const statement = `
    SELECT * FROM playlists WHERE id = $1 AND creator_id = $2;`;
    const result = await client.query(statement, [playlistId, userId]);
    return result.rowCount === 1;
  }

  async getUserAuthorizedPlaylist(playlistId, userId) {
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

  async getPublicPlaylists(offset, limit) {
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

  async deleteContributor(playlistId, contributorId) {
    const statement = `
    DELETE
    FROM playlists_users 
    WHERE playlists_users.playlist_id = $1 AND playlists_users.contributor_id = $2`;
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
  /**
   *@param {"public"|"private"} visiability
   */
  async createPlaylist(title, visiability, creatorId) {
    const statement = `
    INSERT INTO playlists (title, private, creator_id) 
    VALUES ($1, $2, $3) RETURNING id`;
    const isPrivate = visiability !== "public";
    console.log(title, visiability, creatorId, "IN CREATEPLAYLIST");
    const values = [title, isPrivate, creatorId];
    await client.query(statement, values);
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
    const values = [playlistId, userId];
    try {
      const result = await client.query(ADDUSERTOPLAYLIST, values);
      // will always return true unless an error occurs for insert statements
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
    try {
      const result = await client.query(statement, values);
      return result.rows[0];
    } catch (error) {
      if (error.constraint === "unique_username") return false;
      throw error;
    }
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

  async getSongTotal(playlistId) {
    const statement = `SELECT count(id) FROM songs WHERE playlist_id = $1`;
    const result = await client.query(statement, [playlistId]);
    return result.rows[0];
  }
  async getContributionPlaylistTotal(userId) {
    const statement = `SELECT count(id) FROM playlists_users WHERE contributor_id  = $1`;
    const result = await client.query(statement, [userId]);
    return result.rows[0];
  }
  async getContributorTotal(playlistId) {
    const statement = `SELECT count(id) FROM playlists_users WHERE playlist_id  = $1`;
    const result = await client.query(statement, [playlistId]);
    return result.rows[0];
  }
  async getPublicPlaylistTotal() {
    const statement = `SELECT count(id) FROM playlists WHERE private = $1`;
    const result = await client.query(statement, [false]);
    return result.rows[0];
  }
  async getUserCreatedPlaylistTotal(userId) {
    const statement = `SELECT count(id) FROM playlists WHERE creator_id = $1`;
    const result = await client.query(statement, [userId]);
    return result.rows[0];
  }
  //query playlists created by the logged in user: title, owner, and total songs
  async getUserCreatedPlaylists(userId, offset, limit) {
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
      OFFSET $2 LIMIT $3;
   `;
    const values = [userId, offset, limit];
    const result = await client.query(statement, values);
    return result.rows;
  }

  //query playlists logged in  user contributes to: title, owner, and total songs
  async getContributedPlaylists(userId, offset, limit) {
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
      OFFSET $2 LIMIT $3;
   `;
    const values = [userId, offset, limit];
    const result = await client.query(statement, values);
    return result.rows;
  }

  async getPlaylist(playlistId) {
    const statement = `SELECT title, creator_id, private  FROM playlists WHERE id = $1`;
    const result = await client.query(statement, [playlistId]);
    return result.rows[0];
  }

  async getPlaylistTitle(playlistId) {
    const statement = `SELECT title FROM playlists WHERE id = $1`;
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
  async editPlaylist(playlistId, newTitle, newVisibility) {
    const statement = `UPDATE playlists 
    SET title = $1, 
    private = $2 
    WHERE id = $3;
    `;
    const result = await client.query(statement, [
      newTitle,
      newVisibility,
      playlistId,
    ]);
    console.log({ result });
    return result.rowCount === 1;
  }
}

module.exports = Persistence;
