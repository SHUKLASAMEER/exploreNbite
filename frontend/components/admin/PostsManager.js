"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
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

  const columns = [
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
    </div>
  );
}
