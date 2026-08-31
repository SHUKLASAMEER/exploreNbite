"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, User } from "lucide-react";
import { apiFetch } from "@/lib/api";
import PageHeader from "@/components/admin/ui/PageHeader";
import Button from "@/components/admin/ui/Button";
import DataTable from "@/components/admin/ui/DataTable";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import EmptyState from "@/components/admin/ui/EmptyState";
import ErrorState from "@/components/admin/ui/ErrorState";
import { useToast } from "@/components/admin/ui/Toast";
import styles from "./AuthorsManager.module.css";

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
  const showToast = useToast();

  const [authors, setAuthors] = useState(null); // null = loading
  const [listError, setListError] = useState("");

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

      showToast(`Deleted "${deleteTarget.name}".`);
      setDeleteTarget(null);
      setDeleteLoading(false);
      await loadAuthors();
    } catch {
      setDeleteError("Something went wrong. Please try again.");
      setDeleteLoading(false);
    }
  }

  const columns = [
    {
      key: "photo",
      header: "",
      width: "1%",
      render: (author) =>
        author.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- admin-supplied URL (often our own /uploads media), not a project asset
          <img
            src={author.photoUrl}
            alt=""
            className={styles.avatar}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className={styles.avatarPlaceholder}>
            <User size={16} strokeWidth={2} aria-hidden="true" />
          </div>
        ),
    },
    { key: "name", header: "Name", render: (author) => <span className={styles.nameCell}>{author.name}</span> },
    { key: "bio", header: "Bio", render: (author) => truncate(author.bio, 80) || <span className={styles.muted}>—</span> },
    { key: "posts", header: "Posts", render: (author) => author._count?.posts ?? 0 },
    {
      key: "actions",
      header: "",
      width: "1%",
      render: (author) => (
        <div className={styles.rowActions}>
          <Button variant="ghost" size="sm" icon={Pencil} onClick={() => router.push(`/admin/authors/${author.id}/edit`)}>
            Edit
          </Button>
          <Button variant="ghost" size="sm" icon={Trash2} onClick={() => confirmDelete(author)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Authors"
        description="Author profiles credited on posts."
        actions={
          <Button variant="primary" icon={Plus} onClick={() => router.push("/admin/authors/new")}>
            Add Author
          </Button>
        }
      />

      {listError ? (
        <ErrorState title="Couldn't load authors" description={listError} />
      ) : (
        <DataTable
          columns={columns}
          rows={authors}
          getRowKey={(author) => author.id}
          loadingLabel="Loading authors…"
          emptyState={
            <EmptyState
              title="No authors yet"
              action={
                <Button variant="primary" icon={Plus} onClick={() => router.push("/admin/authors/new")}>
                  Add Author
                </Button>
              }
            />
          }
        />
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this author?"
        description={
          deleteTarget ? `"${deleteTarget.name}" will be permanently deleted. This can't be undone.` : ""
        }
        loading={deleteLoading}
        error={deleteError}
        onConfirm={performDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}
