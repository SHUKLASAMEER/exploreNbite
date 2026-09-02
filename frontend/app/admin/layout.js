// Wraps every /admin/** route (the login screen and the protected group).
// Its only job is to mark the whole admin area noindex/nofollow at the
// metadata level — belt-and-braces with the /admin disallow in robots.js —
// so an unauthenticated hit that lands on /admin/login can never be
// indexed. It adds no markup and no behavior; the visual chrome still comes
// from app/admin/(protected)/layout.js.
export const metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }) {
  return children;
}
