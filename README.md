## Software Installations

1. node version: 21.7.1
2. browser: Chrome 127.0.6533.119
3. postgreSQL version: 14.13

## Systemd Unit for Services

1. Go to the root folder and add the `myserver.service` to your systemd folder.

## Installation Instructions:

1. Install node (this should also install npm).
2. Install postgreSQL (this should come with the psql client).
3. Install all dependencies by executing `npm install` in the terminal.
4. Create the database by executing `createdb databasename` in the terminal.
   You can choose any name for you database. Be sure to include the name in your `.env` in the `PG_DATABASE` field in the next step.
5. Go to the `.env.example` file in the root project folder and make a copy called `.env`.
   Fill the values needed for the application in the copy. Use the database name that you created in the previous step for the `PG_DATABASE` field.
6. Make schema and seed data by executing `psql -d databasename < lib/schema_data.sql` in the terminal. `databasename` is the database name you used to create the database in step 4 and the value for `PG_DATABASE` in step 5.
7. Start the application by executing `npm start`.
8. Open the Chrome browser and navigate to the website by inputing the url with the `HOST` and `PORT`specified in your `.env`.

## Application Description

This application allows users to share their playlists to other users on the application.
Users can also add contributors, other users on the application, to their playlists which
allow contributors to add, delete and modify songs on the playlists. The application uses
the Youtube Iframe API to play the songs.

The application includes:

1. The `Public Playlists` page

- This page displays all playlists the are made public to all users on the application to view.

2. The `Your Playlists` page

- This page displays all the playlists that the signed in user has created.
- The user can view, create, edit and delete the playlist here.
- Once a user clicks on a specific playist within this page, users can:
  - Add contributors to the playlist. These contributors can be anyone that have created an account on the application.
  - View can delete contributors on the `Contributors` page.

3. The `Contribution Playlists` page

- This page displays all the playlists that the signed in user is a contributor of.
- Once a contributor clicks on a specific playlist within this page, the contributor can:
  - Add, delete, edit, and view songs on the playlist.
  - When adding a song, the `Youtube URL` input is constrained to 3 specific hostnames and 2 pathnames.
    1. //https://www.youtube.com/watch?v=_QkGAaYtXA0 (browser)
    2. //https://youtu.be/_QkGAaYtXA0?si=ypKoIW-8nJ2grUHZ (browser shared copy url)
    3. //https://m.youtube.com/watch?v=QkGAaYtXA0 (mobile shared copy url)
