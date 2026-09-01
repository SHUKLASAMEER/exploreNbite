/** @type {import('next').NextConfig} */

// Base URL of the Express API. Same value lib/api.js reads; declared here
// too because next.config runs before module aliases resolve. The
// production build fails fast if it's missing (see the check below) rather
// than silently proxying to localhost.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

if (process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_API_URL) {
  throw new Error(
    "NEXT_PUBLIC_API_URL is required for a production build (the frontend has no API to talk to otherwise)."
  );
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
