const { PrismaClient } = require("@prisma/client");
const { env } = require("./env");

// Unlike the previous single-process Next.js app (which used a globalThis
// cache to survive per-module hot reload without multiplying connections),
// `node --watch` restarts the entire process on every file change — so a
// plain singleton is correct and sufficient here; there's no fine-grained
// module reload to guard against.
const prisma = new PrismaClient({
  log: env.nodeEnv === "development" ? ["warn", "error"] : ["error"],
});

module.exports = { prisma };
