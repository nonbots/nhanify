DROP TABLE IF EXISTS playlists_users;

DROP TABLE IF EXISTS songs;

DROP TABLE IF EXISTS playlists;

DROP TABLE IF EXISTS users;

--create a users table
CREATE TABLE users (
  id serial PRIMARY KEY,
  username text NOT NULL,
  password text,
  CONSTRAINT unique_username UNIQUE (username)
);

--create playlists table schema
CREATE TABLE playlists (
  id serial PRIMARY KEY,
  title text NOT NULL,
  creator_id integer NOT NULL REFERENCES users (id),
  private boolean NOT NULL DEFAULT true,
  CONSTRAINT unique_creator_id_title UNIQUE (creator_id, title)
);

--create songs table schema
CREATE TABLE songs (
  id serial PRIMARY KEY,
  title text NOT NULL,
  video_id text NOT NULL,
  playlist_id integer NOT NULL REFERENCES playlists (id) ON DELETE CASCADE,
  creator_id integer NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT unique_video_id_playlist_id UNIQUE (playlist_id, video_id),
  CONSTRAINT unique_title_playlist_id UNIQUE (playlist_id, title)
);

--create a playlists_users table that references playlists and users
CREATE TABLE playlists_users (
  id serial PRIMARY KEY,
  playlist_id integer NOT NULL REFERENCES playlists (id) ON DELETE CASCADE,
  contributor_id integer NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT unique_playlist_id_user_id UNIQUE (playlist_id, contributor_id)
);
