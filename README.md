## Prerequisites

- Node.js >= 21.7.1
- Chrome >= 127.0.6533.119
- PostgreSQL >= 14.13

## Setup

1. **Systemd**: Copy `myserver.service` to your systemd folder (if you want to host the application on a remote or local server).
2. **Install Node.js & PostgreSQL**: Ensure both are installed, with `npm` and `psql` available.
3. **Install Dependencies**: Run `npm install` in the project root.
4. **Create DB**: Run `createdb <databasename>`, and add it to `PG_DATABASE` in `.env`.
5. **Configure Environment**:
   - Copy `.env.example` to `.env`.
   - Update DB details in `.env`.
6. **Setup DB**: Run `psql -d <databasename> < lib/schema_data.sql` to load schema and seed data.
7. **Start App**: Run `npm start`.
8. **Access**: Open Chrome at the `HOST:PORT` defined in `.env`.

## Application Overview

This app lets users share and collaborate on playlists, with song playback via the YouTube Iframe API.

### Features

1. **Public Playlists**: Lists all public playlists.
2. **Your Playlists**:
   - View, create, edit, delete playlists.
   - Add/remove contributors (must be registered users).
3. **Contribution Playlists**:
   - Manage playlists where you're a contributor (add, delete, edit songs).
   - Accepts specific YouTube URLs:
     - `https://www.youtube.com/watch?v=...`
     - `https://youtu.be/...`
     - `https://m.youtube.com/watch?v=...`

## License

Licensed under either of

 * Apache License, Version 2.0
   ([LICENSE-APACHE](LICENSE-APACHE) or http://www.apache.org/licenses/LICENSE-2.0)
 * MIT license
   ([LICENSE-MIT](LICENSE-MIT) or http://opensource.org/licenses/MIT)

at your option.

See [LICENSE-APACHE](LICENSE-APACHE), [LICENSE-MIT](LICENSE-MIT), and [COPYRIGHT](COPYRIGHT) for details.

## Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted
for inclusion in the work by you, as defined in the Apache-2.0 license, shall be
dual licensed as above, without any additional terms or conditions.
