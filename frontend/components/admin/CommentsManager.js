"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Eye, Check, Ban, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import PageHeader from "@/components/admin/ui/PageHeader";
import Button from "@/components/admin/ui/Button";
import SearchInput from "@/components/admin/ui/SearchInput";
import FilterControls from "@/components/admin/ui/FilterControls";
import DataTable from "@/components/admin/ui/DataTable";
import Pagination from "@/components/admin/ui/Pagination";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import EmptyState from "@/components/admin/ui/EmptyState";
import { useToast } from "@/components/admin/ui/Toast";
import styles from "./CommentsManager.module.css";

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
  const showToast = useToast();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  // Default to "pending" — a moderation inbox is most useful starting on
  // what actually needs a decision. The API itself is unopinionated
  // (returns every status unless filtered).
  const [statusFilter, setStatusFilter] = useState("pending");
  const [page, setPage] = useState(1);
  const limit = 20;

  const [comments, setComments] = useState(null); // null = loading
  const [pagination, setPagination] = useState({ page: 1, limit, total: 0, totalPages: 0 });
  // Reused for both "the list failed to load" and "an approve/spam action
  // failed" — same conflation the original component had. Rendered as a
  // banner above the table (not a full-page error) so a failed row action
  // never hides data that already loaded successfully.
  const [listError, setListError] = useState("");

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

      showToast(`Marked as ${STATUS_LABELS[status].toLowerCase()}.`);
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

      showToast(`Deleted comment from "${deleteTarget.readerName}".`);
      setDeleteTarget(null);
      setDeleteLoading(false);
      await loadComments();
    } catch {
      setDeleteError("Something went wrong. Please try again.");
      setDeleteLoading(false);
    }
  }

  const columns = [
    { key: "post", header: "Post", render: (c) => c.post?.title ?? <span className={styles.muted}>—</span> },
    {
      key: "commenter",
      header: "Commenter",
      render: (c) => (
        <div>
          <div className={styles.commenterName}>{c.readerName}</div>
          <div className={styles.commenterEmail}>{c.email}</div>
        </div>
      ),
    },
    { key: "message", header: "Message", render: (c) => <span className={styles.message}>{truncate(c.message)}</span> },
    {
      key: "status",
      header: "Status",
      render: (c) => (
        <span className={`${styles.badge} ${styles[c.status] ?? ""}`}>{STATUS_LABELS[c.status] ?? c.status}</span>
      ),
    },
    { key: "createdAt", header: "Date", render: (c) => formatDate(c.createdAt) },
    {
      key: "actions",
      header: "",
      width: "1%",
      render: (c) => (
        <div className={styles.rowActions}>
          <Button variant="ghost" size="sm" icon={Eye} onClick={() => router.push(`/admin/comments/${c.id}`)}>
            View
          </Button>
          {c.status !== "approved" ? (
            <Button
              variant="ghost"
              size="sm"
              icon={Check}
              disabled={actioningId === c.id}
              onClick={() => changeStatus(c, "approved")}
            >
              Approve
            </Button>
          ) : null}
          {c.status !== "spam" ? (
            <Button
              variant="ghost"
              size="sm"
              icon={Ban}
              disabled={actioningId === c.id}
              onClick={() => changeStatus(c, "spam")}
            >
              Spam
            </Button>
          ) : null}
          <Button variant="ghost" size="sm" icon={Trash2} onClick={() => confirmDelete(c)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  const hasFilters = Boolean(search || statusFilter);

  return (
    <div>
      <PageHeader title="Comments" description="Moderate reader comments." />

      {listError ? (
        <div className={styles.errorBanner} role="alert">
          <AlertCircle size={16} strokeWidth={2} aria-hidden="true" />
          <span>{listError}</span>
        </div>
      ) : null}

      <div className={styles.toolbar}>
        <SearchInput value={searchInput} onChange={setSearchInput} placeholder="Search name, email, or message…" />
        <FilterControls
          filters={[
            {
              key: "status",
              label: "Status",
              value: statusFilter,
              onChange: (v) => {
                setStatusFilter(v);
                setPage(1);
              },
              options: [
                { value: "", label: "All statuses" },
                { value: "pending", label: "Pending" },
                { value: "approved", label: "Approved" },
                { value: "spam", label: "Spam" },
              ],
            },
          ]}
        />
      </div>

      <DataTable
        columns={columns}
        rows={comments}
        getRowKey={(c) => c.id}
        loadingLabel="Loading comments…"
        emptyState={<EmptyState title={hasFilters ? "No comments match these filters" : "No comments yet"} />}
      />
      <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} onPageChange={setPage} />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this comment?"
        description={
          deleteTarget ? `The comment from "${deleteTarget.readerName}" will be permanently deleted. This can't be undone.` : ""
        }
        loading={deleteLoading}
        error={deleteError}
        onConfirm={performDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}
