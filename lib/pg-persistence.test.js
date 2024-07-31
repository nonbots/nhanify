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
        count: "8",
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
        count: "8",
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
  test("Get contributors of playlist1", async () => {
    const expected = {
      songs: [
        {
          added_by: "username1",
          id: 1,
          title: "Blue Heart",
          video_id: "Dui7KB8y-Ro",
        },
        {
          added_by: "username2",
          id: 2,
          title: "Chúng Ta Không Thuộc Về Nhau",
          video_id: "qGRU3sRbaYw",
        },
        {
          added_by: "username2",
          id: 3,
          title: "Jacob Collier - Little Blue",
          video_id: "IQvzX0Z3HE4",
        },
        {
          added_by: "username1",
          id: 4,
          title: "Stick Figure - Paradise",
          video_id: "qvzFphdCYHo",
        },
        {
          added_by: "username1",
          id: 5,
          title: "Queen - Under Pressure",
          video_id: "a01QQZyl-_I",
        },
        {
          added_by: "username1",
          id: 6,
          title: "Watermelon Man",
          video_id: "_QkGAaYtXA0",
        },
        {
          added_by: "username1",
          id: 8,
          title: "xx-intro",
          video_id: "QbwdJl8TGeY",
        },
        {
          added_by: "username1",
          id: 9,
          title: "Should I Stay or Should I Go",
          video_id: "BN1WwnEDWAM",
        },
      ],
      info: {
        title: "playlist1",
        creator_id: 1,
        private: true,
      },
      songTotal: "8",
    };
    expect(await persistence.getPlaylistInfoSongs(1)).toStrictEqual(expected);
  });

  test("Get contributors of playlist2", async () => {
    const expected = {
      songs: [
        {
          added_by: "username1",
          id: 7,
          title: "Stick Figure - Paradise",
          video_id: "qvzFphdCYHo",
        },
      ],
      info: {
        title: "playlist2",
        creator_id: 2,
        private: false,
      },
      songTotal: "1",
    };
    expect(await persistence.getPlaylistInfoSongs(2)).toStrictEqual(expected);
  });
});
