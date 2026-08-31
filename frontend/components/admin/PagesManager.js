"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import PageHeader from "@/components/admin/ui/PageHeader";
import Button from "@/components/admin/ui/Button";
import DataTable from "@/components/admin/ui/DataTable";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import EmptyState from "@/components/admin/ui/EmptyState";
import ErrorState from "@/components/admin/ui/ErrorState";
import { useToast } from "@/components/admin/ui/Toast";
import styles from "./PagesManager.module.css";

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

export default function PagesManager() {
  const router = useRouter();
  const showToast = useToast();

  const [pages, setPages] = useState(null); // null = loading
  const [listError, setListError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    loadPages();
  }, []);

  async function loadPages() {
    setListError("");
    try {
      const res = await apiFetch("/api/admin/pages");
      const data = await parseJsonSafe(res);
      if (!res.ok) {
        setListError(data?.error?.message ?? "Failed to load pages.");
        setPages([]);
        return;
      }
      setPages(data.pages ?? []);
    } catch {
      setListError("Failed to load pages.");
      setPages([]);
    }
  }

  function confirmDelete(page) {
    setDeleteTarget(page);
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
      const res = await apiFetch(`/api/admin/pages/${deleteTarget.id}`, { method: "DELETE" });
      const data = await parseJsonSafe(res);

      if (!res.ok) {
        setDeleteError(data?.error?.message ?? "Could not delete this page.");
        setDeleteLoading(false);
        return;
      }

      showToast(`Deleted "${deleteTarget.title}".`);
      setDeleteTarget(null);
      setDeleteLoading(false);
      await loadPages();
    } catch {
      setDeleteError("Something went wrong. Please try again.");
      setDeleteLoading(false);
    }
  }

  const columns = [
    { key: "title", header: "Title", render: (page) => <span className={styles.titleCell}>{page.title}</span> },
    { key: "slug", header: "Slug", render: (page) => <code className={styles.slug}>{page.slug}</code> },
    {
      key: "showInMenu",
      header: "In Menu",
      render: (page) => (
        <span className={`${styles.badge} ${page.showInMenu ? styles.yes : styles.no}`}>
          {page.showInMenu ? "Yes" : "No"}
        </span>
      ),
    },
    { key: "menuPosition", header: "Position", render: (page) => page.menuPosition ?? <span className={styles.muted}>—</span> },
    { key: "updatedAt", header: "Updated", render: (page) => formatDate(page.updatedAt) },
    {
      key: "actions",
      header: "",
      width: "1%",
      render: (page) => (
        <div className={styles.rowActions}>
          <Button variant="ghost" size="sm" icon={Pencil} onClick={() => router.push(`/admin/pages/${page.id}/edit`)}>
            Edit
          </Button>
          <Button variant="ghost" size="sm" icon={Trash2} onClick={() => confirmDelete(page)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Pages"
        description="Static content pages, such as About Us, Contact, and Work With Me."
        actions={
          <Button variant="primary" icon={Plus} onClick={() => router.push("/admin/pages/new")}>
            Add Page
          </Button>
        }
      />

      {listError ? (
        <ErrorState title="Couldn't load pages" description={listError} />
      ) : (
        <DataTable
          columns={columns}
          rows={pages}
          getRowKey={(page) => page.id}
          loadingLabel="Loading pages…"
          emptyState={
            <EmptyState
              title="No pages yet"
              action={
                <Button variant="primary" icon={Plus} onClick={() => router.push("/admin/pages/new")}>
                  Add Page
                </Button>
              }
            />
          }
        />
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this page?"
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
