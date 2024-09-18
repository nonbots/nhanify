# Nhanify

[![NodeJS](https://img.shields.io/badge/Node.js-6DA55F?logo=node.js&logoColor=white)](#) 
[![Express.js](https://img.shields.io/badge/Express.js-%23404d59.svg?logo=express&logoColor=%2361DAFB)](#) 
[![Postgres](https://img.shields.io/badge/Postgres-%23316192.svg?logo=postgresql&logoColor=white)](#) 
[![YouTube](https://img.shields.io/badge/YouTube-%23FF0000.svg?logo=YouTube&logoColor=white)](#)
[![Jest](https://img.shields.io/badge/Jest-C21325?logo=jest&logoColor=fff)](#)

Nhanify allows users to create and share playlists, and collaborate with others to build personalized music collections.

## Table of Contents

- [Nhanify](#nhanify)
  - [Table of Contents](#table-of-contents)
  - [Prerequisites](#prerequisites)
  - [Setup](#setup)
  - [Application Overview](#application-overview)
    - [Features](#features)

## Prerequisites

- [Node.js](https://nodejs.org/en/download/prebuilt-installer) >= 21.7.1
- [PostgreSQL](https://www.postgresql.org/download/) >= 14.13

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
