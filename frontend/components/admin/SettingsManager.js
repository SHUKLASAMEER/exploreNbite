"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

const inputStyle = { padding: "0.4rem 0.5rem", fontSize: "1rem" };
const labelStyle = { display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.9rem" };
const buttonStyle = { padding: "0.4rem 0.8rem", cursor: "pointer" };
const sectionStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "0.75rem",
  border: "1px solid #ddd",
  borderRadius: "6px",
  padding: "1rem",
};

async function parseJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

const emptyForm = {
  siteTitle: "",
  logoUrl: "",
  socialFacebook: "",
  socialTwitter: "",
  socialInstagram: "",
  contactEmail: "",
  footerText: "",
};

// Settings is a singleton (id always 1) — this is a plain load-then-save
// form, not a list manager: no create, no delete, no pagination. Every
// field here maps 1:1 to a public-facing setting (site branding, social
// links, contact email, footer text) so an admin can change what the
// website shows without a developer touching code.
export default function SettingsManager() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [form, setForm] = useState(emptyForm);

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError("");
      try {
        const res = await apiFetch("/api/admin/settings");
        const data = await parseJsonSafe(res);
        if (!res.ok) {
          throw new Error(data?.error?.message ?? "Failed to load settings.");
        }
        if (cancelled) return;
        const settings = data.settings;
        setForm({
          siteTitle: settings.siteTitle ?? "",
          logoUrl: settings.logoUrl ?? "",
          socialFacebook: settings.socialFacebook ?? "",
          socialTwitter: settings.socialTwitter ?? "",
          socialInstagram: settings.socialInstagram ?? "",
          contactEmail: settings.contactEmail ?? "",
          footerText: settings.footerText ?? "",
        });
      } catch (err) {
        if (!cancelled) setLoadError(err.message || "Failed to load settings.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");
    setSuccessMessage("");
    setSaving(true);

    try {
      const res = await apiFetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await parseJsonSafe(res);

      if (!res.ok) {
        setFormError(data?.error?.message ?? "Could not save settings.");
        setSaving(false);
        return;
      }

      setSuccessMessage("Settings updated.");
      setSaving(false);
    } catch {
      setFormError("Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  if (loading) {
    return <p>Loading settings…</p>;
  }

  if (loadError) {
    return (
      <p role="alert" style={{ color: "crimson" }}>
        {loadError}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: "560px" }}>
      <h1 style={{ margin: 0 }}>Settings</h1>

      {successMessage ? (
        <p role="status" style={{ color: "green", margin: 0 }}>
          {successMessage}
        </p>
      ) : null}
      {formError ? (
        <p role="alert" style={{ color: "crimson", margin: 0 }}>
          {formError}
        </p>
      ) : null}

      <section style={sectionStyle}>
        <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Site</h2>

        <label style={labelStyle}>
          Site Title
          <input
            style={inputStyle}
            type="text"
            required
            value={form.siteTitle}
            onChange={(e) => setForm((prev) => ({ ...prev, siteTitle: e.target.value }))}
          />
        </label>

        <label style={labelStyle}>
          Logo URL <span style={{ color: "#888", fontWeight: "normal" }}>(optional — upload via Media, then paste the URL here)</span>
          <input
            style={inputStyle}
            type="text"
            placeholder="https://…"
            value={form.logoUrl}
            onChange={(e) => setForm((prev) => ({ ...prev, logoUrl: e.target.value }))}
          />
        </label>

        <label style={labelStyle}>
          Contact Email
          <input
            style={inputStyle}
            type="email"
            required
            value={form.contactEmail}
            onChange={(e) => setForm((prev) => ({ ...prev, contactEmail: e.target.value }))}
          />
        </label>

        <label style={labelStyle}>
          Footer Text <span style={{ color: "#888", fontWeight: "normal" }}>(optional)</span>
          <input
            style={inputStyle}
            type="text"
            value={form.footerText}
            onChange={(e) => setForm((prev) => ({ ...prev, footerText: e.target.value }))}
          />
        </label>
      </section>

      <section style={sectionStyle}>
        <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Social Links</h2>

        <label style={labelStyle}>
          Facebook URL <span style={{ color: "#888", fontWeight: "normal" }}>(optional)</span>
          <input
            style={inputStyle}
            type="text"
            placeholder="https://…"
            value={form.socialFacebook}
            onChange={(e) => setForm((prev) => ({ ...prev, socialFacebook: e.target.value }))}
          />
        </label>

        <label style={labelStyle}>
          Twitter URL <span style={{ color: "#888", fontWeight: "normal" }}>(optional)</span>
          <input
            style={inputStyle}
            type="text"
            placeholder="https://…"
            value={form.socialTwitter}
            onChange={(e) => setForm((prev) => ({ ...prev, socialTwitter: e.target.value }))}
          />
        </label>

        <label style={labelStyle}>
          Instagram URL <span style={{ color: "#888", fontWeight: "normal" }}>(optional)</span>
          <input
            style={inputStyle}
            type="text"
            placeholder="https://…"
            value={form.socialInstagram}
            onChange={(e) => setForm((prev) => ({ ...prev, socialInstagram: e.target.value }))}
          />
        </label>
      </section>

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button type="submit" style={buttonStyle} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
