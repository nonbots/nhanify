DROP TABLE IF EXISTS "playlists-songs";

DROP TABLE IF EXISTS "playlists-users";

DROP TABLE IF EXISTS songs;

DROP TABLE IF EXISTS playlists;

DROP TABLE IF EXISTS users;

--create songs table schema
CREATE TABLE songs (
  id serial PRIMARY KEY,
  title text NOT NULL,
  url text NOT NULL,
  video_id text NOT NULL,
  formatted_duration text NOT NULL,
  ms_duration bigint NOT NULL,
  username text NOT NULL
);

--create a users table
CREATE TABLE users (
  id serial PRIMARY KEY,
  username text NOT NULL,
  password text NOT NULL
);

--create playlists table schema
CREATE TABLE playlists (
  id serial PRIMARY KEY,
  title text NOT NULL,
  creator_id integer NOT NULL REFERENCES users (id)
);

--create playlists-songs table
CREATE TABLE "playlists-songs" (
  id serial PRIMARY KEY,
  song_id integer NOT NULL REFERENCES songs (id),
  playlist_id integer NOT NULL REFERENCES playlists (id)
);

--create a playlists-users table that references playlists and users
CREATE TABLE "playlists-users" (
  id serial PRIMARY KEY,
  playlist_id integer NOT NULL REFERENCES playlists (id),
  user_id integer NOT NULL REFERENCES users (id)
);

--insert songs into the songs table
INSERT INTO
  songs (
    title,
    url,
    video_id,
    formatted_duration,
    ms_duration,
    username
  )
VALUES
  (
    'title1',
    'ur1',
    'video_id',
    'formatted_duration1',
    4324232,
    'username1'
  ),
  (
    'title2',
    'ur2',
    'video_id2',
    'formatted_duration2',
    234324324,
    'username2'
  ),
  (
    'title3',
    'ur3',
    'video_id3',
    'formatted_duration3',
    4332432432,
    'username3'
  );

--insert users into users table 
INSERT INTO
  users (username, password)
VALUES
  ('username1', 'jdfldjlasf'),
  ('username2', 'dfjdslf'),
  ('username3', 'dttrkt');

--query songs table
SELECT
  *
FROM
  songs;

--insert playlists into the playlists table
INSERT INTO
  playlists (title, creator_id)
VALUES
  ('playlist1', 1),
  ('playlist2', 2),
  ('playlist3', 3);

--insert references to songs and playlists in songs playlists table
INSERT INTO
  "playlists-songs" (playlist_id, song_id)
VALUES
  (1, 1),
  (1, 2),
  (1, 3),
  (2, 1),
  (3, 3);

--insert reference to users and playlist into playlists-users table
INSERT INTO
  "playlists-users" (user_id, playlist_id)
VALUES
  (1, 1),
  (1, 2),
  (2, 1),
  (3, 3);

-- query for songs that belong to playlist1
SELECT
  songs.*
FROM
  "playlists-songs"
  JOIN songs ON "playlists-songs".song_id = songs.id
WHERE
  "playlists-songs".playlist_id = 1;

--query for playlists that user1 has access to or shares 
SELECT
  playlists.*
FROM
  playlists
  JOIN "playlists-users" ON playlists.id = "playlists-users".playlist_id
WHERE
  "playlists-users".user_id = 1;

--query total songs associated to the playlist and the user
SELECT
  count(*)
FROM
  "playlists-songs"
WHERE
  playlist_id = 1;

--query total songs for each playlist 
SELECT
  "playlists-songs".playlist_id,
  count("playlists-songs".playlist_id)
FROM
  "playlists-songs"
  JOIN songs ON "playlists-songs".song_id = songs.id
  JOIN "playlists-users" ON "playlists-users".playlist_id = "playlists-songs".playlist_id
WHERE
  "playlists-users".user_id = 1
GROUP BY
  "playlists-songs".playlist_id;

--query playlist info 
SELECT
  playlists.*,
  count(playlists.id)
FROM
  "playlists-songs"
  JOIN songs ON "playlists-songs".song_id = songs.id
  JOIN "playlists-users" ON "playlists-users".playlist_id = "playlists-songs".playlist_id
  JOIN playlists ON playlists.id = "playlists-users".playlist_id
  JOIN users ON users.id = "playlists_users".user_id
WHERE
  "playlists-users".user_id = 1
GROUP BY
  playlists.id;
