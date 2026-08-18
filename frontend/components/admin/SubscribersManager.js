"use client";

import { useEffect, useState } from "react";
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

export default function SubscribersManager() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const [subscribers, setSubscribers] = useState(null); // null = loading
  const [pagination, setPagination] = useState({ page: 1, limit, total: 0, totalPages: 0 });
  const [listError, setListError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Debounce the free-text search box so every keystroke doesn't fire a
  // request — same pattern as Posts/Comments.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    loadSubscribers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  async function loadSubscribers() {
    setListError("");
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (search) params.set("search", search);

      const res = await apiFetch(`/api/admin/subscribers?${params.toString()}`);
      const data = await parseJsonSafe(res);

      if (!res.ok) {
        setListError(data?.error?.message ?? "Failed to load subscribers.");
        setSubscribers([]);
        return;
      }

      setSubscribers(data.data ?? []);
      setPagination(data.pagination ?? { page: 1, limit, total: 0, totalPages: 0 });
    } catch {
      setListError("Failed to load subscribers.");
      setSubscribers([]);
    }
  }

  function confirmDelete(subscriber) {
    setDeleteTarget(subscriber);
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
      const res = await apiFetch(`/api/admin/subscribers/${deleteTarget.id}`, { method: "DELETE" });
      const data = await parseJsonSafe(res);

      if (!res.ok) {
        setDeleteError(data?.error?.message ?? "Could not delete this subscriber.");
        setDeleteLoading(false);
        return;
      }

      setSuccessMessage(`Removed "${deleteTarget.email}".`);
      setDeleteTarget(null);
      setDeleteLoading(false);
      await loadSubscribers();
    } catch {
      setDeleteError("Something went wrong. Please try again.");
      setDeleteLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>
          Subscribers{" "}
          {subscribers !== null ? (
            <span style={{ color: "#888", fontWeight: "normal", fontSize: "1rem" }}>({pagination.total})</span>
          ) : null}
        </h1>
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
          placeholder="Search by email…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      {subscribers === null ? (
        <p>Loading subscribers…</p>
      ) : subscribers.length === 0 ? (
        <div style={{ padding: "1.5rem", border: "1px dashed #ccc", borderRadius: "6px" }}>
          <p>{search ? "No subscribers match this search." : "No subscribers yet."}</p>
        </div>
      ) : (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Subscribed</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {subscribers.map((subscriber) => (
                <tr key={subscriber.id}>
                  <td style={tdStyle}>{subscriber.email}</td>
                  <td style={tdStyle}>{formatDate(subscriber.subscribedAt)}</td>
                  <td style={tdStyle}>
                    <button type="button" style={buttonStyle} onClick={() => confirmDelete(subscriber)}>
                      Delete
                    </button>
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
              Page {pagination.page} of {Math.max(1, pagination.totalPages)} ({pagination.total} subscribers)
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
            Remove subscriber <strong>{deleteTarget.email}</strong>? This can&apos;t be undone.
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
