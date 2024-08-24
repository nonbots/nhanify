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

--insert users into users table 
INSERT INTO
  users (username, password)
VALUES
  (
    'username1',
    '$2a$10$NinAy8ZyKH88U4Jh7.bX3OUL0XtTxlGbha3Z8URgMPyvrRgyZZZ0C'
  ), -- user1password
  (
    'username2',
    '$2a$10$usDBfagJthfpsBuKzKml8OxwMhYilQmhlqPgb9s5ZRL2CQmVwIIRy'
  ), -- user2password
  (
    'username3',
    '$2a$10$I7W1NEs.LA6Yqls0hP7XOezfFuq6ZL4PYAscYdcV3j/GKyfx9G1wC'
  ), -- user3password 
  (
    'username4',
    '$2a$10$Ys4wO1EueQsMiRf1cW5VduPz4MpN98rolmuP2eufnW9ktwZR4gBhS'
  ), -- user4password 
  (
    'username5',
    '$2a$10$cjmOHXGv8ku4FKni5E9JGud3K.bhe1X9Q5g3vRg.0HMSj3fBG1fy.'
  ), -- user5password 
  (
    'username6',
    '$2a$10$cKNnwbpI0EqT.pOUBk66qOunzbJ7EZJgLTRlR/R836NUOvbqwCauS'
  );

-- user6password 
--insert playlists into the playlists table
INSERT INTO
  playlists (title, creator_id, private)
VALUES
  ('Lofi', 1, false),
  ('Gym', 1, false),
  ('Chill & Relaxing', 1, false),
  ('Party', 1, false),
  ('Coding', 1, false),
  ('Christmas Jams', 1, false),
  ('Twitch Stream', 1, false),
  ('Focus Study', 2, false),
  ('Dance Class', 3, false),
  ('Date Night', 4, true),
  ('Summer Jam', 5, true);

--insert reference to users and playlist into playlists-users table
INSERT INTO
  playlists_users (contributor_id, playlist_id)
VALUES
  (1, 8),
  (1, 9),
  (1, 11),
  (2, 7),
  (3, 7),
  (4, 7),
  (5, 7),
  (6, 7),
  (2, 1);

--insert songs into the songs table
INSERT INTO
  songs (title, video_id, playlist_id, creator_id)
VALUES
  ('Chilling In Tokyo', 'y7qZFji19Rg', 1, 1),
  ('Good Days', 'L9VcK_pT1Y4', 1, 1),
  ('Just With My Guitar', 'M0ecZFXs-VM', 1, 1),
  ('Spring Nights', 'InZxeDWR-hQ', 1, 1),
  ('Eternal Youth', '_BWPNPtsZm8', 1, 1),
  ('Blankets', 'HdXrkgZP438', 1, 1),
  ('Dreaming', 'DFVuYoDVS_g', 1, 2),
  ('Pink - Raise Your Glass', 'XjVNlG5cZyQ', 2, 2),
  (
    'Kudasaibeats - The Girl I Haven''t Met',
    'XDpoBc8t6gE',
    7,
    3
  ),
  (
    'Miley Cyrus - Party In The USA',
    'M11SvDtPBhA',
    4,
    4
  ),
  ('Mad Animal - L.A. Dreamin', 'leannVmCjeo', 5, 5),
  (
    'Christmas, Why Can''t Find You?',
    'T-urD17dbDU',
    6,
    6
  ),
  (
    'The Darkness - Love is Only a Feeling',
    'QSGa1dW_KoE',
    7,
    6
  ),
  ('Blue Heart', 'Dui7KB8y-Ro', 7, 6),
  (
    'Chúng Ta Không Thuộc Về Nhau',
    'qGRU3sRbaYw',
    7,
    1
  ),
  (
    'Jacob Collier - Little Blue',
    'IQvzX0Z3HE4',
    7,
    2
  ),
  ('Stick Figure - Paradise', 'qvzFphdCYHo', 7, 3),
  ('Queen - Under Pressure', 'a01QQZyl-_I', 7, 4),
  ('Watermelon Man', '_QkGAaYtXA0', 7, 5),
  ('XX-Intro', 'QbwdJl8TGeY', 7, 1),
  (
    'Should I Stay or Should I Go',
    'BN1WwnEDWAM',
    7,
    1
  );
