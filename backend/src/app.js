const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const { env } = require("./config/env");
const routes = require("./routes");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");

function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      // Frontend and backend are now separate applications (different
      // ports) — credentials: true + an explicit origin (not "*") is
      // required for the browser to send/receive the session cookie
      // cross-origin. FRONTEND_URL and this origin share a hostname
      // ("localhost") in local dev, so the cookie's SameSite=lax still
      // gets attached to these cross-origin-but-same-site requests; see
      // backend/README for the cross-origin cookie notes.
      origin: env.frontendUrl,
      credentials: true,
    })
  );
  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  if (env.nodeEnv !== "test") {
    app.use(morgan(env.nodeEnv === "development" ? "dev" : "combined"));
  }

  app.use("/api", routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
