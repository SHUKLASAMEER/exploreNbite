const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Verified live navigation categories from the Phase 1 Discovery Report
// (Section 2 — Primary navigation). "Home" is intentionally excluded: it is
// not a selectable category in this schema, it's just "posts are shown on
// the home feed" (Phase 1.5, Section 1 — Categories).
const CATEGORIES = [
  { name: "Must Visit", slug: "must-visit", description: "Travel destination posts.", sortOrder: 1 },
  { name: "Travel Tips", slug: "travel-tips", description: "Travel advice articles.", sortOrder: 2 },
  { name: "Bites from Corners of the World", slug: "bites-from-corners-of-the-world", description: "Food and recipe posts.", sortOrder: 3 },
  { name: "Poetry Corner", slug: "poetry-corner", description: "Creative writing.", sortOrder: 4 },
];

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const adminName = process.env.SEED_ADMIN_NAME ?? "Explore N Bite Admin";

  if (!adminEmail || !adminPassword) {
    throw new Error(
      "SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set (see .env.example) before seeding."
    );
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.admin.upsert({
    where: { email: adminEmail },
    update: {},
    create: { name: adminName, email: adminEmail, passwordHash },
  });
  console.log(`Admin ready: ${admin.email}`);

  const author = await prisma.author.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: "Sweta",
      bio: "Travel and food writer, exploring off-beat destinations.",
    },
  });
  console.log(`Author ready: ${author.name}`);

  for (const category of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: category,
    });
  }
  console.log(`Categories ready: ${CATEGORIES.map((c) => c.slug).join(", ")}`);

  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      siteTitle: "Explore N Bite",
      contactEmail: adminEmail,
      footerText: `Copyright © ${new Date().getFullYear()}. Explore N Bite.`,
    },
  });
  console.log("Settings row ready.");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
