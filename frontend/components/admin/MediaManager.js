"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Check, X, ImageOff } from "lucide-react";
import { apiFetch } from "@/lib/api";
import PageHeader from "@/components/admin/ui/PageHeader";
import Button from "@/components/admin/ui/Button";
import SearchInput from "@/components/admin/ui/SearchInput";
import Pagination from "@/components/admin/ui/Pagination";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import EmptyState from "@/components/admin/ui/EmptyState";
import LoadingState from "@/components/admin/ui/LoadingState";
import ErrorState from "@/components/admin/ui/ErrorState";
import { useToast } from "@/components/admin/ui/Toast";
import styles from "./MediaManager.module.css";

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

// One media library tile — its own edit-in-place state (alt text) lives
// here, scoped to this card only.
function MediaCard({ item, isEditing, editValue, editSaving, editError, onEditValueChange, onStartEdit, onSaveEdit, onCancelEdit, onDelete }) {
  return (
    <div className={styles.card}>
      {/* eslint-disable-next-line @next/next/no-img-element -- served from our own backend/uploads, not a project asset next/image can optimize across origins */}
      <img
        src={item.fileUrl}
        alt={item.altText ?? ""}
        className={styles.thumb}
        onError={(e) => {
          e.currentTarget.style.opacity = "0.25";
        }}
      />

      <div className={styles.fileName}>{item.fileName}</div>
      <div className={styles.meta}>
        {formatDate(item.createdAt)}
        {item.uploader ? ` · ${item.uploader.name}` : ""}
      </div>

      {isEditing ? (
        <div className={styles.editRow}>
          <input
            className={styles.editInput}
            type="text"
            placeholder="Alt text"
            value={editValue}
            onChange={(e) => onEditValueChange(e.target.value)}
            autoFocus
          />
          {editError ? <p className={styles.editError}>{editError}</p> : null}
          <div className={styles.cardActions}>
            <Button variant="primary" size="sm" icon={Check} onClick={onSaveEdit} disabled={editSaving}>
              {editSaving ? "Saving…" : "Save"}
            </Button>
            <Button variant="ghost" size="sm" icon={X} onClick={onCancelEdit} disabled={editSaving}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className={item.altText ? styles.altText : styles.altTextEmpty}>{item.altText || "No alt text"}</div>
          <div className={styles.cardActions}>
            <Button variant="ghost" size="sm" icon={Pencil} onClick={onStartEdit}>
              Edit
            </Button>
            <Button variant="ghost" size="sm" icon={Trash2} onClick={onDelete}>
              Delete
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export default function MediaManager() {
  const router = useRouter();
  const showToast = useToast();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 24; // a gallery grid reads better in a larger page size than a table

  const [media, setMedia] = useState(null); // null = loading
  const [pagination, setPagination] = useState({ page: 1, limit, total: 0, totalPages: 0 });
  const [listError, setListError] = useState("");

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

      showToast("Alt text updated.");
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

      showToast(`Deleted "${deleteTarget.fileName}".`);
      setDeleteTarget(null);
      setDeleteLoading(false);
      await loadMedia();
    } catch {
      setDeleteError("Something went wrong. Please try again.");
      setDeleteLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Media"
        description={media !== null ? `${pagination.total} image${pagination.total === 1 ? "" : "s"} in the library.` : "Uploaded images library."}
        actions={
          <Button variant="primary" icon={Plus} onClick={() => router.push("/admin/media/new")}>
            Upload Image
          </Button>
        }
      />

      <div className={styles.toolbar}>
        <SearchInput value={searchInput} onChange={setSearchInput} placeholder="Search by filename…" />
      </div>

      {listError ? (
        <ErrorState title="Couldn't load media" description={listError} />
      ) : media === null ? (
        <LoadingState label="Loading media…" />
      ) : media.length === 0 ? (
        <EmptyState
          title={search ? "No images match this search" : "No images yet"}
          icon={ImageOff}
          action={
            <Button variant="primary" icon={Plus} onClick={() => router.push("/admin/media/new")}>
              Upload Image
            </Button>
          }
        />
      ) : (
        <>
          <div className={styles.grid}>
            {media.map((item) => (
              <MediaCard
                key={item.id}
                item={item}
                isEditing={editingId === item.id}
                editValue={editValue}
                editSaving={editSaving}
                editError={editingId === item.id ? editError : ""}
                onEditValueChange={setEditValue}
                onStartEdit={() => startEdit(item)}
                onSaveEdit={() => saveEdit(item.id)}
                onCancelEdit={cancelEdit}
                onDelete={() => confirmDelete(item)}
              />
            ))}
          </div>

          <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} onPageChange={setPage} />
        </>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this image?"
        description={
          deleteTarget ? `"${deleteTarget.fileName}" will be permanently deleted. This can't be undone.` : ""
        }
        loading={deleteLoading}
        error={deleteError}
        onConfirm={performDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}
