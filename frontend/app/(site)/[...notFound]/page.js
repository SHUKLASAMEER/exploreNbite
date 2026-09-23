import { notFound } from "next/navigation";

// Catch-all for public URLs that match no route (e.g. /this-page-does-not-exist,
// /books/anything). Without it Next falls back to its bare default 404,
// rendered outside app/(site)/layout.js — no header, nav, footer or search.
// Calling notFound() here instead renders app/(site)/not-found.js inside the
// public layout, with an HTTP 404 status. Every real route (static segments
// and the other dynamic ones) is more specific and still wins, and the
// /uploads rewrite in next.config.js runs before dynamic routes.
export default function UnmatchedPublicRoute() {
  notFound();
}
