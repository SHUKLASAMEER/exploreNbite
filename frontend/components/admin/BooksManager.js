"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, BookOpen } from "lucide-react";
import { apiFetch } from "@/lib/api";
import PageHeader from "@/components/admin/ui/PageHeader";
import Button from "@/components/admin/ui/Button";
import DataTable from "@/components/admin/ui/DataTable";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import EmptyState from "@/components/admin/ui/EmptyState";
import ErrorState from "@/components/admin/ui/ErrorState";
import { useToast } from "@/components/admin/ui/Toast";
import styles from "./BooksManager.module.css";

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
  const showToast = useToast();

  const [books, setBooks] = useState(null); // null = loading
  const [listError, setListError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    loadBooks();
  }, []);

  async function loadBooks() {
    setListError("");
    try {
      const res = await apiFetch("/api/admin/books");
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
      const res = await apiFetch(`/api/admin/books/${deleteTarget.id}`, { method: "DELETE" });
      const data = await parseJsonSafe(res);

      if (!res.ok) {
        setDeleteError(data?.error?.message ?? "Could not delete this book.");
        setDeleteLoading(false);
        return;
      }

      showToast(`Deleted "${deleteTarget.title}".`);
      setDeleteTarget(null);
      setDeleteLoading(false);
      await loadBooks();
    } catch {
      setDeleteError("Something went wrong. Please try again.");
      setDeleteLoading(false);
    }
  }

  const columns = [
    {
      key: "cover",
      header: "",
      width: "1%",
      render: (book) =>
        book.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- admin-supplied URL (often our own /uploads media), not a project asset
          <img
            src={book.coverImageUrl}
            alt=""
            className={styles.cover}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className={styles.coverPlaceholder}>
            <BookOpen size={16} strokeWidth={2} aria-hidden="true" />
          </div>
        ),
    },
    { key: "title", header: "Title", render: (book) => <span className={styles.titleCell}>{book.title}</span> },
    {
      key: "publishedYear",
      header: "Published Year",
      render: (book) => book.publishedYear ?? <span className={styles.muted}>—</span>,
    },
    { key: "buyLinkCount", header: "Buy Links", render: (book) => book.buyLinkCount },
    { key: "updatedAt", header: "Updated", render: (book) => formatDate(book.updatedAt) },
    {
      key: "actions",
      header: "",
      width: "1%",
      render: (book) => (
        <div className={styles.rowActions}>
          <Button variant="ghost" size="sm" icon={Pencil} onClick={() => router.push(`/admin/books/${book.id}/edit`)}>
            Edit
          </Button>
          <Button variant="ghost" size="sm" icon={Trash2} onClick={() => confirmDelete(book)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Books"
        description="Books and their buy links."
        actions={
          <Button variant="primary" icon={Plus} onClick={() => router.push("/admin/books/new")}>
            Add Book
          </Button>
        }
      />

      {listError ? (
        <ErrorState title="Couldn't load books" description={listError} />
      ) : (
        <DataTable
          columns={columns}
          rows={books}
          getRowKey={(book) => book.id}
          loadingLabel="Loading books…"
          emptyState={
            <EmptyState
              title="No books yet"
              action={
                <Button variant="primary" icon={Plus} onClick={() => router.push("/admin/books/new")}>
                  Add Book
                </Button>
              }
            />
          }
        />
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this book?"
        description={
          deleteTarget ? `"${deleteTarget.title}" will be permanently deleted. This can't be undone.` : ""
        }
        loading={deleteLoading}
        error={deleteError}
        onConfirm={performDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}
