"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";
import Logo from "@/components/Logo";
import Button from "@/components/admin/ui/Button";
import FormField from "@/components/admin/ui/FormField";
import "@/components/admin/ui/tokens.css";
import styles from "./page.module.css";

// Lives outside the (protected) route group on purpose — this page must
// never render the AdminShell sidebar/topbar. Auth/session logic below is
// untouched from the original temporary screen: same endpoint, payload,
// error handling, and redirect-on-success behavior.
export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await apiFetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error?.message ?? "Login failed.");
        setLoading(false);
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className={`${styles.page} adminRoot`}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <Logo priority style={{ height: "52px", width: "auto" }} />
          <span className={styles.brandLabel}>Admin</span>
        </div>

        <div className={styles.intro}>
          <h1 className={styles.title}>Sign in</h1>
          <p className={styles.subtitle}>Manage posts, pages, and site content for Explore N Bite.</p>
        </div>

        {error ? (
          <div className={styles.errorBanner} role="alert">
            <AlertCircle size={16} strokeWidth={2} aria-hidden="true" />
            <span>{error}</span>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className={styles.form}>
          <FormField
            label="Email"
            htmlFor="login-email"
            type="email"
            name="email"
            autoComplete="username"
            autoFocus
            required
            disabled={loading}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <FormField
            label="Password"
            htmlFor="login-password"
            type="password"
            name="password"
            autoComplete="current-password"
            required
            disabled={loading}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" variant="primary" disabled={loading} className={styles.submitButton}>
            {loading ? "Signing in…" : "Log in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
