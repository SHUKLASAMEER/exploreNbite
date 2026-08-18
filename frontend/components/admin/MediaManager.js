"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

const buttonStyle = { padding: "0.4rem 0.8rem", cursor: "pointer" };
const inputStyle = { padding: "0.4rem 0.5rem", fontSize: "1rem" };
const cardStyle = {
  border: "1px solid #ddd",
  borderRadius: "6px",
  padding: "0.75rem",
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
};

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

export default function MediaManager() {
  const router = useRouter();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 24; // a gallery grid reads better in a larger page size than a table

  const [media, setMedia] = useState(null); // null = loading
  const [pagination, setPagination] = useState({ page: 1, limit, total: 0, totalPages: 0 });
  const [listError, setListError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    loadMedia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  async function loadMedia() {
    setListError("");
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (search) params.set("search", search);

      const res = await apiFetch(`/api/admin/media?${params.toString()}`);
      const data = await parseJsonSafe(res);

      if (!res.ok) {
        setListError(data?.error?.message ?? "Failed to load media.");
        setMedia([]);
        return;
      }

      setMedia(data.data ?? []);
      setPagination(data.pagination ?? { page: 1, limit, total: 0, totalPages: 0 });
    } catch {
      setListError("Failed to load media.");
      setMedia([]);
    }
  }

  function startEdit(item) {
    setEditingId(item.id);
    setEditValue(item.altText ?? "");
    setEditError("");
    setSuccessMessage("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError("");
  }

  async function saveEdit(id) {
    setEditSaving(true);
    setEditError("");
    try {
      const res = await apiFetch(`/api/admin/media/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ altText: editValue }),
      });
      const data = await parseJsonSafe(res);

      if (!res.ok) {
        setEditError(data?.error?.message ?? "Could not update this image.");
        setEditSaving(false);
        return;
      }

      setSuccessMessage("Alt text updated.");
      setEditingId(null);
      setEditSaving(false);
      await loadMedia();
    } catch {
      setEditError("Something went wrong. Please try again.");
      setEditSaving(false);
    }
  }

  function confirmDelete(item) {
    setDeleteTarget(item);
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
      const res = await apiFetch(`/api/admin/media/${deleteTarget.id}`, { method: "DELETE" });
      const data = await parseJsonSafe(res);

      if (!res.ok) {
        setDeleteError(data?.error?.message ?? "Could not delete this image.");
        setDeleteLoading(false);
        return;
      }

      setSuccessMessage(`Deleted "${deleteTarget.fileName}".`);
      setDeleteTarget(null);
      setDeleteLoading(false);
      await loadMedia();
    } catch {
      setDeleteError("Something went wrong. Please try again.");
      setDeleteLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>
          Media{" "}
          {media !== null ? (
            <span style={{ color: "#888", fontWeight: "normal", fontSize: "1rem" }}>({pagination.total})</span>
          ) : null}
        </h1>
        <button type="button" style={buttonStyle} onClick={() => router.push("/admin/media/new")}>
          + Upload Image
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

      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
        <input
          style={{ ...inputStyle, minWidth: "220px" }}
          type="text"
          placeholder="Search by filename…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      {media === null ? (
        <p>Loading media…</p>
      ) : media.length === 0 ? (
        <div style={{ padding: "1.5rem", border: "1px dashed #ccc", borderRadius: "6px" }}>
          <p>{search ? "No images match this search." : "No images yet."}</p>
          <button type="button" style={buttonStyle} onClick={() => router.push("/admin/media/new")}>
            + Upload Image
          </button>
        </div>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "1rem",
            }}
          >
            {media.map((item) => (
              <div key={item.id} style={cardStyle}>
                {/* eslint-disable-next-line @next/next/no-img-element -- served from our own backend/uploads, not a project asset next/image can optimize across origins */}
                <img
                  src={item.fileUrl}
                  alt={item.altText ?? ""}
                  style={{ width: "100%", height: "140px", objectFit: "cover", borderRadius: "4px", background: "#f0f0f0" }}
                  onError={(e) => {
                    e.currentTarget.style.opacity = "0.3";
                  }}
                />
                <div style={{ fontSize: "0.85rem", wordBreak: "break-all" }}>{item.fileName}</div>
                <div style={{ fontSize: "0.8rem", color: "#888" }}>
                  {formatDate(item.createdAt)}
                  {item.uploader ? ` · ${item.uploader.name}` : ""}
                </div>

                {editingId === item.id ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    <input
                      style={inputStyle}
                      type="text"
                      placeholder="Alt text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                    />
                    {editError ? (
                      <p role="alert" style={{ color: "crimson", margin: 0, fontSize: "0.8rem" }}>
                        {editError}
                      </p>
                    ) : null}
                    <div style={{ display: "flex", gap: "0.35rem" }}>
                      <button type="button" style={buttonStyle} onClick={() => saveEdit(item.id)} disabled={editSaving}>
                        {editSaving ? "Saving…" : "Save"}
                      </button>
                      <button type="button" style={buttonStyle} onClick={cancelEdit} disabled={editSaving}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: "0.8rem", color: item.altText ? "inherit" : "#888" }}>
                      {item.altText || <em>No alt text</em>}
                    </div>
                    <div style={{ display: "flex", gap: "0.35rem" }}>
                      <button type="button" style={buttonStyle} onClick={() => startEdit(item)}>
                        Edit
                      </button>
                      <button type="button" style={buttonStyle} onClick={() => confirmDelete(item)}>
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <button type="button" style={buttonStyle} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              ← Prev
            </button>
            <span>
              Page {pagination.page} of {Math.max(1, pagination.totalPages)} ({pagination.total} images)
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
            Delete <strong>{deleteTarget.fileName}</strong>? This can&apos;t be undone.
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
