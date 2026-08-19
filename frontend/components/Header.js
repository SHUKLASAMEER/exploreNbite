import Link from "next/link";
import Logo from "@/components/Logo";

export default function Header() {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        padding: "1rem 2rem",
        borderBottom: "1px solid #eee",
      }}
    >
      <Link href="/" style={{ display: "flex", alignItems: "center" }}>
        <Logo priority />
      </Link>
    </header>
  );
}
