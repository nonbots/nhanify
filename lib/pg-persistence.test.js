const Persistence = require("./pg-persistence.js");
const persistence = new Persistence();

describe("Persistence", () => {
  const userId = 1;

  beforeEach(() => {
    //remake database
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
      songs: [
        {
          title: "title1",
          added_by: "username1",
          duration_sec: "43",
        },
        {
          added_by: "username2",
          duration_sec: "43322",
          title: "title3",
        },
        {
          added_by: "username2",
          duration_sec: "2343",
          title: "title2",
        },
      ],
      title: "playlist1",
    };
    expect(await persistence.getPlaylist(userId)).toStrictEqual(expected);
  });
  test("Get constributors of playlist1", async () => {
    const expected = {
      songs: [
        {
          title: "title1",
          added_by: "username1",
          duration_sec: "43",
        },
        {
          added_by: "username2",
          duration_sec: "43322",
          title: "title3",
        },
        {
          added_by: "username2",
          duration_sec: "2343",
          title: "title2",
        },
      ],
      title: "playlist1",
    };
    expect(await persistence.getPlaylist(userId)).toStrictEqual(expected);
  });
});
