const Persistence = require("./pg-persistence.js");
const persistence = new Persistence();

describe("Persistence", () => {
  const userId = 1;

  beforeEach(() => {
    //remake database
  });

  test("get two public playlist records", async () => {
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

  test("get songs of a playlist by id", async () => {
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
