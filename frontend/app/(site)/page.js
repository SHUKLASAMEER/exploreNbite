// Placeholder home page content — unchanged from the previous app/page.js,
// just moved under the new (site) route group so it picks up the public
// layout's Header/Footer (see app/(site)/layout.js). Building out real Home
// Page content is out of scope for this phase.
export default function Home() {
  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.75rem",
        textAlign: "center",
        padding: "2rem",
      }}
    >
      <h1 style={{ fontSize: "1.75rem" }}>Explore N Bite</h1>
      <p style={{ color: "#666" }}>
        Project foundation is running. Public site is not built yet.
      </p>
      <p style={{ fontSize: "0.9rem" }}>
        This app calls a separate Express API — see <code>NEXT_PUBLIC_API_URL</code>.
      </p>
    </div>
  );
}
