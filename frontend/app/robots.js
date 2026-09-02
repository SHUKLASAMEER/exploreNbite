import { SITE_URL } from "@/lib/siteConfig";

// Served by Next at /robots.txt. Admin and API paths are disallowed;
// everything else is crawlable. Search-result pages carry their own
// noindex directive (see app/(site)/search/page.js) rather than a blanket
// robots disallow, so genuine deep links still resolve for users.
export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/", "/api/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
