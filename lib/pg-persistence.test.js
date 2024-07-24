const Persistence = require("./pg-persistence.js");
const persistence = new Persistence();

describe("Persistence", () => {
  const userId = 1;

  beforeEach(() => {
    //remake database
  });
  xtest("Throws an error for duplicated username", async () => {
    expect(async () => {
      await persistence.createUser("username1", "password");
    }).toThrow();
  });

  test("No playlist is return if userId is 2 and trying to access playlist 5", async () => {
    expect(await persistence.getUserAuthorizedPlaylist(5, 2)).toBe(true);
  });

  test("No playlist is return if userId is 1 and trying to access playlist 3", async () => {
    expect(await persistence.getUserAuthorizedPlaylist(3, 1)).toBe(false);
  });

  test("One playlist is return if userId is 1 and trying to access playlist 2", async () => {
    expect(await persistence.getUserAuthorizedPlaylist(2, 1)).toBe(true);
  });

  test("Get playlists that logged in user 1 contributes to", async () => {
    const expected = [
      {
        count: "1",
        username: "username2",
        id: 2,
        title: "playlist2",
        creator_id: 2,
        private: false,
      },
    ];
    expect(await persistence.getContributedPlaylists(1)).toStrictEqual(
      expected,
    );
  });

  test("Get playlists that logged in user 2 contributes to", async () => {
    const expected = [
      {
        count: "3",
        username: "username1",
        id: 1,
        title: "playlist1",
        creator_id: 1,
        private: true,
      },
      {
        count: "1",
        username: "username3",
        id: 3,
        title: "playlist3",
        creator_id: 3,
        private: true,
      },
    ];
    expect(await persistence.getContributedPlaylists(2)).toStrictEqual(
      expected,
    );
  });
  test("Get playlists created by the logged in user 1", async () => {
    const expected = [
      {
        count: "3",
        username: "username1",
        id: 1,
        title: "playlist1",
        creator_id: 1,
        private: true,
      },

      {
        count: "0",
        username: "username1",
        id: 4,
        title: "playlist4",
        creator_id: 1,
        private: true,
      },
    ];
    expect(await persistence.getUserCreatedPlaylists(1)).toStrictEqual(
      expected,
    );
  });

  test("Get playlists created by the logged in user 2", async () => {
    const expected = [
      {
        count: "1",
        username: "username2",
        id: 2,
        title: "playlist2",
        creator_id: 2,
        private: false,
      },

      {
        count: "0",
        username: "username2",
        id: 5,
        title: "playlist5",
        creator_id: 2,
        private: false,
      },
    ];
    expect(await persistence.getUserCreatedPlaylists(2)).toStrictEqual(
      expected,
    );
  });
  test("Get two public playlist records", async () => {
    const expected = [
      {
        count: "0",
        username: "username2",
        id: 5,
        title: "playlist5",
        creator_id: 2,
        private: false,
      },
      {
        count: "1",
        username: "username2",
        id: 2,
        title: "playlist2",
        creator_id: 2,
        private: false,
      },
    ];
    expect(await persistence.getPublicPlaylists()).toStrictEqual(expected);
  });

  test("Get songs of playlist1", async () => {
    const expected = {
      title: "playlist1",
      creator_id: 1,
      private: true,
    };
    expect(await persistence.getPlaylist(1)).toStrictEqual(expected);
  });
  test("Get constributors of playlist1", async () => {
    const expected = {
      songs: [
        {
          title: "title1",
          added_by: "username1",
        },
        {
          added_by: "username2",
          title: "title2",
        },
        {
          added_by: "username2",
          title: "title3",
        },
      ],
      playlistInfo: {
        title: "playlist1",
        creator_id: 1,
        private: true,
      },
    };
    expect(await persistence.getPlaylistInfoSongs(1)).toStrictEqual(expected);
  });

  test("Get constributors of playlist2", async () => {
    const expected = {
      songs: [
        {
          title: "title1",
          added_by: "username1",
        },
      ],
      playlistInfo: {
        title: "playlist2",
        creator_id: 2,
        private: false,
      },
    };
    expect(await persistence.getPlaylistInfoSongs(2)).toStrictEqual(expected);
  });
});
