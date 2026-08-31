"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import PageHeader from "@/components/admin/ui/PageHeader";
import Button from "@/components/admin/ui/Button";
import SearchInput from "@/components/admin/ui/SearchInput";
import DataTable from "@/components/admin/ui/DataTable";
import Pagination from "@/components/admin/ui/Pagination";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import EmptyState from "@/components/admin/ui/EmptyState";
import ErrorState from "@/components/admin/ui/ErrorState";
import { useToast } from "@/components/admin/ui/Toast";
import styles from "./SubscribersManager.module.css";

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

const STATUS_LABELS = { active: "Active", unsubscribed: "Unsubscribed" };

export default function SubscribersManager() {
  const showToast = useToast();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const [subscribers, setSubscribers] = useState(null); // null = loading
  const [pagination, setPagination] = useState({ page: 1, limit, total: 0, totalPages: 0 });
  const [listError, setListError] = useState("");

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

      showToast(`Removed "${deleteTarget.email}".`);
      setDeleteTarget(null);
      setDeleteLoading(false);
      await loadSubscribers();
    } catch {
      setDeleteError("Something went wrong. Please try again.");
      setDeleteLoading(false);
    }
  }

  const columns = [
    { key: "email", header: "Email", render: (s) => <span className={styles.emailCell}>{s.email}</span> },
    {
      key: "status",
      header: "Status",
      render: (s) => (
        <span className={`${styles.badge} ${s.status === "active" ? styles.active : styles.unsubscribed}`}>
          {STATUS_LABELS[s.status] ?? s.status}
        </span>
      ),
    },
    { key: "subscribedAt", header: "Subscribed", render: (s) => formatDate(s.subscribedAt) },
    {
      key: "actions",
      header: "",
      width: "1%",
      render: (s) => (
        <Button variant="ghost" size="sm" icon={Trash2} onClick={() => confirmDelete(s)}>
          Delete
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Subscribers"
        description={subscribers !== null ? `${pagination.total} subscriber${pagination.total === 1 ? "" : "s"}.` : "Newsletter subscriber list."}
      />

      <div className={styles.toolbar}>
        <SearchInput value={searchInput} onChange={setSearchInput} placeholder="Search by email…" />
      </div>

      {listError ? (
        <ErrorState title="Couldn't load subscribers" description={listError} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={subscribers}
            getRowKey={(s) => s.id}
            loadingLabel="Loading subscribers…"
            emptyState={<EmptyState title={search ? "No subscribers match this search" : "No subscribers yet"} />}
          />
          <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} onPageChange={setPage} />
        </>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Remove this subscriber?"
        description={
          deleteTarget ? `"${deleteTarget.email}" will be permanently removed. This can't be undone.` : ""
        }
        loading={deleteLoading}
        error={deleteError}
        onConfirm={performDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}
