const client = require("./pg-connect.js");
const Persistence = require("./pg-persistence.js");
const persistence = new Persistence();

describe("Persistence", () => {
  beforeEach(() => {});
  test("UserId 1 has read access to user created playlist 1 .", async () => {
    expect(await persistence.isReadPlaylistAuthorized(1, 1)).toBe(true);
  });

  test("userId 1 has read access to public playlist 6.", async () => {
    expect(await persistence.isReadPlaylistAuthorized(6, 1)).toBe(true);
  });

  test("UserId 1, a contributor to playlist 11, has read access.", async () => {
    expect(await persistence.isReadPlaylistAuthorized(11, 1)).toBe(true);
  });

  test("UserId 2 is not authorized read access to playlist 11", async () => {
    expect(await persistence.isReadPlaylistAuthorized(11, 2)).toBe(false);
  });

  test("Gets three playlists userId 1 contributes to", async () => {
    const expected = [
      {
        count: "0",
        username: "username3",
        id: 9,
        title: "Dance Class",
        creator_id: 3,
        private: false,
      },
      {
        count: "0",
        username: "username2",
        id: 8,
        title: "Focus Study",
        creator_id: 2,
        private: false,
      },
      {
        count: "0",
        username: "username5",
        id: 11,
        title: "Summer Jam",
        creator_id: 5,
        private: true,
      },
    ];
    expect(
      await persistence.getContributionPlaylistsPage(1, 0, 5),
    ).toStrictEqual(expected);
  });

  test("Get two playlists that userId 2 contributes to", async () => {
    const expected = [
      {
        count: "7",
        username: "username1",
        id: 1,
        title: "Lofi",
        creator_id: 1,
        private: false,
      },
      {
        count: "10",
        username: "username1",
        id: 7,
        title: "Twitch Stream",
        creator_id: 1,
        private: false,
      },
    ];
    expect(
      await persistence.getContributionPlaylistsPage(2, 0, 5),
    ).toStrictEqual(expected);
  });
  test("Gets five playlists created by userId 1", async () => {
    const expected = [
      {
        count: "0",
        username: "username1",
        id: 3,
        title: "Chill & Relaxing",
        creator_id: 1,
        private: false,
      },
      {
        count: "1",
        username: "username1",
        id: 6,
        title: "Christmas Jams",
        creator_id: 1,
        private: false,
      },
      {
        count: "1",
        username: "username1",
        id: 5,
        title: "Coding",
        creator_id: 1,
        private: false,
      },
      {
        count: "1",
        username: "username1",
        id: 2,
        title: "Gym",
        creator_id: 1,
        private: false,
      },
      {
        count: "7",
        username: "username1",
        id: 1,
        title: "Lofi",
        creator_id: 1,
        private: false,
      },
    ];
    expect(await persistence.getYourPlaylistsPage(1, 0, 5)).toStrictEqual(
      expected,
    );
  });

  test("Get one playlist created by userId 2", async () => {
    const expected = [
      {
        count: "0",
        username: "username2",
        id: 8,
        title: "Focus Study",
        creator_id: 2,
        private: false,
      },
    ];
    expect(await persistence.getYourPlaylistsPage(2, 0, 5)).toStrictEqual(
      expected,
    );
  });
  test("Gets five public playlists", async () => {
    const expected = [
      {
        count: "0",
        username: "username1",
        id: 3,
        title: "Chill & Relaxing",
        creator_id: 1,
        private: false,
      },
      {
        count: "1",
        username: "username1",
        id: 6,
        title: "Christmas Jams",
        creator_id: 1,
        private: false,
      },
      {
        count: "1",
        username: "username1",
        id: 5,
        title: "Coding",
        creator_id: 1,
        private: false,
      },
      {
        count: "0",
        username: "username3",
        id: 9,
        title: "Dance Class",
        creator_id: 3,
        private: false,
      },
      {
        count: "0",
        username: "username2",
        id: 8,
        title: "Focus Study",
        creator_id: 2,
        private: false,
      },
    ];
    expect(await persistence.getPublicPlaylistsPage(0, 5)).toStrictEqual(
      expected,
    );
  });

  test("Get playlistId 1 info", async () => {
    const expected = {
      title: "Lofi",
      creator_id: 1,
      private: false,
    };
    expect(await persistence.getPlaylist(1)).toStrictEqual(expected);
  });

  test("Get playlistId 1 songs and info", async () => {
    const expected = {
      songs: [
        {
          added_by: "username1",
          id: 6,
          title: "Blankets",
          video_id: "HdXrkgZP438",
          duration_sec: null,
        },
        {
          added_by: "username1",
          id: 1,
          title: "Chilling In Tokyo",
          video_id: "y7qZFji19Rg",
          duration_sec: null,
        },
        {
          added_by: "username2",
          id: 7,
          title: "Dreaming",
          video_id: "DFVuYoDVS_g",
          duration_sec: null,
        },
        {
          added_by: "username1",
          id: 5,
          title: "Eternal Youth",
          video_id: "_BWPNPtsZm8",
          duration_sec: null,
        },
        {
          added_by: "username1",
          id: 2,
          title: "Good Days",
          video_id: "L9VcK_pT1Y4",
          duration_sec: null,
        },
      ],
      info: {
        title: "Lofi",
        creator_id: 1,
        private: false,
      },
      songTotal: "7",
    };
    expect(await persistence.getPlaylistInfoSongs(1, 0, 5)).toStrictEqual(
      expected,
    );
  });

  test("Get playlistId 2 songs and info", async () => {
    const expected = {
      songs: [
        {
          added_by: "username2",
          id: 8,
          title: "Pink - Raise Your Glass",
          video_id: "XjVNlG5cZyQ",
          duration_sec: null,
        },
      ],
      info: {
        title: "Gym",
        creator_id: 1,
        private: false,
      },
      songTotal: "1",
    };
    expect(await persistence.getPlaylistInfoSongs(2)).toStrictEqual(expected);
  });
});
test("Get playlist by playlist title Christmas Jams and username username1", async () => {
  const expected = { id: 6 };
  expect(
    await persistence.getPlaylistByUserPlaylistName(
      "username1",
      "Christmas Jams",
    ),
  ).toStrictEqual(expected);
});
test("Get playlist by playlist title Christmas Jams and username username60", async () => {
  const expected = undefined;
  expect(
    await persistence.getPlaylistByUserPlaylistName(
      "username60",
      "Christmas Jams",
    ),
  ).toStrictEqual(expected);
});

afterAll(async () => {
  await client.end();
});
