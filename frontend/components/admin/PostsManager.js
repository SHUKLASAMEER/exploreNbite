"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, CheckCircle2, FileEdit, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import PageHeader from "@/components/admin/ui/PageHeader";
import Button from "@/components/admin/ui/Button";
import SearchInput from "@/components/admin/ui/SearchInput";
import FilterControls from "@/components/admin/ui/FilterControls";
import DataTable from "@/components/admin/ui/DataTable";
import Pagination from "@/components/admin/ui/Pagination";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import EmptyState from "@/components/admin/ui/EmptyState";
import ErrorState from "@/components/admin/ui/ErrorState";
import { useToast } from "@/components/admin/ui/Toast";
import styles from "./PostsManager.module.css";

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

// Sets `.indeterminate` on the checkbox DOM node — there is no JSX prop for
// it, only a real DOM property, so a ref callback is the only way to set it.
function selectAllCheckboxRef(checked, indeterminate) {
  return (el) => {
    if (el) el.indeterminate = !checked && indeterminate;
  };
}

export default function PostsManager() {
  const router = useRouter();
  const showToast = useToast();

  const [categories, setCategories] = useState([]);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const [posts, setPosts] = useState(null); // null = loading
  const [pagination, setPagination] = useState({ page: 1, limit, total: 0, totalPages: 0 });
  const [listError, setListError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Bulk selection — a set of post ids from the CURRENTLY LOADED page only.
  // Never persisted across a page/search/filter change (see the effect
  // below): that is what keeps "select all" honest — it only ever means
  // "every row on screen right now," never a hidden row from another page
  // or a stale filter. The full catalogue is never fetched to support this.
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkStatusBusy, setBulkStatusBusy] = useState(false);
  const [bulkError, setBulkError] = useState("");
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteError, setBulkDeleteError] = useState("");
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  // Debounce the free-text search box so every keystroke doesn't fire a
  // request; category/status filters apply immediately since they're a
  // single discrete choice, not continuous typing.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    apiFetch("/api/admin/categories")
      .then((res) => (res.ok ? res.json() : { categories: [] }))
      .then((data) => setCategories(data.categories ?? []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, categoryFilter, statusFilter]);

  async function loadPosts() {
    setListError("");
    // Any change that reloads the list (page turn, new search, new filter)
    // invalidates whatever was selected — a fresh, safe selection starts
    // empty rather than silently carrying ids that may no longer even be on
    // screen. Cleared here (inside the async load, not the effect body
    // itself) alongside the fetch that's about to replace the row set.
    setSelectedIds(new Set());
    setBulkError("");
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (search) params.set("search", search);
      if (categoryFilter) params.set("category", categoryFilter);
      if (statusFilter) params.set("status", statusFilter);

      const res = await apiFetch(`/api/admin/posts?${params.toString()}`);
      const data = await parseJsonSafe(res);

      if (!res.ok) {
        setListError(data?.error?.message ?? "Failed to load posts.");
        setPosts([]);
        return;
      }

      setPosts(data.data ?? []);
      setPagination(data.pagination ?? { page: 1, limit, total: 0, totalPages: 0 });
    } catch {
      setListError("Failed to load posts.");
      setPosts([]);
    }
  }

  function confirmDelete(post) {
    setDeleteTarget(post);
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
      const res = await apiFetch(`/api/admin/posts/${deleteTarget.id}`, { method: "DELETE" });
      const data = await parseJsonSafe(res);

      if (!res.ok) {
        setDeleteError(data?.error?.message ?? "Could not delete this post.");
        setDeleteLoading(false);
        return;
      }

      showToast(`Deleted "${deleteTarget.title}".`);
      setDeleteTarget(null);
      setDeleteLoading(false);
      await loadPosts();
    } catch {
      setDeleteError("Something went wrong. Please try again.");
      setDeleteLoading(false);
    }
  }

  // ---- bulk selection -----------------------------------------------
  function toggleRow(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllOnPage() {
    const rows = posts ?? [];
    const allSelected = rows.length > 0 && rows.every((p) => selectedIds.has(p.id));
    setSelectedIds(allSelected ? new Set() : new Set(rows.map((p) => p.id)));
  }

  function clearSelection() {
    setSelectedIds(new Set());
    setBulkError("");
  }

  // ---- bulk status ---------------------------------------------------
  async function applyBulkStatus(status) {
    if (selectedIds.size === 0) return;
    setBulkStatusBusy(true);
    setBulkError("");
    try {
      const res = await apiFetch("/api/admin/posts/bulk-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selectedIds], status }),
      });
      const data = await parseJsonSafe(res);
      if (!res.ok) {
        setBulkError(data?.error?.message ?? "Could not update the selected posts.");
        setBulkStatusBusy(false);
        return;
      }
      const label = status === "published" ? "Published" : "Set to draft";
      showToast(
        data.missingIds?.length
          ? `${label} ${data.updated} post${data.updated === 1 ? "" : "s"} (${data.missingIds.length} no longer exist).`
          : `${label} ${data.updated} post${data.updated === 1 ? "" : "s"}.`
      );
      setSelectedIds(new Set());
      setBulkStatusBusy(false);
      await loadPosts();
    } catch {
      setBulkError("Something went wrong. Please try again.");
      setBulkStatusBusy(false);
    }
  }

  // ---- bulk delete -----------------------------------------------
  function openBulkDelete() {
    if (selectedIds.size === 0) return;
    setBulkDeleteOpen(true);
    setBulkDeleteError("");
  }
  function cancelBulkDelete() {
    setBulkDeleteOpen(false);
    setBulkDeleteError("");
  }
  async function performBulkDelete() {
    setBulkDeleteLoading(true);
    setBulkDeleteError("");
    try {
      const res = await apiFetch("/api/admin/posts/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selectedIds] }),
      });
      const data = await parseJsonSafe(res);
      if (!res.ok) {
        setBulkDeleteError(data?.error?.message ?? "Could not delete the selected posts.");
        setBulkDeleteLoading(false);
        return;
      }
      showToast(
        data.missingIds?.length
          ? `Deleted ${data.deleted} post${data.deleted === 1 ? "" : "s"} (${data.missingIds.length} were already gone).`
          : `Deleted ${data.deleted} post${data.deleted === 1 ? "" : "s"}.`
      );
      setBulkDeleteOpen(false);
      setBulkDeleteLoading(false);
      setSelectedIds(new Set());
      await loadPosts();
    } catch {
      setBulkDeleteError("Something went wrong. Please try again.");
      setBulkDeleteLoading(false);
    }
  }

  const rows = posts ?? [];
  const allOnPageSelected = rows.length > 0 && rows.every((p) => selectedIds.has(p.id));
  const someOnPageSelected = rows.some((p) => selectedIds.has(p.id));

  const columns = [
    {
      key: "select",
      header: (
        <input
          type="checkbox"
          aria-label="Select all posts on this page"
          checked={allOnPageSelected}
          ref={selectAllCheckboxRef(allOnPageSelected, someOnPageSelected)}
          onChange={toggleSelectAllOnPage}
          disabled={rows.length === 0}
        />
      ),
      width: "1%",
      render: (post) => (
        <input
          type="checkbox"
          aria-label={`Select "${post.title}"`}
          checked={selectedIds.has(post.id)}
          onChange={() => toggleRow(post.id)}
        />
      ),
    },
    { key: "title", header: "Title", render: (post) => <span className={styles.titleCell}>{post.title}</span> },
    { key: "category", header: "Category", render: (post) => post.category?.name ?? "—" },
    { key: "author", header: "Author", render: (post) => post.author?.name ?? "—" },
    {
      key: "status",
      header: "Status",
      render: (post) => (
        <span className={`${styles.badge} ${post.status === "published" ? styles.published : styles.draft}`}>
          {post.status === "published" ? "Published" : "Draft"}
        </span>
      ),
    },
    { key: "publishDate", header: "Publish Date", render: (post) => formatDate(post.publishDate) },
    { key: "tags", header: "Tags", render: (post) => post.tags?.length ?? 0 },
    {
      key: "actions",
      header: "",
      width: "1%",
      render: (post) => (
        <div className={styles.rowActions}>
          <Button variant="ghost" size="sm" icon={Pencil} onClick={() => router.push(`/admin/posts/${post.id}/edit`)}>
            Edit
          </Button>
          <Button variant="ghost" size="sm" icon={Trash2} onClick={() => confirmDelete(post)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  const hasFilters = Boolean(search || categoryFilter || statusFilter);
  const selectedCount = selectedIds.size;

  return (
    <div>
      <PageHeader
        title="Posts"
        description="Blog posts across every category, from draft to published."
        actions={
          <Button variant="primary" icon={Plus} onClick={() => router.push("/admin/posts/new")}>
            Add Post
          </Button>
        }
      />

      <div className={styles.toolbar}>
        <SearchInput value={searchInput} onChange={setSearchInput} placeholder="Search by title…" />
        <FilterControls
          filters={[
            {
              key: "category",
              label: "Category",
              value: categoryFilter,
              onChange: (v) => {
                setCategoryFilter(v);
                setPage(1);
              },
              options: [
                { value: "", label: "All categories" },
                ...categories.map((c) => ({ value: String(c.id), label: c.name })),
              ],
            },
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
                { value: "draft", label: "Draft" },
                { value: "published", label: "Published" },
              ],
            },
          ]}
        />
      </div>

      {selectedCount > 0 ? (
        <div className={styles.bulkBar} role="toolbar" aria-label="Bulk post actions">
          <span className={styles.bulkCount}>
            {selectedCount} selected
          </span>
          <Button
            variant="secondary"
            size="sm"
            icon={CheckCircle2}
            onClick={() => applyBulkStatus("published")}
            disabled={bulkStatusBusy}
          >
            Publish
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={FileEdit}
            onClick={() => applyBulkStatus("draft")}
            disabled={bulkStatusBusy}
          >
            Set to Draft
          </Button>
          <Button variant="danger" size="sm" icon={Trash2} onClick={openBulkDelete} disabled={bulkStatusBusy}>
            Delete
          </Button>
          <Button variant="ghost" size="sm" icon={X} onClick={clearSelection} disabled={bulkStatusBusy}>
            Clear selection
          </Button>
          {bulkError ? (
            <span className={styles.bulkErrorInline} role="alert">
              {bulkError}
            </span>
          ) : null}
        </div>
      ) : null}

      {listError ? (
        <ErrorState title="Couldn't load posts" description={listError} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={posts}
            getRowKey={(post) => post.id}
            loadingLabel="Loading posts…"
            emptyState={
              <EmptyState
                title={hasFilters ? "No posts match these filters" : "No posts yet"}
                action={
                  <Button variant="primary" icon={Plus} onClick={() => router.push("/admin/posts/new")}>
                    Add Post
                  </Button>
                }
              />
            }
          />
          <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} onPageChange={setPage} />
        </>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this post?"
        description={
          deleteTarget ? `"${deleteTarget.title}" will be permanently deleted. This can't be undone.` : ""
        }
        loading={deleteLoading}
        error={deleteError}
        onConfirm={performDelete}
        onCancel={cancelDelete}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        title={`Delete ${selectedCount} post${selectedCount === 1 ? "" : "s"}?`}
        description={`${selectedCount} post${selectedCount === 1 ? "" : "s"} will be permanently deleted. This can't be undone.`}
        confirmLabel={`Delete ${selectedCount} post${selectedCount === 1 ? "" : "s"}`}
        loading={bulkDeleteLoading}
        error={bulkDeleteError}
        onConfirm={performBulkDelete}
        onCancel={cancelBulkDelete}
      />
    </div>
  );
}
