"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

const buttonStyle = { padding: "0.4rem 0.8rem", cursor: "pointer" };
const thStyle = { textAlign: "left", padding: "0.5rem", borderBottom: "2px solid #ccc" };
const tdStyle = { padding: "0.5rem", borderBottom: "1px solid #eee", verticalAlign: "top" };

async function parseJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function truncate(value, max) {
  if (!value) return "";
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

export default function AuthorsManager() {
  const router = useRouter();

  const [authors, setAuthors] = useState(null); // null = loading
  const [listError, setListError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    loadAuthors();
  }, []);

  async function loadAuthors() {
    setListError("");
    try {
      const res = await apiFetch("/api/admin/authors");
      const data = await parseJsonSafe(res);
      if (!res.ok) {
        setListError(data?.error?.message ?? "Failed to load authors.");
        setAuthors([]);
        return;
      }
      setAuthors(data.authors ?? []);
    } catch {
      setListError("Failed to load authors.");
      setAuthors([]);
    }
  }

  function confirmDelete(author) {
    setDeleteTarget(author);
    setDeleteError("");
  }

  function cancelDelete() {
    setDeleteTarget(null);
    setDeleteError("");
  }

  async function performDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setDeleteError("");

    try {
      const res = await apiFetch(`/api/admin/authors/${deleteTarget.id}`, { method: "DELETE" });
      const data = await parseJsonSafe(res);

      if (!res.ok) {
        // e.g. 409 CONFLICT because posts still credit this author — keep
        // the dialog open and show why, don't remove it from the list.
        setDeleteError(data?.error?.message ?? "Could not delete this author.");
        setDeleteLoading(false);
        return;
      }

      setSuccessMessage(`Deleted "${deleteTarget.name}".`);
      setDeleteTarget(null);
      setDeleteLoading(false);
      await loadAuthors();
    } catch {
      setDeleteError("Something went wrong. Please try again.");
      setDeleteLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Authors</h1>
        <button type="button" style={buttonStyle} onClick={() => router.push("/admin/authors/new")}>
          + Add Author
        </button>
      </div>

      {successMessage ? (
        <p role="status" style={{ color: "green", margin: 0 }}>
          {successMessage}
        </p>
      ) : null}
      {listError ? (
        <p role="alert" style={{ color: "crimson", margin: 0 }}>
          {listError}
        </p>
      ) : null}

      {authors === null ? (
        <p>Loading authors…</p>
      ) : authors.length === 0 ? (
        <div style={{ padding: "1.5rem", border: "1px dashed #ccc", borderRadius: "6px" }}>
          <p>No authors yet.</p>
          <button type="button" style={buttonStyle} onClick={() => router.push("/admin/authors/new")}>
            + Add Author
          </button>
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Photo</th>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Bio</th>
              <th style={thStyle}>Posts</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {authors.map((author) => (
              <tr key={author.id}>
                <td style={tdStyle}>
                  {author.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- admin-supplied URL (often our own /uploads media), not a project asset
                    <img
                      src={author.photoUrl}
                      alt=""
                      style={{ width: "40px", height: "40px", objectFit: "cover", borderRadius: "50%" }}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <em style={{ color: "#888" }}>—</em>
                  )}
                </td>
                <td style={tdStyle}>{author.name}</td>
                <td style={tdStyle}>{truncate(author.bio, 80) || <em style={{ color: "#888" }}>—</em>}</td>
                <td style={tdStyle}>{author._count?.posts ?? 0}</td>
                <td style={tdStyle}>
                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                    <button type="button" style={buttonStyle} onClick={() => router.push(`/admin/authors/${author.id}/edit`)}>
                      Edit
                    </button>
                    <button type="button" style={buttonStyle} onClick={() => confirmDelete(author)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {deleteTarget ? (
        <div
          role="alertdialog"
          aria-label="Confirm delete"
          style={{
            border: "1px solid #ddd",
            borderRadius: "6px",
            padding: "1rem",
            maxWidth: "420px",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          <p style={{ margin: 0 }}>
            Delete author <strong>{deleteTarget.name}</strong>? This can&apos;t be undone.
          </p>

          {deleteError ? (
            <p role="alert" style={{ color: "crimson", margin: 0, fontSize: "0.9rem" }}>
              {deleteError}
            </p>
          ) : null}

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="button" style={buttonStyle} onClick={performDelete} disabled={deleteLoading}>
              {deleteLoading ? "Deleting…" : "Delete"}
            </button>
            <button type="button" style={buttonStyle} onClick={cancelDelete} disabled={deleteLoading}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
