const { createApp } = require("./app");
const { env } = require("./config/env");
const { prisma } = require("./config/prisma");

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(`Explore N Bite API listening on port ${env.port} (${env.nodeEnv})`);
  console.log(`CORS allowed origins: ${env.frontendUrls.join(", ")}`);
  console.log(`Session cookie: httpOnly; SameSite=${env.cookie.sameSite}; Secure=${env.cookie.secure}`);
  console.log(
    `Mail transport: ${env.smtp.configured ? `SMTP ${env.smtp.host}:${env.smtp.port} (secure=${env.smtp.secure})` : "not configured — enquiries stored, not emailed"}`
  );
  console.log(
    `Media storage: ${
      env.assetBaseUrl ? `ASSET_BASE_URL=${env.assetBaseUrl}` : `local disk (backend/uploads)${env.mediaStorageAck === "persistent-volume" ? " — persistent volume asserted" : ""}`
    }`
  );
  if (env.adminDevBypass) {
    console.warn(
      "⚠  ADMIN DEV BYPASS ACTIVE — unauthenticated requests to /api/admin/* from a localhost Host " +
        "are treated as the first admin. Development only; disabled automatically in production. " +
        "Set ADMIN_DEV_BYPASS=false to turn it off here."
    );
  }
});

async function shutdown(signal) {
  console.log(`${signal} received, shutting down...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
