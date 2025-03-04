const { CLIENT_SECRET, REDIRECT_URI, CLIENT_ID } = process.env;
const { Router } = require("express");
const authRouter = Router();
const { requireAuth } = require("./middleware.js");
const catchError = require("./catch-error");
const MSG = require("../lib/msg.json");
// Get the home page.
authRouter.get(
  "/",
  catchError((req, res) => {
    if (req.session.user) {
      return res.redirect("/your/playlists/1");
    } else {
      return res.redirect("/signin");
    }
  }),
);

authRouter.get("/twitchAuth", (req, res) => {
  res.redirect(
    `https://id.twitch.tv/oauth2/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=user:read:email&state=c3ab8aa609ea11e793ae92361f002671&nonce=c3ab8aa609ea11e793ae92361f002671`,
  );
});

authRouter.get("/twitchAuthResponse", async (req, res) => {
  const payload = {
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code: req.query.code,
    grant_type: "authorization_code",
    redirect_uri: REDIRECT_URI,
  };
  const token = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(payload).toString(),
  });
  const response = await token.json();
  const authUser = await fetch("https://api.twitch.tv/helix/users", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${response.access_token}`,
      "Client-Id": CLIENT_ID,
    },
  });

  const responseAuthUser = await authUser.json();
  const persistence = req.app.locals.persistence;
  if (responseAuthUser.message === "Invalid OAuth token")
    return res.render("signin");
  //data[0].id
  const username = responseAuthUser.data[0].display_name;
  // modify findUser to user the twitch id instead to find the user
  const user = await persistence.findUser(username); // pass in id
  if (!user) {
    req.flash("errors", "No account associated with the username. ");
    req.session.twitchUsername = username;
    return res.redirect("/twitchSignup");
  }
  req.flash("successes", "You are logged in");
  req.session.user = user;
  return res.redirect("/your/playlists/1");
});

authRouter.get("/twitchSignup", (req, res) => {
  const twitchUsername = req.session.twitchUsername;
  if (!twitchUsername) return res.redirect("/signin");
  return res.render("twitch_signup", { twitchUsername });
});
authRouter.post("/twitchSignup/create", async (req, res) => {
  const persistence = req.app.locals.persistence;
  const user = await persistence.createUserTwitch(req.session.twitchUsername);
  req.session.user = user;
  req.flash("successes", MSG.createUser);
  return res.redirect("/your/playlists/1");
});
authRouter.post("/twitchSignup/cancel", (req, res) => {
  delete req.session.twitchUsername;
  return res.redirect("/signin");
});

// Sign out.
authRouter.post(
  "/signout",
  requireAuth,
  catchError((req, res) => {
    req.session.destroy((error) => {
      if (error) console.error(error);
      return res.redirect("/signin");
    });
  }),
);

// Get signin form.
authRouter.get(
  "/signin",
  catchError((req, res) => {
    if (req.session.user) {
      req.flash("info", MSG.alreadyLoggedIn);
      return res.redirect("/your/playlists/1");
    }
    req.session.originRedirectUrl = req.query.redirectUrl;
    return res.render("signin");
  }),
);

module.exports = { authRouter };
