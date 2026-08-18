const { createApp } = require("./app");
const { env } = require("./config/env");
const { prisma } = require("./config/prisma");

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(`Explore N Bite API listening on port ${env.port} (${env.nodeEnv})`);
  console.log(`CORS allowed origin: ${env.frontendUrl}`);
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
