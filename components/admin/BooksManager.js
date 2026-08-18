"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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

function formatDate(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function BooksManager() {
  const router = useRouter();

  const [books, setBooks] = useState(null); // null = loading
  const [listError, setListError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    loadBooks();
  }, []);

  async function loadBooks() {
    setListError("");
    try {
      const res = await fetch("/api/admin/books");
      const data = await parseJsonSafe(res);
      if (!res.ok) {
        setListError(data?.error?.message ?? "Failed to load books.");
        setBooks([]);
        return;
      }
      setBooks(data.books ?? []);
    } catch {
      setListError("Failed to load books.");
      setBooks([]);
    }
  }

  function confirmDelete(book) {
    setDeleteTarget(book);
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
      const res = await fetch(`/api/admin/books/${deleteTarget.id}`, { method: "DELETE" });
      const data = await parseJsonSafe(res);

      if (!res.ok) {
        setDeleteError(data?.error?.message ?? "Could not delete this book.");
        setDeleteLoading(false);
        return;
      }

      setSuccessMessage(`Deleted "${deleteTarget.title}".`);
      setDeleteTarget(null);
      setDeleteLoading(false);
      await loadBooks();
    } catch {
      setDeleteError("Something went wrong. Please try again.");
      setDeleteLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Books</h1>
        <button type="button" style={buttonStyle} onClick={() => router.push("/admin/books/new")}>
          + Add Book
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

      {books === null ? (
        <p>Loading books…</p>
      ) : books.length === 0 ? (
        <div style={{ padding: "1.5rem", border: "1px dashed #ccc", borderRadius: "6px" }}>
          <p>No books yet.</p>
          <button type="button" style={buttonStyle} onClick={() => router.push("/admin/books/new")}>
            + Add Book
          </button>
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Cover</th>
              <th style={thStyle}>Title</th>
              <th style={thStyle}>Published Year</th>
              <th style={thStyle}>Buy Links</th>
              <th style={thStyle}>Updated</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {books.map((book) => (
              <tr key={book.id}>
                <td style={tdStyle}>
                  {book.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- admin-supplied external URL, not a project asset
                    <img
                      src={book.coverImageUrl}
                      alt=""
                      style={{ width: "36px", height: "48px", objectFit: "cover", borderRadius: "3px" }}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <em style={{ color: "#888" }}>—</em>
                  )}
                </td>
                <td style={tdStyle}>{book.title}</td>
                <td style={tdStyle}>{book.publishedYear ?? <em>—</em>}</td>
                <td style={tdStyle}>{book.buyLinkCount}</td>
                <td style={tdStyle}>{formatDate(book.updatedAt)}</td>
                <td style={tdStyle}>
                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                    <button type="button" style={buttonStyle} onClick={() => router.push(`/admin/books/${book.id}/edit`)}>
                      Edit
                    </button>
                    <button type="button" style={buttonStyle} onClick={() => confirmDelete(book)}>
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
            Delete book <strong>{deleteTarget.title}</strong>? This can&apos;t be undone.
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
