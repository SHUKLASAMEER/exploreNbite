"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import RichTextEditor from "@/components/admin/RichTextEditor";

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
  title: "",
  slug: "",
  content: "",
  showInMenu: false,
  menuPosition: "",
};

export default function PageForm({ mode, pageId }) {
  const router = useRouter();
  const isEditing = mode === "edit";

  const [loading, setLoading] = useState(isEditing);
  const [loadError, setLoadError] = useState("");

  const [form, setForm] = useState(emptyForm);

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEditing) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError("");
      try {
        const res = await apiFetch(`/api/admin/pages/${pageId}`);
        const data = await parseJsonSafe(res);
        if (!res.ok) {
          throw new Error(data?.error?.message ?? "Failed to load this page.");
        }
        if (cancelled) return;
        const page = data.page;
        setForm({
          title: page.title,
          slug: page.slug,
          content: page.content,
          showInMenu: page.showInMenu,
          menuPosition: page.menuPosition === null || page.menuPosition === undefined ? "" : String(page.menuPosition),
        });
      } catch (err) {
        if (!cancelled) setLoadError(err.message || "Failed to load this page.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isEditing, pageId]);

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");
    setSuccessMessage("");
    setSaving(true);

    const payload = {
      title: form.title,
      slug: form.slug,
      content: form.content,
      showInMenu: form.showInMenu,
      menuPosition: form.menuPosition === "" ? null : Number(form.menuPosition),
    };

    try {
      const res = await apiFetch(isEditing ? `/api/admin/pages/${pageId}` : "/api/admin/pages", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await parseJsonSafe(res);

      if (!res.ok) {
        setFormError(data?.error?.message ?? "Could not save this page.");
        setSaving(false);
        return;
      }

      if (isEditing) {
        setSuccessMessage("Page updated.");
        setSaving(false);
      } else {
        // Created -> continue editing the now-persisted page, same pattern
        // used by the Posts editor.
        router.push(`/admin/pages/${data.page.id}/edit`);
      }
    } catch {
      setFormError("Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  if (loading) {
    return <p>Loading…</p>;
  }

  if (loadError) {
    return (
      <p role="alert" style={{ color: "crimson" }}>
        {loadError}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: "720px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>{isEditing ? "Edit Page" : "Add Page"}</h1>
        <button type="button" style={buttonStyle} onClick={() => router.push("/admin/pages")}>
          ← Back to Pages
        </button>
      </div>

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
        <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Basic</h2>

        <label style={labelStyle}>
          Title
          <input
            style={inputStyle}
            type="text"
            required
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
          />
        </label>

        <label style={labelStyle}>
          Slug{" "}
          <span style={{ color: "#888", fontWeight: "normal" }}>
            (optional — leave blank to auto-generate from the title)
          </span>
          <input
            style={inputStyle}
            type="text"
            placeholder="(auto)"
            value={form.slug}
            onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
          />
        </label>
      </section>

      <section style={sectionStyle}>
        <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Content</h2>
        <RichTextEditor value={form.content} onChange={(html) => setForm((prev) => ({ ...prev, content: html }))} />
      </section>

      <section style={sectionStyle}>
        <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Menu</h2>

        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem" }}>
          <input
            type="checkbox"
            checked={form.showInMenu}
            onChange={(e) => setForm((prev) => ({ ...prev, showInMenu: e.target.checked }))}
          />
          Show in menu
        </label>

        <label style={labelStyle}>
          Menu position <span style={{ color: "#888", fontWeight: "normal" }}>(optional — leave blank to add it at the end)</span>
          <input
            style={inputStyle}
            type="number"
            min="0"
            placeholder="(auto)"
            value={form.menuPosition}
            onChange={(e) => setForm((prev) => ({ ...prev, menuPosition: e.target.value }))}
          />
        </label>
      </section>

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button type="submit" style={buttonStyle} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
        <button type="button" style={buttonStyle} onClick={() => router.push("/admin/pages")} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  );
}
