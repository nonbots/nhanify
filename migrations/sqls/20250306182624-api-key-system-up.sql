
ALTER TABLE users
ADD COLUMN api_key VARCHAR(206) UNIQUE;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
ALTER DATABASE nhanify SET TIMEZONE TO 'UTC';
CREATE TABLE api_requests (
    id serial PRIMARY KEY,
    user_id integer NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    create_at timestamptz NOT NULL
);