const { CLIENT_SECRET, CLIENT_ID, BOT_REFRESH_TOKEN } = process.env;

// import in the db client and connect to the database
const client = require("../lib/pg-connect.js");
async function usersName() {
  const result = await client.query("SELECT username FROM users ORDER BY id");
  return result.rows;
}
const batchSize = 100; //99 user at time // 100 user ...
async function run(BOT_TWITCH_TOKEN, CLIENT_ID, params) {
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
    return client.query(UPDATE_TWITCH_ID, [user.id, user.display_name]);
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
async function refreshAuthToken(entity, BOT_REFRESH_TOKEN) {
  const payload = {
    grant_type: "refresh_token",
    refresh_token: BOT_REFRESH_TOKEN,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  };
  console.log({ CLIENT_ID, CLIENT_SECRET, BOT_REFRESH_TOKEN });
  try {
    const response = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(payload).toString(),
    });
    const body = await response.json();
    if (response.status === 200) {
      console.log(`${response.status}: Refresh ${entity} token.`);
      return { type: "data", body };
    }
    return { type: "error", body };
  } catch (e) {
    console.error(e);
    return {
      type: "error",
      body: { message: "Something went wrong when refreshing token" },
    };
  }
}
(async () => {
  const data = await refreshAuthToken("bot", BOT_REFRESH_TOKEN);
  const usersNameData = await usersName();
  const params = usersNameData.map((user) => `login=${user.username}`); //Orshy
  await run(data.body.access_token, CLIENT_ID, params);
  console.log("FINISHED");
  await client.end();
})();
