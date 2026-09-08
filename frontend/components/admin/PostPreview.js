"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/formatDate";
import ProseContent from "@/components/public/ProseContent";
import styles from "@/components/public/SinglePost.module.css";

// Client-side admin post preview. The editor (PostForm) writes the current
// (possibly unsaved) form state to localStorage under PREVIEW_KEY and opens
// this route in a named tab; this component reads it, has the backend
// sanitize the content HTML with the SAME rules as the real save path
// (POST /api/admin/posts/preview — admin-only, persists nothing), and
// renders it with the public single-post components/styles.
//
// Nothing here is public: the route is behind requireAdminOrRedirect(), the
// data lives only in the admin's own browser (localStorage, same-origin),
// and the sanitize call requires an admin session. The real public post
// route (/posts/[slug]) is untouched and still only serves published posts.
export const PREVIEW_KEY = "enbite:post-preview";

const bannerStyle = {
  position: "sticky",
  top: 0,
  zIndex: 50,
  display: "flex",
  flexWrap: "wrap",
  gap: "12px",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "10px 16px",
  margin: "0 0 24px",
  background: "#2b2b2b",
  color: "#fff",
  fontFamily: "system-ui, sans-serif",
  fontSize: "13px",
  borderRadius: "6px",
};

const btnStyle = {
  padding: "6px 12px",
  fontSize: "13px",
  borderRadius: "4px",
  border: "1px solid rgba(255,255,255,0.4)",
  background: "transparent",
  color: "#fff",
  cursor: "pointer",
  textDecoration: "none",
};

function readPreview() {
  try {
    const raw = window.localStorage.getItem(PREVIEW_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function PostPreview() {
  const [data, setData] = useState(null);
  const [safeHtml, setSafeHtml] = useState("");
  const [state, setState] = useState("loading"); // loading | ready | empty

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const preview = readPreview();
      if (!preview) {
        if (!cancelled) setState("empty");
        return;
      }
      if (!cancelled) {
        setData(preview);
        setState("ready");
      }
      try {
        const res = await apiFetch("/api/admin/posts/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: preview.content ?? "" }),
        });
        const json = await res.json().catch(() => null);
        if (!cancelled) setSafeHtml(res.ok ? json?.content ?? "" : "");
      } catch {
        if (!cancelled) setSafeHtml("");
      }
    }

    hydrate();

    // Live refresh: clicking "Preview" again in the editor rewrites the key.
    function onStorage(event) {
      if (event.key === PREVIEW_KEY) hydrate();
    }
    window.addEventListener("storage", onStorage);
    return () => {
      cancelled = true;
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  if (state === "loading") {
    return <p style={{ fontFamily: "system-ui, sans-serif" }}>Loading preview…</p>;
  }

  if (state === "empty") {
    return (
      <div style={{ fontFamily: "system-ui, sans-serif" }}>
        <p>No preview data found. Open a post in the editor and click “Preview”.</p>
        <p>
          <Link href="/admin/posts">← Back to Posts</Link>
        </p>
      </div>
    );
  }

  const publicHref =
    data.isEditing && data.status === "published" && data.slug ? `/posts/${data.slug}` : null;
  const editHref = data.isEditing && data.postId ? `/admin/posts/${data.postId}/edit` : "/admin/posts/new";

  return (
    <div>
      <div style={bannerStyle}>
        <span>
          <strong>PREVIEW</strong> — unsaved editor content. Not published, not visible to the public.
        </span>
        <span style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button type="button" style={btnStyle} onClick={() => window.close()}>
            ✕ Close preview
          </button>
          <Link href={editHref} style={btnStyle}>
            Back to Edit
          </Link>
          {publicHref ? (
            <a href={publicHref} target="_blank" rel="noreferrer" style={btnStyle}>
              Open public version ↗
            </a>
          ) : null}
        </span>
      </div>

      <article>
        {data.featuredImageUrl ? (
          <div className={styles.media}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={data.featuredImageUrl} alt={data.title || "Featured image"} />
          </div>
        ) : null}

        <header className={styles.header}>
          {data.category?.name ? (
            <span className={styles.category}>{data.category.name}</span>
          ) : null}
          <h1 className={styles.title}>{data.title || "Untitled post"}</h1>
          <div className={styles.meta}>
            {formatDate(data.publishDate) || "Not dated yet"}
            {data.author?.name ? (
              <>
                <span className={styles.metaSep}>/</span>
                By {data.author.name}
              </>
            ) : null}
          </div>
        </header>

        {safeHtml ? (
          <ProseContent html={safeHtml} />
        ) : (
          <p style={{ color: "var(--enb-meta)", fontStyle: "italic" }}>No content yet.</p>
        )}

        {Array.isArray(data.tags) && data.tags.length > 0 ? (
          <div className={styles.tags}>
            {data.tags.map((tag) => (
              <span key={tag} className={styles.tag}>
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </article>
    </div>
  );
}
