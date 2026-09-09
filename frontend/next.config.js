/** @type {import('next').NextConfig} */

// Base URL of the Express API. Same value lib/api.js reads; declared here
// too because next.config runs before module aliases resolve. The
// production build fails fast if it's missing (see the check below) rather
// than silently proxying to localhost.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

if (process.env.NODE_ENV === "production") {
  if (!process.env.NEXT_PUBLIC_API_URL) {
    throw new Error(
      "NEXT_PUBLIC_API_URL is required for a production build (the frontend has no API to talk to otherwise)."
    );
  }
  if (/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])/i.test(process.env.NEXT_PUBLIC_API_URL)) {
    // Warn, not throw — `next build` always sets NODE_ENV=production, so a
    // local build check with a localhost .env.local must still run.
    console.warn(
      "⚠  NEXT_PUBLIC_API_URL points at localhost in a production build — set it to the API's public origin before deploying."
    );
  }
}

const nextConfig = {
  // Uploaded media is served by the API at /uploads/*. Proxying it through
  // the frontend origin means stored media URLs can be root-relative
  // ("/uploads/x.jpg") and resolve correctly on any domain — no API host
  // baked into the database, and same-origin <img> for the browser.
  async rewrites() {
    return [
      { source: "/uploads/:path*", destination: `${API_BASE_URL}/uploads/:path*` },
    ];
  },

  // Baseline security headers on every HTML/document response. Deliberately
  // conservative — no full Content-Security-Policy here because the
  // recovered post content embeds third-party images and (allow-listed)
  // iframes; a CSP that covers those is a follow-up, tracked in the audit.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
    ];
  },

  poweredByHeader: false,
};

module.exports = nextConfig;
