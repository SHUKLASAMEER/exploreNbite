export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
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
        Project foundation is running. Public site and admin dashboard are not
        built yet.
      </p>
      <p style={{ fontSize: "0.9rem" }}>
        API check: <code>GET /api/health</code>
      </p>
    </main>
  );
}
