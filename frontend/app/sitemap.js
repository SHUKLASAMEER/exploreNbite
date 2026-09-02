import { API_BASE_URL } from "@/lib/api";
import { SITE_URL } from "@/lib/siteConfig";

// Dynamic sitemap generated from the live CMS data. Next serves this at
// /sitemap.xml. Only real, public, indexable URLs are listed:
//   - the homepage
//   - every published post   (GET /api/posts forces status:published)
//   - every category archive
//   - every CMS page          (About, Contact, Work With Me, …)
//   - every author archive
//   - the /books and /awards index pages
// Admin routes, draft posts and search-result URLs are deliberately excluded.
export const dynamic = "force-dynamic";

async function getJson(path) {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// The public posts endpoint caps `limit` at 100 — page through it so the
// sitemap stays complete as the catalogue grows.
async function getAllPosts() {
  const all = [];
  for (let page = 1; page <= 25; page++) {
    const data = await getJson(`/api/posts?limit=100&page=${page}`);
    const batch = data?.data ?? [];
    all.push(...batch);
    if (batch.length < 100) break;
  }
  return all;
}

export default async function sitemap() {
  const [posts, cats, authors, pages] = await Promise.all([
    getAllPosts(),
    getJson("/api/categories"),
    getJson("/api/authors"),
    getJson("/api/pages"),
  ]);

  const now = new Date();
  const entries = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/books`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    { url: `${SITE_URL}/awards`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
  ];

  for (const p of posts) {
    if (!p?.slug) continue;
    entries.push({
      url: `${SITE_URL}/posts/${p.slug}`,
      lastModified: p.updatedAt || p.publishDate || now,
      changeFrequency: "monthly",
      priority: 0.8,
    });
  }
  for (const c of cats?.categories ?? []) {
    if (!c?.slug) continue;
    entries.push({ url: `${SITE_URL}/category/${c.slug}`, lastModified: now, changeFrequency: "weekly", priority: 0.6 });
  }
  for (const pg of pages?.pages ?? []) {
    if (!pg?.slug) continue;
    entries.push({
      url: `${SITE_URL}/pages/${pg.slug}`,
      lastModified: pg.updatedAt || now,
      changeFrequency: "monthly",
      priority: 0.5,
    });
  }
  for (const a of authors?.authors ?? []) {
    if (!a?.id) continue;
    entries.push({ url: `${SITE_URL}/authors/${a.id}`, lastModified: now, changeFrequency: "monthly", priority: 0.4 });
  }

  return entries;
}
