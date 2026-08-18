"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  name: "",
  bio: "",
  photoUrl: "",
  facebookUrl: "",
  twitterUrl: "",
  instagramUrl: "",
};

export default function AuthorForm({ mode, authorId }) {
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
        const res = await apiFetch(`/api/admin/authors/${authorId}`);
        const data = await parseJsonSafe(res);
        if (!res.ok) {
          throw new Error(data?.error?.message ?? "Failed to load this author.");
        }
        if (cancelled) return;
        const author = data.author;
        setForm({
          name: author.name,
          bio: author.bio ?? "",
          photoUrl: author.photoUrl ?? "",
          facebookUrl: author.facebookUrl ?? "",
          twitterUrl: author.twitterUrl ?? "",
          instagramUrl: author.instagramUrl ?? "",
        });
      } catch (err) {
        if (!cancelled) setLoadError(err.message || "Failed to load this author.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isEditing, authorId]);

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");
    setSuccessMessage("");
    setSaving(true);

    const payload = {
      name: form.name,
      bio: form.bio,
      photoUrl: form.photoUrl,
      facebookUrl: form.facebookUrl,
      twitterUrl: form.twitterUrl,
      instagramUrl: form.instagramUrl,
    };

    try {
      const res = await apiFetch(isEditing ? `/api/admin/authors/${authorId}` : "/api/admin/authors", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await parseJsonSafe(res);

      if (!res.ok) {
        setFormError(data?.error?.message ?? "Could not save this author.");
        setSaving(false);
        return;
      }

      if (isEditing) {
        setSuccessMessage("Author updated.");
        setSaving(false);
      } else {
        // Created -> continue editing the now-persisted author, same
        // pattern used by the Posts/Pages/Books/Awards editors.
        router.push(`/admin/authors/${data.author.id}/edit`);
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
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: "560px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>{isEditing ? "Edit Author" : "Add Author"}</h1>
        <button type="button" style={buttonStyle} onClick={() => router.push("/admin/authors")}>
          ← Back to Authors
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
        <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Details</h2>

        <label style={labelStyle}>
          Name
          <input
            style={inputStyle}
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          />
        </label>

        <label style={labelStyle}>
          Bio <span style={{ color: "#888", fontWeight: "normal" }}>(optional)</span>
          <textarea
            style={{ ...inputStyle, fontFamily: "inherit", minHeight: "100px" }}
            value={form.bio}
            onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
          />
        </label>

        <label style={labelStyle}>
          Photo URL <span style={{ color: "#888", fontWeight: "normal" }}>(optional — upload via Media, then paste the URL here)</span>
          <input
            style={inputStyle}
            type="text"
            placeholder="https://…"
            value={form.photoUrl}
            onChange={(e) => setForm((prev) => ({ ...prev, photoUrl: e.target.value }))}
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
            value={form.facebookUrl}
            onChange={(e) => setForm((prev) => ({ ...prev, facebookUrl: e.target.value }))}
          />
        </label>

        <label style={labelStyle}>
          Twitter URL <span style={{ color: "#888", fontWeight: "normal" }}>(optional)</span>
          <input
            style={inputStyle}
            type="text"
            placeholder="https://…"
            value={form.twitterUrl}
            onChange={(e) => setForm((prev) => ({ ...prev, twitterUrl: e.target.value }))}
          />
        </label>

        <label style={labelStyle}>
          Instagram URL <span style={{ color: "#888", fontWeight: "normal" }}>(optional)</span>
          <input
            style={inputStyle}
            type="text"
            placeholder="https://…"
            value={form.instagramUrl}
            onChange={(e) => setForm((prev) => ({ ...prev, instagramUrl: e.target.value }))}
          />
        </label>
      </section>

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button type="submit" style={buttonStyle} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
        <button type="button" style={buttonStyle} onClick={() => router.push("/admin/authors")} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  );
}
