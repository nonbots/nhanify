const { HOST, PORT, SESSION_SECRET, NODE_ENV } = process.env;
// IMPORTANT: Make sure to import `instrument.js` at the top of your file.
// If you're using ECMAScript Modules (ESM) syntax, use `import "./instrument.js";`
const isProduction = NODE_ENV === "production";
let Sentry;
if (isProduction) {
  require("./lib/instrument.js");
  // All other imports below
  // Import with `import * as Sentry from "@sentry/node"` if you are using ESM
  Sentry = require("@sentry/node");
}

const express = require("express");
const app = express();
const session = require("express-session");
const store = require("connect-loki");
const LokiStore = store(session);
const morgan = require("morgan");
const { NotFoundError, ForbiddenError } = require("./lib/errors.js");
const flash = require("express-flash");
const Persistence = require("./lib/pg-persistence.js");
app.locals.persistence = new Persistence();
const MSG = require("./lib/msg.json");
const { playlistsRouter } = require("./routes/playlistsRouter.js");
const { songsRouter } = require("./routes/songsRouter.js");
const { contributorsRouter } = require("./routes/contributorsRouter.js");
const { authRouter } = require("./routes/authRouter.js");
const { apiRouter } = require("./routes/apiRouter.js");
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
app.use("/api", apiRouter);
app.use(authRouter);
app.use(playlistsRouter);
app.use(songsRouter);
app.use(contributorsRouter);

// The error handler must be registered before any other error middleware and after all controllers
if (isProduction) Sentry.setupExpressErrorHandler(app);

// error handlers
app.use("*", (req, res, next) => {
  next(new NotFoundError());
});
app.use((err, req, res, _next) => {
  // do not remove next parameter
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
    if (isProduction) Sentry.captureException(err);
    res.status(500);
    res.render("error", { statusCode: 500, msg: MSG.error500 });
  }
});

app.listen(PORT, HOST, () => {
  console.log(`🎵 Nhanify music ready to rock on http://${HOST}:${PORT} 🎵`);
});
