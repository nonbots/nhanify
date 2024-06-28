const Persistence = require("./pg-persistence.js");
const persistence = new Persistence();

test("one public playlist record", async () => {
  //[{"count": "1", "creator_id": 2, "id": 2, "private": false, "title": "playlist2", "username": "username2"}]
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
