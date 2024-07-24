DROP TABLE IF EXISTS playlists_songs;

DROP TABLE IF EXISTS playlists_users;

DROP TABLE IF EXISTS songs;

DROP TABLE IF EXISTS playlists;

DROP TABLE IF EXISTS users;

--create a users table
CREATE TABLE users (
  id serial PRIMARY KEY,
  username text NOT NULL,
  password text NOT NULL,
  CONSTRAINT unique_username UNIQUE (username)
);

--create playlists table schema
CREATE TABLE playlists (
  id serial PRIMARY KEY,
  title text NOT NULL,
  creator_id integer NOT NULL REFERENCES users (id),
  private boolean NOT NULL DEFAULT true
);

--create songs table schema
CREATE TABLE songs (
  id serial PRIMARY KEY,
  title text NOT NULL,
  url text NOT NULL,
  video_id text NOT NULL,
  playlist_id integer NOT NULL REFERENCES playlists (id) ON DELETE CASCADE,
  creator_id integer NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT unique_video_id_playlist_id UNIQUE (playlist_id, video_id)
);

--create a playlists_users table that references playlists and users
CREATE TABLE playlists_users (
  id serial PRIMARY KEY,
  playlist_id integer NOT NULL REFERENCES playlists (id) ON DELETE CASCADE,
  contributor_id integer NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT unique_playlist_id_user_id UNIQUE (playlist_id, contributor_id)
);

--insert users into users table 
INSERT INTO
  users (username, password)
VALUES
  (
    'username1',
    '$2a$10$GTVfrqaHC.tSyD0s8IDAcept.aGvZCu3iJMlARsyqe7s2rGwp2FNW'
  ), --p1
  (
    'username2',
    '$2a$10$hmvejnTK.r/AMkHTULeB4epsJ3xK4dYNS4eoZSRsDJTvDFR6z8DnO'
  ), --p2
  (
    'username3',
    '$2a$10$Fp.fqZx4HPprQHNbF4LyAOSGZsrixMU1JXUq0Inez0IqSmrIFZZmO'
  );

--insert playlists into the playlists table
INSERT INTO
  playlists (title, creator_id, private)
VALUES
  ('playlist1', 1, true),
  ('playlist2', 2, false),
  ('playlist3', 3, true),
  ('playlist4', 1, true),
  ('playlist5', 2, false);

--insert songs into the songs table
INSERT INTO
  songs (title, url, video_id, playlist_id, creator_id)
VALUES
  ('title1', 'ur1', 'video_id1', 1, 1),
  ('title2', 'ur2', 'video_id2', 1, 2),
  ('title3', 'ur3', 'video_id3', 1, 2),
  ('title1', 'ur1', 'video_id1', 2, 1),
  ('title3', 'ur3', 'video_id3', 3, 1);

--insert reference to users and playlist into playlists-users table
INSERT INTO
  playlists_users (contributor_id, playlist_id)
VALUES
  (1, 2),
  (2, 1),
  (3, 5),
  (2, 3);
