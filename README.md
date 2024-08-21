##Software Installations
node version: 21.7.1
browser: Chrome 127.0.6533.119
postgreSQL version: 14.13

##Installation Instructions:

1. Install node (this should also install npm).
2. Install postgreSQL (this should come with the psql client).
3. Install all dependencies by executing `npm install`
4. Create an .env file to store senstive information needed for the application such as:

- host
- port
- session secret
- database password
- database name

5. Make the database, schema and seed data by executing `npm run remakedb`.
6. Start the application by executing `npm start`.
7. Open the Chrome browser and navigate to website by inputing the url with the host and port.

##Application Description
This application allows users to share their playlists to other users on the application.
Users can also add contributors, other users on the application, to their playlists which
allow contributors to add, delete and modify songs on the playlists. The application uses
the Youtube Iframe API to play the songs.

The application includes:

1. The `Public Playlists` page

- This page displays all playlists the are made public to all users on the application to view.

2. The `Your Playlists` page

- This page displays all the playlists that the signed in user has created.
- The user can view, create, edit and delete the playlist the playlist here.

3. The `Contribution Playlists` page

- This page displays all the playlist that the signed in user is a contributor of.
- A contributor has the permission to add, delete, edit, and view songs on the playlist.
