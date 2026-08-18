"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

const buttonStyle = { padding: "0.4rem 0.8rem", cursor: "pointer" };
const inputStyle = { padding: "0.4rem 0.5rem", fontSize: "1rem" };
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

function truncate(text, max = 120) {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

const STATUS_LABELS = { pending: "Pending", approved: "Approved", spam: "Spam" };

export default function CommentsManager() {
  const router = useRouter();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  // Default to "pending" — a moderation inbox is most useful starting on
  // what actually needs a decision, matching the original PDF's
  // "Inbox-style list with Approve/Delete buttons" requirement. The API
  // itself is unopinionated (returns every status unless filtered).
  const [statusFilter, setStatusFilter] = useState("pending");
  const [page, setPage] = useState(1);
  const limit = 20;

  const [comments, setComments] = useState(null); // null = loading
  const [pagination, setPagination] = useState({ page: 1, limit, total: 0, totalPages: 0 });
  const [listError, setListError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [actioningId, setActioningId] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Debounce the free-text search box so every keystroke doesn't fire a
  // request; the status filter applies immediately since it's a single
  // discrete choice, not continuous typing.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, statusFilter]);

  async function loadComments() {
    setListError("");
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);

      const res = await apiFetch(`/api/admin/comments?${params.toString()}`);
      const data = await parseJsonSafe(res);

      if (!res.ok) {
        setListError(data?.error?.message ?? "Failed to load comments.");
        setComments([]);
        return;
      }

      setComments(data.data ?? []);
      setPagination(data.pagination ?? { page: 1, limit, total: 0, totalPages: 0 });
    } catch {
      setListError("Failed to load comments.");
      setComments([]);
    }
  }

  async function changeStatus(comment, status) {
    setActioningId(comment.id);
    setListError("");
    setSuccessMessage("");
    try {
      const res = await apiFetch(`/api/admin/comments/${comment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await parseJsonSafe(res);

      if (!res.ok) {
        setListError(data?.error?.message ?? "Could not update this comment.");
        setActioningId(null);
        return;
      }

      setSuccessMessage(`Marked as ${STATUS_LABELS[status].toLowerCase()}.`);
      setActioningId(null);
      await loadComments();
    } catch {
      setListError("Could not update this comment.");
      setActioningId(null);
    }
  }

  function confirmDelete(comment) {
    setDeleteTarget(comment);
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
      const res = await apiFetch(`/api/admin/comments/${deleteTarget.id}`, { method: "DELETE" });
      const data = await parseJsonSafe(res);

      if (!res.ok) {
        setDeleteError(data?.error?.message ?? "Could not delete this comment.");
        setDeleteLoading(false);
        return;
      }

      setSuccessMessage(`Deleted comment from "${deleteTarget.readerName}".`);
      setDeleteTarget(null);
      setDeleteLoading(false);
      await loadComments();
    } catch {
      setDeleteError("Something went wrong. Please try again.");
      setDeleteLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Comments</h1>
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

      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
        <input
          style={{ ...inputStyle, minWidth: "220px" }}
          type="text"
          placeholder="Search name, email, or message…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <select
          style={inputStyle}
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="spam">Spam</option>
        </select>
      </div>

      {comments === null ? (
        <p>Loading comments…</p>
      ) : comments.length === 0 ? (
        <div style={{ padding: "1.5rem", border: "1px dashed #ccc", borderRadius: "6px" }}>
          <p>{search || statusFilter ? "No comments match these filters." : "No comments yet."}</p>
        </div>
      ) : (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Post</th>
                <th style={thStyle}>Commenter</th>
                <th style={thStyle}>Message</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {comments.map((comment) => (
                <tr key={comment.id}>
                  <td style={tdStyle}>{comment.post?.title ?? <em>—</em>}</td>
                  <td style={tdStyle}>
                    <div>{comment.readerName}</div>
                    <div style={{ color: "#888", fontSize: "0.85rem" }}>{comment.email}</div>
                  </td>
                  <td style={tdStyle}>{truncate(comment.message)}</td>
                  <td style={tdStyle}>{STATUS_LABELS[comment.status] ?? comment.status}</td>
                  <td style={tdStyle}>{formatDate(comment.createdAt)}</td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                      <button type="button" style={buttonStyle} onClick={() => router.push(`/admin/comments/${comment.id}`)}>
                        View
                      </button>
                      {comment.status !== "approved" ? (
                        <button
                          type="button"
                          style={buttonStyle}
                          disabled={actioningId === comment.id}
                          onClick={() => changeStatus(comment, "approved")}
                        >
                          Approve
                        </button>
                      ) : null}
                      {comment.status !== "spam" ? (
                        <button
                          type="button"
                          style={buttonStyle}
                          disabled={actioningId === comment.id}
                          onClick={() => changeStatus(comment, "spam")}
                        >
                          Spam
                        </button>
                      ) : null}
                      <button type="button" style={buttonStyle} onClick={() => confirmDelete(comment)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <button type="button" style={buttonStyle} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              ← Prev
            </button>
            <span>
              Page {pagination.page} of {Math.max(1, pagination.totalPages)} ({pagination.total} comments)
            </span>
            <button
              type="button"
              style={buttonStyle}
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next →
            </button>
          </div>
        </>
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
            Delete the comment from <strong>{deleteTarget.readerName}</strong>? This can&apos;t be undone.
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
