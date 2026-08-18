import { requireAdminOrRedirect } from "@/lib/requireAdminOrRedirect";
import LogoutButton from "@/components/admin/LogoutButton";

// Every admin module gets one entry here — this page is the control panel's
// front door, so a section that isn't listed is effectively undiscoverable
// to the admin even if its API/UI exists.
const MODULES = [
  { href: "/admin/posts", label: "Posts", description: "Blog posts, drafts, and publishing." },
  { href: "/admin/categories", label: "Categories", description: "Post categories and their order." },
  { href: "/admin/authors", label: "Authors", description: "Author profiles credited on posts." },
  { href: "/admin/pages", label: "Pages", description: "Static content pages." },
  { href: "/admin/books", label: "Books", description: "Books and their buy links." },
  { href: "/admin/awards", label: "Awards / Mentions", description: "Awards and press mentions." },
  { href: "/admin/media", label: "Media", description: "Uploaded images library." },
  { href: "/admin/comments", label: "Comments", description: "Moderate reader comments." },
  { href: "/admin/subscribers", label: "Subscribers", description: "Newsletter subscriber list." },
  { href: "/admin/settings", label: "Settings", description: "Site title, logo, contact, and social links." },
  { href: "/admin/menu", label: "Menu", description: "Site navigation — pages, categories, and custom links." },
];

// Authentication verification page + navigation hub.
export default async function AdminHomePage() {
  const admin = await requireAdminOrRedirect();

  return (
    <main style={{ padding: "2rem", maxWidth: "1100px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0 }}>Admin Dashboard</h1>
          <p style={{ margin: "0.25rem 0 0", color: "#666" }}>
            Signed in as <strong>{admin.email}</strong>
          </p>
        </div>
        <LogoutButton />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: "1rem",
        }}
      >
        {MODULES.map((mod) => (
          <a
            key={mod.href}
            href={mod.href}
            style={{
              display: "block",
              border: "1px solid #ddd",
              borderRadius: "6px",
              padding: "1rem",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div style={{ fontWeight: "bold" }}>{mod.label}</div>
            <div style={{ fontSize: "0.85rem", color: "#666", marginTop: "0.25rem" }}>{mod.description}</div>
          </a>
        ))}
      </div>
    </main>
  );
}
