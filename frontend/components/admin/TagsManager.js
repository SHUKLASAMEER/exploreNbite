"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Merge } from "lucide-react";
import { apiFetch } from "@/lib/api";
import PageHeader from "@/components/admin/ui/PageHeader";
import Button from "@/components/admin/ui/Button";
import FormField from "@/components/admin/ui/FormField";
import SearchInput from "@/components/admin/ui/SearchInput";
import DataTable from "@/components/admin/ui/DataTable";
import Pagination from "@/components/admin/ui/Pagination";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import EmptyState from "@/components/admin/ui/EmptyState";
import ErrorState from "@/components/admin/ui/ErrorState";
import { useToast } from "@/components/admin/ui/Toast";
import styles from "./TagsManager.module.css";

async function parseJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

const emptyForm = { name: "", slug: "" };
const LIMIT = 20;

export default function TagsManager() {
  const showToast = useToast();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [tags, setTags] = useState(null); // null = loading
  const [pagination, setPagination] = useState({ page: 1, limit: LIMIT, total: 0, totalPages: 0 });
  const [listError, setListError] = useState("");

  // formMode: null | "create" | <tag object being edited>
  const [formMode, setFormMode] = useState(null);
  const [formValues, setFormValues] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [formSaving, setFormSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  // merge dialog state
  const [mergeSource, setMergeSource] = useState(null);
  const [mergeQuery, setMergeQuery] = useState("");
  const [mergeResults, setMergeResults] = useState([]);
  const [mergeTarget, setMergeTarget] = useState(null);
  const [mergeError, setMergeError] = useState("");
  const [mergeLoading, setMergeLoading] = useState(false);

  // Debounce the free-text search box — same pattern as Subscribers/Posts.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    loadTags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  async function loadTags() {
    setListError("");
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(LIMIT));
      if (search) params.set("search", search);

      const res = await apiFetch(`/api/admin/tags?${params.toString()}`);
      const data = await parseJsonSafe(res);
      if (!res.ok) {
        setListError(data?.error?.message ?? "Failed to load tags.");
        setTags([]);
        return;
      }
      setTags(data.data ?? []);
      setPagination(data.pagination ?? { page: 1, limit: LIMIT, total: 0, totalPages: 0 });
    } catch {
      setListError("Failed to load tags.");
      setTags([]);
    }
  }

  // ---- create / edit form ------------------------------------------------
  function openCreateForm() {
    setFormMode("create");
    setFormValues(emptyForm);
    setFormError("");
  }

  function openEditForm(tag) {
    setFormMode(tag);
    setFormValues({ name: tag.name, slug: tag.slug });
    setFormError("");
  }

  function closeForm() {
    setFormMode(null);
    setFormError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");
    setFormSaving(true);

    const isEditing = formMode !== "create";
    // On edit: only send `slug` if the admin actually changed it, so a plain
    // rename leaves the existing slug alone (backend "keep" mode).
    const payload = { name: formValues.name };
    if (!isEditing || formValues.slug !== formMode.slug) {
      payload.slug = formValues.slug;
    }

    try {
      const res = await apiFetch(isEditing ? `/api/admin/tags/${formMode.id}` : "/api/admin/tags", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await parseJsonSafe(res);
      if (!res.ok) {
        setFormError(data?.error?.message ?? "Could not save this tag.");
        setFormSaving(false);
        return;
      }
      showToast(isEditing ? "Tag updated." : "Tag created.");
      setFormMode(null);
      setFormSaving(false);
      await loadTags();
    } catch {
      setFormError("Something went wrong. Please try again.");
      setFormSaving(false);
    }
  }

  // ---- delete -----------------------------------------------------------
  function confirmDelete(tag) {
    setDeleteTarget(tag);
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
      const res = await apiFetch(`/api/admin/tags/${deleteTarget.id}`, { method: "DELETE" });
      const data = await parseJsonSafe(res);
      if (!res.ok) {
        // 409 CONFLICT when the tag is still in use — keep the dialog open
        // and show why, don't drop it from the list.
        setDeleteError(data?.error?.message ?? "Could not delete this tag.");
        setDeleteLoading(false);
        return;
      }
      showToast(`Deleted "${deleteTarget.name}".`);
      setDeleteTarget(null);
      setDeleteLoading(false);
      await loadTags();
    } catch {
      setDeleteError("Something went wrong. Please try again.");
      setDeleteLoading(false);
    }
  }

  // ---- merge ----------------------------------------------------------
  function openMerge(tag) {
    setMergeSource(tag);
    setMergeQuery("");
    setMergeResults([]);
    setMergeTarget(null);
    setMergeError("");
  }
  function closeMerge() {
    setMergeSource(null);
    setMergeError("");
  }
  useEffect(() => {
    if (!mergeSource) return undefined;
    const q = mergeQuery.trim();
    const timer = setTimeout(async () => {
      if (!q) {
        setMergeResults([]);
        return;
      }
      try {
        const res = await apiFetch(`/api/admin/tags?limit=8&search=${encodeURIComponent(q)}`);
        const data = await parseJsonSafe(res);
        setMergeResults((data?.data ?? []).filter((t) => t.id !== mergeSource.id));
      } catch {
        setMergeResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [mergeQuery, mergeSource]);

  async function performMerge() {
    if (!mergeSource || !mergeTarget) return;
    setMergeLoading(true);
    setMergeError("");
    try {
      const res = await apiFetch(`/api/admin/tags/${mergeSource.id}/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId: mergeTarget.id }),
      });
      const data = await parseJsonSafe(res);
      if (!res.ok) {
        setMergeError(data?.error?.message ?? "Could not merge these tags.");
        setMergeLoading(false);
        return;
      }
      showToast(`Merged "${mergeSource.name}" into "${mergeTarget.name}".`);
      setMergeSource(null);
      setMergeLoading(false);
      await loadTags();
    } catch {
      setMergeError("Something went wrong. Please try again.");
      setMergeLoading(false);
    }
  }

  // ---- table -----------------------------------------------------------
  const columns = [
    { key: "name", header: "Name", render: (t) => <span className={styles.nameCell}>{t.name}</span> },
    { key: "slug", header: "Slug", render: (t) => <code className={styles.slug}>{t.slug}</code> },
    {
      key: "usageCount",
      header: "Used by",
      width: "1%",
      render: (t) =>
        t.usageCount > 0 ? (
          <span className={styles.usage}>
            {t.usageCount} post{t.usageCount === 1 ? "" : "s"}
          </span>
        ) : (
          <span className={styles.muted}>unused</span>
        ),
    },
    {
      key: "actions",
      header: "",
      width: "1%",
      render: (t) => (
        <div className={styles.rowActions}>
          <Button variant="ghost" size="sm" icon={Pencil} onClick={() => openEditForm(t)}>
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={Merge}
            onClick={() => openMerge(t)}
            disabled={pagination.total <= 1}
          >
            Merge
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={Trash2}
            onClick={() => confirmDelete(t)}
            disabled={t.usageCount > 0}
            title={t.usageCount > 0 ? "In use — remove it from its posts first" : undefined}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Tags"
        description={
          tags !== null
            ? `${pagination.total} tag${pagination.total === 1 ? "" : "s"}. Rename, merge duplicates, or remove unused ones.`
            : "Post tags."
        }
        actions={
          <Button variant="primary" icon={Plus} onClick={openCreateForm}>
            Add Tag
          </Button>
        }
      />

      <div className={styles.toolbar}>
        <SearchInput value={searchInput} onChange={setSearchInput} placeholder="Search by name or slug…" />
      </div>

      {formMode ? (
        <form onSubmit={handleSubmit} className={styles.formCard}>
          <h2 className={styles.formTitle}>{formMode === "create" ? "Add Tag" : `Edit "${formMode.name}"`}</h2>

          {formError ? <ErrorState title={formError} /> : null}

          <FormField
            label="Name"
            htmlFor="tag-name"
            required
            value={formValues.name}
            onChange={(e) => setFormValues((prev) => ({ ...prev, name: e.target.value }))}
          />

          <FormField
            label="Slug"
            htmlFor="tag-slug"
            hint={
              formMode === "create"
                ? "Optional — leave blank to auto-generate from the name."
                : "Renaming keeps this slug unless you change it here. Clear it to regenerate from the name."
            }
            placeholder="(auto)"
            value={formValues.slug}
            onChange={(e) => setFormValues((prev) => ({ ...prev, slug: e.target.value }))}
          />

          <div className={styles.formActions}>
            <Button type="submit" variant="primary" disabled={formSaving}>
              {formSaving ? "Saving…" : "Save"}
            </Button>
            <Button type="button" variant="secondary" onClick={closeForm} disabled={formSaving}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      {listError ? (
        <ErrorState title="Couldn't load tags" description={listError} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={tags}
            getRowKey={(t) => t.id}
            loadingLabel="Loading tags…"
            emptyState={
              <EmptyState
                title={search ? "No tags match this search" : "No tags yet"}
                action={
                  !search ? (
                    <Button variant="primary" icon={Plus} onClick={openCreateForm}>
                      Add Tag
                    </Button>
                  ) : null
                }
              />
            }
          />
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            onPageChange={setPage}
          />
        </>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this tag?"
        description={
          deleteTarget
            ? `"${deleteTarget.name}" will be permanently deleted. This can't be undone.`
            : ""
        }
        loading={deleteLoading}
        error={deleteError}
        onConfirm={performDelete}
        onCancel={cancelDelete}
      />

      {mergeSource ? (
        <div
          className={styles.overlay}
          onMouseDown={(e) => e.target === e.currentTarget && closeMerge()}
        >
          <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="merge-title">
            <h2 id="merge-title" className={styles.formTitle}>
              Merge &ldquo;{mergeSource.name}&rdquo; into another tag
            </h2>
            <p className={styles.mergeHelp}>
              Every post using &ldquo;{mergeSource.name}&rdquo; ({mergeSource.usageCount} post
              {mergeSource.usageCount === 1 ? "" : "s"}) will be re-tagged with the target tag, then
              &ldquo;{mergeSource.name}&rdquo; is deleted. Posts are not changed otherwise.
            </p>

            <FormField
              label="Target tag"
              htmlFor="merge-target"
              placeholder="Search tags…"
              value={mergeQuery}
              onChange={(e) => {
                setMergeQuery(e.target.value);
                setMergeTarget(null);
              }}
            />
            {mergeTarget ? (
              <p className={styles.mergeChosen}>
                Merging into <strong>{mergeTarget.name}</strong>{" "}
                <button type="button" className={styles.mergeClear} onClick={() => setMergeTarget(null)}>
                  change
                </button>
              </p>
            ) : mergeResults.length > 0 ? (
              <ul className={styles.mergeResults}>
                {mergeResults.map((t) => (
                  <li key={t.id}>
                    <button type="button" onClick={() => setMergeTarget(t)}>
                      {t.name} <code className={styles.slug}>{t.slug}</code>{" "}
                      <span className={styles.muted}>· {t.usageCount} post{t.usageCount === 1 ? "" : "s"}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : mergeQuery.trim() ? (
              <p className={styles.muted}>No matching tags.</p>
            ) : null}

            {mergeError ? (
              <p className={styles.mergeError} role="alert">
                {mergeError}
              </p>
            ) : null}

            <div className={styles.formActions}>
              <Button type="button" variant="secondary" onClick={closeMerge} disabled={mergeLoading}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={performMerge}
                disabled={!mergeTarget || mergeLoading}
              >
                {mergeLoading ? "Merging…" : "Merge tags"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
