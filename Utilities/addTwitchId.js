const { BOT_TWITCH_TOKEN, CLIENT_ID } = process.env;
// import in the db client and connect to the database
const client = require("../lib/pg-connect.js");
//get user name from data base
//iterate through each user name
// pass the user name to twich user api
// if the user exist
// get the id
// call to the database and find the record with the name and update the twitch id value to id
// query the db for all songs where the duration is null
(async () => {
  async function usersName() {
    const result = await client.query("SELECT username FROM users ORDER BY id");
    return result.rows;
  }
  const usersNameData = await usersName();
  const params = usersNameData.map((user) => `login=${user.username}`);
  const batchSize = 100; //99 user at time // 100 user ...
  await run(BOT_TWITCH_TOKEN, CLIENT_ID);
  console.log("FINISHED");
  await client.end();

  async function run(BOT_TWITCH_TOKEN, CLIENT_ID) {
    for (let i = 0; i < params.length; i += batchSize) {
      let batchParams = params.slice(i, i + batchSize).join("&");
      const result = await getUserTwitchId(
        batchParams,
        BOT_TWITCH_TOKEN,
        CLIENT_ID,
      );
      console.log({ i, batchParams, result });
      await populateTwitchUserId(result);
    }
  }

  async function populateTwitchUserId(result) {
    const promises = result.data.map((user) => {
      //find where the user record with the login
      const UPDATE_TWITCH_ID = `UPDATE users SET twitch_id = $1 WHERE username = $2 AND twitch_id IS NULL`;
      return client.query(UPDATE_TWITCH_ID, [user.id, user.login]);
    });
    return await Promise.all(promises);
  }

  async function getUserTwitchId(params, TWITCH_TOKEN, CLIENT_ID) {
    try {
      const response = await fetch(
        `https://api.twitch.tv/helix/users?${params}`,
        {
          method: "GET",
          headers: {
            Authorization: "Bearer " + TWITCH_TOKEN,
            "Client-Id": CLIENT_ID,
          },
        },
      );
      const body = await response.json();
      if (response.status === 200) {
        return body;
      } else {
        console.error(`${JSON.stringify(body)}`);
      }
    } catch (e) {
      console.error(e);
    }
  }
})();
