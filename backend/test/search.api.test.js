// Read-only integration tests for public search (GET /api/posts?search=).
// Needs the backend running (SEARCH_API_URL, default http://localhost:4000)
// and DATABASE_URL (from .env) to compute the expected result set directly
// from the published posts. Nothing is created, updated or deleted.
//
// Optional: SEARCH_WEB_URL (e.g. http://localhost:3000) also checks that the
// /search page treats a whitespace-only query like no query.
const test = require("node:test");
const assert = require("node:assert/strict");
const { PrismaClient } = require("@prisma/client");

const API = process.env.SEARCH_API_URL || "http://localhost:4000";
const WEB = process.env.SEARCH_WEB_URL || "";

const prisma = new PrismaClient();
let corpus;
let apiUp = false;

test.before(async () => {
  try {
    apiUp = (await fetch(`${API}/api/health`)).ok;
  } catch {
    apiUp = false;
  }
  const posts = await prisma.post.findMany({
    where: { status: "published" },
    select: {
      id: true,
      title: true,
      shortDescription: true,
      content: true,
      category: { select: { name: true, slug: true } },
      categories: { select: { category: { select: { name: true, slug: true } } } },
      tags: { select: { tag: { select: { name: true, slug: true } } } },
    },
  });
  corpus = posts.map((p) => ({
    id: p.id,
    fields: [
      p.title,
      p.shortDescription,
      p.content,
      ...[p.category, ...p.categories.map((c) => c.category)].filter(Boolean).flatMap((c) => [c.name, c.slug]),
      ...p.tags.flatMap((t) => [t.tag.name, t.tag.slug]),
    ]
      .filter(Boolean)
      .map((s) => s.toLowerCase()),
  }));
});

test.after(() => prisma.$disconnect());

// Every whitespace-separated term must appear literally in at least one
// searchable field — the documented search contract, with no wildcards.
function expectedIds(q) {
  const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return corpus
    .filter((p) => terms.every((t) => p.fields.some((f) => f.includes(t))))
    .map((p) => p.id)
    .sort((a, b) => a - b);
}

async function searchAll(q) {
  const ids = [];
  const seen = [];
  let page = 1;
  let totalPages = 1;
  let total = 0;
  do {
    const res = await fetch(`${API}/api/posts?limit=100&page=${page}&search=${encodeURIComponent(q)}`);
    assert.equal(res.status, 200, `status for "${q}"`);
    const body = await res.json();
    for (const post of body.data) {
      assert.equal(post.status, "published");
      assert.ok(!("content" in post), "content is stripped from search results");
      seen.push(post);
      ids.push(post.id);
    }
    totalPages = body.pagination.totalPages;
    total = body.pagination.total;
    page++;
  } while (page <= totalPages);
  return { ids, total, posts: seen };
}

const skipNoApi = (t) => {
  if (!apiUp) t.skip(`backend not reachable at ${API}`);
  return !apiUp;
};

test("wildcard characters match literally (QA-002)", async (t) => {
  if (skipNoApi(t)) return;
  for (const q of ["%", "_", "\\", "co_rg", "coo%rg"]) {
    const { ids, total } = await searchAll(q);
    const expected = expectedIds(q);
    assert.deepEqual([...ids].sort((a, b) => a - b), expected, `result set for "${q}"`);
    assert.equal(total, expected.length);
    assert.ok(total < corpus.length, `"${q}" must not match the whole catalogue`);
  }
  assert.equal((await searchAll("co_rg")).total, 0, "co_rg must not match Coorg");
});

test("ordinary queries keep their recovered behaviour", async (t) => {
  if (skipNoApi(t)) return;
  const queries = ["coorg", "bangalore", "madikeri", "south india", "travel tips", "must-visit", "coorg scotland", "recipe"];
  for (const q of queries) {
    const { ids } = await searchAll(q);
    assert.ok(ids.length > 0, `"${q}" returns results`);
    assert.equal(new Set(ids).size, ids.length, `"${q}" has no duplicate posts`);
    assert.deepEqual([...ids].sort((a, b) => a - b), expectedIds(q), `result set for "${q}"`);
  }
  const coorg = await searchAll("coorg");
  assert.match(coorg.posts[0].title, /Coorg/, "title match ranks first");
});

test("pagination is preserved", async (t) => {
  if (skipNoApi(t)) return;
  const all = (await searchAll("recipe")).ids;
  const res = await fetch(`${API}/api/posts?search=recipe&limit=5&page=2`);
  const body = await res.json();
  assert.equal(body.pagination.limit, 5);
  assert.equal(body.pagination.total, all.length);
  assert.equal(body.pagination.totalPages, Math.ceil(all.length / 5));
  assert.deepEqual(body.data.map((p) => p.id), all.slice(5, 10));
});

test("whitespace-only search behaves like no search (QA-035)", async (t) => {
  if (skipNoApi(t)) return;
  const plain = await (await fetch(`${API}/api/posts?limit=5`)).json();
  for (const q of ["", " ", "   "]) {
    const res = await fetch(`${API}/api/posts?limit=5&search=${encodeURIComponent(q)}`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body.data.map((p) => p.id), plain.data.map((p) => p.id), `search=${JSON.stringify(q)}`);
    assert.equal(body.pagination.total, plain.pagination.total);
  }
});

test("/search page shows the neutral prompt for blank queries (QA-035)", async (t) => {
  if (!WEB) return t.skip("SEARCH_WEB_URL not set");
  for (const qs of ["", "?q=", "?q=%20", "?q=%20%20%20", "?q=+++"]) {
    const res = await fetch(`${WEB}/search${qs}`);
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes("Enter a search term to find posts."), `neutral prompt for /search${qs}`);
    assert.ok(!html.includes("No posts matched your search."), `no empty-result state for /search${qs}`);
  }
  const html = await (await fetch(`${WEB}/search?q=south%20india`)).text();
  assert.ok(html.includes("Search results for"), "normal multi-word query still searches");
});
