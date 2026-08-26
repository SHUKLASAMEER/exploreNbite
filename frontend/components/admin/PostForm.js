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

function toDatetimeLocalValue(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const emptyForm = {
  title: "",
  slug: "",
  categoryId: "",
  categoryIds: [],
  authorId: "",
  featuredImageUrl: "",
  shortDescription: "",
  content: "",
  status: "draft",
  allowComments: true,
  sticky: false,
  publishDate: toDatetimeLocalValue(new Date().toISOString()),
  tags: [],
};

export default function PostForm({ mode, postId }) {
  const router = useRouter();
  const isEditing = mode === "edit";

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [categories, setCategories] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [allTags, setAllTags] = useState([]);

  const [form, setForm] = useState(emptyForm);
  const [tagInput, setTagInput] = useState("");

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError("");
      try {
        const requests = [
          apiFetch("/api/admin/categories"),
          apiFetch("/api/admin/authors"),
          apiFetch("/api/admin/tags"),
        ];
        if (isEditing) {
          requests.push(apiFetch(`/api/admin/posts/${postId}`));
        }

        const responses = await Promise.all(requests);
        const [categoriesRes, authorsRes, tagsRes, postRes] = responses;

        if (!categoriesRes.ok || !authorsRes.ok || !tagsRes.ok || (postRes && !postRes.ok)) {
          throw new Error("Failed to load the data this form needs.");
        }

        const categoriesData = await categoriesRes.json();
        const authorsData = await authorsRes.json();
        const tagsData = await tagsRes.json();

        if (cancelled) return;
        setCategories(categoriesData.categories ?? []);
        setAuthors(authorsData.authors ?? []);
        setAllTags(tagsData.tags ?? []);

        if (isEditing && postRes) {
          const postData = await postRes.json();
          const post = postData.post;
          if (cancelled) return;
          setForm({
            title: post.title,
            slug: post.slug,
            categoryId: String(post.category.id),
            // `categories` is the full set (primary + extra); the extra
            // ones are whatever's left after excluding the primary.
            categoryIds: (post.categories ?? [])
              .filter((c) => c.id !== post.category.id)
              .map((c) => String(c.id)),
            authorId: String(post.author.id),
            featuredImageUrl: post.featuredImageUrl ?? "",
            shortDescription: post.shortDescription ?? "",
            content: post.content,
            status: post.status,
            allowComments: post.allowComments,
            sticky: post.sticky ?? false,
            publishDate: toDatetimeLocalValue(post.publishDate),
            tags: post.tags.map((t) => t.name),
          });
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err.message || "Failed to load this form.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isEditing, postId]);

  function addTag(rawName) {
    const name = rawName.trim();
    if (!name) return;
    // Simple case-insensitive check for the UI hint only — the backend's
    // slug-based matching (utils/validation/posts.js#resolveTagIds) is what
    // actually prevents duplicate tags; this doesn't need to replicate that
    // exact algorithm client-side.
    const key = name.toLowerCase();
    setForm((prev) => {
      if (prev.tags.some((t) => t.toLowerCase() === key)) return prev;
      return { ...prev, tags: [...prev.tags, name] };
    });
    setTagInput("");
  }

  function removeTag(name) {
    setForm((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== name) }));
  }

  function handleTagInputKeyDown(event) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTag(tagInput);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");
    setSuccessMessage("");
    setSaving(true);

    const payload = {
      title: form.title,
      slug: form.slug,
      categoryId: form.categoryId ? Number(form.categoryId) : undefined,
      categoryIds: form.categoryIds.map(Number),
      authorId: form.authorId ? Number(form.authorId) : undefined,
      featuredImageUrl: form.featuredImageUrl,
      shortDescription: form.shortDescription,
      content: form.content,
      status: form.status,
      allowComments: form.allowComments,
      sticky: form.sticky,
      publishDate: form.publishDate ? new Date(form.publishDate).toISOString() : undefined,
      tags: form.tags,
    };

    try {
      const res = await apiFetch(isEditing ? `/api/admin/posts/${postId}` : "/api/admin/posts", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await parseJsonSafe(res);

      if (!res.ok) {
        setFormError(data?.error?.message ?? "Could not save this post.");
        setSaving(false);
        return;
      }

      if (isEditing) {
        setSuccessMessage("Post updated.");
        setSaving(false);
      } else {
        // Created -> continue editing the now-persisted post, same pattern
        // most CMS post editors use.
        router.push(`/admin/posts/${data.post.id}/edit`);
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

  const suggestedTags = allTags.filter(
    (t) => !form.tags.some((name) => name.toLowerCase() === t.name.toLowerCase())
  );

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: "720px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>{isEditing ? "Edit Post" : "Add Post"}</h1>
        <button type="button" style={buttonStyle} onClick={() => router.push("/admin/posts")}>
          ← Back to Posts
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

        <label style={labelStyle}>
          Category
          <select
            style={inputStyle}
            required
            value={form.categoryId}
            onChange={(e) => setForm((prev) => ({ ...prev, categoryId: e.target.value }))}
          >
            <option value="" disabled>
              Select a category…
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <div style={labelStyle}>
          Additional categories{" "}
          <span style={{ color: "#888", fontWeight: "normal" }}>
            (optional — a post can also show up under other category listings besides its primary one above)
          </span>
          <div style={{ display: "flex", gap: "0.9rem", flexWrap: "wrap" }}>
            {categories
              .filter((c) => String(c.id) !== form.categoryId)
              .map((c) => (
                <label key={c.id} style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.9rem", fontWeight: "normal" }}>
                  <input
                    type="checkbox"
                    checked={form.categoryIds.includes(String(c.id))}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        categoryIds: e.target.checked
                          ? [...prev.categoryIds, String(c.id)]
                          : prev.categoryIds.filter((id) => id !== String(c.id)),
                      }))
                    }
                  />
                  {c.name}
                </label>
              ))}
          </div>
        </div>

        <label style={labelStyle}>
          Author
          <select style={inputStyle} required value={form.authorId} onChange={(e) => setForm((prev) => ({ ...prev, authorId: e.target.value }))}>
            <option value="" disabled>
              Select an author…
            </option>
            {authors.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>

        <label style={labelStyle}>
          Featured Image URL
          <input
            style={inputStyle}
            type="text"
            placeholder="https://…"
            value={form.featuredImageUrl}
            onChange={(e) => setForm((prev) => ({ ...prev, featuredImageUrl: e.target.value }))}
          />
        </label>

        <label style={labelStyle}>
          Short Description
          <textarea
            style={{ ...inputStyle, fontFamily: "inherit", minHeight: "60px" }}
            maxLength={300}
            value={form.shortDescription}
            onChange={(e) => setForm((prev) => ({ ...prev, shortDescription: e.target.value }))}
          />
        </label>
      </section>

      <section style={sectionStyle}>
        <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Content</h2>
        <RichTextEditor value={form.content} onChange={(html) => setForm((prev) => ({ ...prev, content: html }))} />
      </section>

      <section style={sectionStyle}>
        <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Tags</h2>

        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          {form.tags.length === 0 ? <em style={{ color: "#888" }}>No tags yet.</em> : null}
          {form.tags.map((name) => (
            <span
              key={name}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                background: "#eef",
                borderRadius: "999px",
                padding: "0.2rem 0.6rem",
                fontSize: "0.85rem",
              }}
            >
              {name}
              <button
                type="button"
                onClick={() => removeTag(name)}
                aria-label={`Remove tag ${name}`}
                style={{ border: "none", background: "none", cursor: "pointer", padding: 0, lineHeight: 1 }}
              >
                ×
              </button>
            </span>
          ))}
        </div>

        <label style={labelStyle}>
          Add a tag
          <input
            style={inputStyle}
            type="text"
            placeholder="Type a tag and press Enter"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagInputKeyDown}
          />
        </label>
        <button type="button" style={buttonStyle} onClick={() => addTag(tagInput)}>
          + Add Tag
        </button>

        {suggestedTags.length > 0 ? (
          <div>
            <p style={{ margin: "0 0 0.4rem", fontSize: "0.85rem", color: "#666" }}>Existing tags:</p>
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
              {suggestedTags.map((t) => (
                <button key={t.id} type="button" style={buttonStyle} onClick={() => addTag(t.name)}>
                  + {t.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section style={sectionStyle}>
        <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Publishing</h2>

        <label style={labelStyle}>
          Status
          <select style={inputStyle} value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </label>

        <label style={labelStyle}>
          Publish Date
          <input
            style={inputStyle}
            type="datetime-local"
            value={form.publishDate}
            onChange={(e) => setForm((prev) => ({ ...prev, publishDate: e.target.value }))}
          />
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem" }}>
          <input
            type="checkbox"
            checked={form.allowComments}
            onChange={(e) => setForm((prev) => ({ ...prev, allowComments: e.target.checked }))}
          />
          Allow comments
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem" }}>
          <input
            type="checkbox"
            checked={form.sticky}
            onChange={(e) => setForm((prev) => ({ ...prev, sticky: e.target.checked }))}
          />
          Sticky{" "}
          <span style={{ color: "#888" }}>(pinned above other posts on the homepage feed, newest-sticky-first)</span>
        </label>
      </section>

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button type="submit" style={buttonStyle} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
        <button type="button" style={buttonStyle} onClick={() => router.push("/admin/posts")} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  );
}
