import Header from "@/components/Header";

export default function Home() {
  return (
    <>
      <Header />
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
          Project foundation is running. Public site is not built yet.
        </p>
        <p style={{ fontSize: "0.9rem" }}>
          This app calls a separate Express API — see <code>NEXT_PUBLIC_API_URL</code>.
        </p>
      </main>
    </>
  );
}
