const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const { env } = require("./config/env");
const routes = require("./routes");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");
const { UPLOADS_DIR } = require("./middleware/upload");

function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      // Credentials + an explicit allow-list of origins (never "*") — the
      // browser requires this to send/receive the session cookie
      // cross-origin. FRONTEND_URL may list more than one origin (apex +
      // www, a preview domain, …); each is matched exactly. A request with
      // no Origin header (curl, same-origin, server-to-server) is allowed.
      origin(origin, callback) {
        if (!origin || env.frontendUrls.includes(origin)) {
          return callback(null, true);
        }
        return callback(null, false);
      },
      credentials: true,
    })
  );
  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  if (env.nodeEnv !== "test") {
    app.use(morgan(env.nodeEnv === "development" ? "dev" : "combined"));
  }

  // Static uploaded images. Scoped ONLY to this one route: Helmet's default
  // Cross-Origin-Resource-Policy: same-origin (visible on every other
  // response) would otherwise stop the frontend, a different origin, from
  // embedding these images via <img src>. express.static only ever serves
  // files that exist inside UPLOADS_DIR — it cannot expose .env, src/,
  // prisma/, or anything outside that one directory.
  app.use(
    "/uploads",
    (req, res, next) => {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      next();
    },
    express.static(UPLOADS_DIR)
  );

  app.use("/api", routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
