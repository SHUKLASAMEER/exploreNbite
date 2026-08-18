"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
  coverImageUrl: "",
  publishedYear: "",
  description: "",
  buyLinks: [],
};

export default function BookForm({ mode, bookId }) {
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
        const res = await fetch(`/api/admin/books/${bookId}`);
        const data = await parseJsonSafe(res);
        if (!res.ok) {
          throw new Error(data?.error?.message ?? "Failed to load this book.");
        }
        if (cancelled) return;
        const book = data.book;
        setForm({
          title: book.title,
          coverImageUrl: book.coverImageUrl ?? "",
          publishedYear: book.publishedYear === null || book.publishedYear === undefined ? "" : String(book.publishedYear),
          description: book.description,
          buyLinks: book.buyLinks
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((link) => ({ platformName: link.platformName, url: link.url })),
        });
      } catch (err) {
        if (!cancelled) setLoadError(err.message || "Failed to load this book.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isEditing, bookId]);

  function addBuyLink() {
    setForm((prev) => ({ ...prev, buyLinks: [...prev.buyLinks, { platformName: "", url: "" }] }));
  }

  function updateBuyLink(index, field, value) {
    setForm((prev) => ({
      ...prev,
      buyLinks: prev.buyLinks.map((link, i) => (i === index ? { ...link, [field]: value } : link)),
    }));
  }

  function removeBuyLink(index) {
    setForm((prev) => ({ ...prev, buyLinks: prev.buyLinks.filter((_, i) => i !== index) }));
  }

  function moveBuyLink(index, direction) {
    setForm((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.buyLinks.length) return prev;
      const links = [...prev.buyLinks];
      [links[index], links[target]] = [links[target], links[index]];
      return { ...prev, buyLinks: links };
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");
    setSuccessMessage("");
    setSaving(true);

    const payload = {
      title: form.title,
      coverImageUrl: form.coverImageUrl,
      publishedYear: form.publishedYear === "" ? null : Number(form.publishedYear),
      description: form.description,
      // Array position IS the order — same "position, not a separate typed
      // number" approach as Categories' reorder endpoint.
      buyLinks: form.buyLinks.map((link, index) => ({ ...link, sortOrder: index })),
    };

    try {
      const res = await fetch(isEditing ? `/api/admin/books/${bookId}` : "/api/admin/books", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await parseJsonSafe(res);

      if (!res.ok) {
        setFormError(data?.error?.message ?? "Could not save this book.");
        setSaving(false);
        return;
      }

      if (isEditing) {
        setSuccessMessage("Book updated.");
        setSaving(false);
      } else {
        // Created -> continue editing the now-persisted book, same pattern
        // used by the Posts/Pages editors.
        router.push(`/admin/books/${data.book.id}/edit`);
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
        <h1 style={{ margin: 0 }}>{isEditing ? "Edit Book" : "Add Book"}</h1>
        <button type="button" style={buttonStyle} onClick={() => router.push("/admin/books")}>
          ← Back to Books
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
        <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Basic Information</h2>

        <label style={labelStyle}>
          Book Title
          <input
            style={inputStyle}
            type="text"
            required
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
          />
        </label>

        <label style={labelStyle}>
          Cover Image URL
          <input
            style={inputStyle}
            type="text"
            placeholder="https://…"
            value={form.coverImageUrl}
            onChange={(e) => setForm((prev) => ({ ...prev, coverImageUrl: e.target.value }))}
          />
        </label>

        <label style={labelStyle}>
          Published Year <span style={{ color: "#888", fontWeight: "normal" }}>(optional)</span>
          <input
            style={inputStyle}
            type="number"
            placeholder="e.g. 2021"
            value={form.publishedYear}
            onChange={(e) => setForm((prev) => ({ ...prev, publishedYear: e.target.value }))}
          />
        </label>

        <label style={labelStyle}>
          Description
          <textarea
            style={{ ...inputStyle, fontFamily: "inherit", minHeight: "120px" }}
            required
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          />
        </label>
      </section>

      <section style={sectionStyle}>
        <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Buy Links</h2>

        {form.buyLinks.length === 0 ? <em style={{ color: "#888" }}>No buy links yet.</em> : null}

        {form.buyLinks.map((link, index) => (
          <div
            key={index}
            style={{
              display: "flex",
              gap: "0.5rem",
              alignItems: "flex-end",
              flexWrap: "wrap",
              borderBottom: index < form.buyLinks.length - 1 ? "1px solid #eee" : "none",
              paddingBottom: "0.75rem",
            }}
          >
            <label style={{ ...labelStyle, flex: "1 1 160px" }}>
              Platform Name
              <input
                style={inputStyle}
                type="text"
                placeholder="e.g. Amazon"
                value={link.platformName}
                onChange={(e) => updateBuyLink(index, "platformName", e.target.value)}
              />
            </label>
            <label style={{ ...labelStyle, flex: "2 1 240px" }}>
              URL
              <input
                style={inputStyle}
                type="text"
                placeholder="https://…"
                value={link.url}
                onChange={(e) => updateBuyLink(index, "url", e.target.value)}
              />
            </label>
            <div style={{ display: "flex", gap: "0.35rem" }}>
              <button
                type="button"
                style={buttonStyle}
                onClick={() => moveBuyLink(index, -1)}
                disabled={index === 0}
                aria-label={`Move buy link ${index + 1} up`}
              >
                ↑
              </button>
              <button
                type="button"
                style={buttonStyle}
                onClick={() => moveBuyLink(index, 1)}
                disabled={index === form.buyLinks.length - 1}
                aria-label={`Move buy link ${index + 1} down`}
              >
                ↓
              </button>
              <button type="button" style={buttonStyle} onClick={() => removeBuyLink(index)}>
                Remove
              </button>
            </div>
          </div>
        ))}

        <button type="button" style={buttonStyle} onClick={addBuyLink}>
          + Add Buy Link
        </button>
      </section>

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button type="submit" style={buttonStyle} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
        <button type="button" style={buttonStyle} onClick={() => router.push("/admin/books")} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  );
}
