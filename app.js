const {
  DOMAIN,
  CLIENT_SECRET,
  REDIRECT_URI,
  CLIENT_ID,
  HOST,
  PORT,
  SESSION_SECRET,
  YT_API_KEY,
} = process.env;
const express = require("express");
const app = express();
const session = require("express-session");
const store = require("connect-loki");
const LokiStore = store(session);
const morgan = require("morgan");
const { NotFoundError, ForbiddenError } = require("./lib/errors.js");
const { getPlaylists, getPlaylist } = require("./routes/middleware.js");
const { body, validationResult } = require("express-validator");
const flash = require("express-flash");
const catchError = require("./routes/catch-error.js");
const Persistence = require("./lib/pg-persistence.js");
const persistence = new Persistence();
const {
  isValidRedirectURL,
  isValidURL,
  parseURL,
  getVidInfo,
} = require("./lib/playlist.js");
const MSG = require("./lib/msg.json");
const { playlistsRouter } = require("./routes/playlistsRouter.js");
const { songsRouter } = require("./routes/songsRouter.js");
const { contributorsRouter } = require("./routes/contributorsRouter.js");
const { authRouter } = require("./routes/authRouter.js");
const ITEMS_PER_PAGE = 5;
const PAGE_OFFSET = 4;
app.set("views", "./views");
app.set("view engine", "pug");
app.use(express.static("public"));
app.use(morgan("common"));
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    cookie: {
      httpOnly: true,
      maxAge: 3_600_000 * 24,
      path: "/",
      secure: false,
    },
    name: "nhanify-id",
    resave: false,
    saveUninitialized: true,
    secret: SESSION_SECRET,
    store: new LokiStore({}),
  }),
);
app.use(flash());
app.use((req, res, next) => {
  if (req.url === "/favicon.ico") return res.status(204).end();
  res.locals.user = req.session.user;
  res.locals.flash = req.session.flash;
  delete req.session.flash;
  next();
});
app.use(authRouter);
app.use(playlistsRouter);
app.use(songsRouter);
app.use(contributorsRouter);

// error handlers
app.use("*", (req, res, next) => {
  next(new NotFoundError());
});

app.use((err, req, res, next) => {
  console.log(err);
  if (err instanceof ForbiddenError) {
    res.status(403);
    res.render("error", {
      statusCode: 403,
      msg: MSG.error403,
      msg2: MSG.errorNav,
    });
  } else if (err instanceof NotFoundError) {
    res.status(404);
    res.render("error", {
      statusCode: 404,
      msg: MSG.error404,
      msg2: MSG.errorNav,
    });
  } else {
    res.status(500);
    res.render("error", { statusCode: 500, msg: MSG.error500 });
  }
});

app.listen(PORT, HOST, () => {
  console.log(`🎵 Nhanify music ready to rock on http://${HOST}:${PORT} 🎵`);
});
