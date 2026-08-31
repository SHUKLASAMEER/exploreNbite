"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Plus, ArrowUp, ArrowDown, Pencil, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import PageHeader from "@/components/admin/ui/PageHeader";
import Button from "@/components/admin/ui/Button";
import FormField from "@/components/admin/ui/FormField";
import DataTable from "@/components/admin/ui/DataTable";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import EmptyState from "@/components/admin/ui/EmptyState";
import ErrorState from "@/components/admin/ui/ErrorState";
import { useToast } from "@/components/admin/ui/Toast";
import styles from "./CategoriesManager.module.css";

const emptyForm = { name: "", slug: "", description: "", sortOrder: "" };

async function parseJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export default function CategoriesManager() {
  const showToast = useToast();

  const [categories, setCategories] = useState(null); // null = loading
  // Reused for both "the list failed to load" and "a reorder action
  // failed" — same conflation the original component had. Rendered as a
  // banner (not a full-page error) so a failed reorder never hides
  // already-loaded data.
  const [listError, setListError] = useState("");

  const [formMode, setFormMode] = useState(null); // null | "create" | category object being edited
  const [formValues, setFormValues] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [formSaving, setFormSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [reorderingId, setReorderingId] = useState(null);

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    setListError("");
    try {
      const res = await apiFetch("/api/admin/categories");
      const data = await parseJsonSafe(res);
      if (!res.ok) {
        setListError(data?.error?.message ?? "Failed to load categories.");
        setCategories([]);
        return;
      }
      setCategories(data.categories ?? []);
    } catch {
      setListError("Failed to load categories.");
      setCategories([]);
    }
  }

  function openCreateForm() {
    setFormMode("create");
    setFormValues(emptyForm);
    setFormError("");
  }

  function openEditForm(category) {
    setFormMode(category);
    setFormValues({
      name: category.name,
      slug: category.slug,
      description: category.description ?? "",
      sortOrder: String(category.sortOrder),
    });
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
    const payload = {
      name: formValues.name,
      slug: formValues.slug,
      description: formValues.description,
    };
    if (formValues.sortOrder !== "") {
      payload.sortOrder = Number(formValues.sortOrder);
    }

    try {
      const res = await apiFetch(
        isEditing ? `/api/admin/categories/${formMode.id}` : "/api/admin/categories",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await parseJsonSafe(res);

      if (!res.ok) {
        setFormError(data?.error?.message ?? "Could not save this category.");
        setFormSaving(false);
        return;
      }

      showToast(isEditing ? "Category updated." : "Category created.");
      setFormMode(null);
      setFormSaving(false);
      await loadCategories();
    } catch {
      setFormError("Something went wrong. Please try again.");
      setFormSaving(false);
    }
  }

  function confirmDelete(category) {
    setDeleteTarget(category);
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
      const res = await apiFetch(`/api/admin/categories/${deleteTarget.id}`, { method: "DELETE" });
      const data = await parseJsonSafe(res);

      if (!res.ok) {
        // e.g. 409 CONFLICT because posts still reference this category —
        // keep the dialog open and show why, don't remove it from the list.
        setDeleteError(data?.error?.message ?? "Could not delete this category.");
        setDeleteLoading(false);
        return;
      }

      showToast(`Deleted "${deleteTarget.name}".`);
      setDeleteTarget(null);
      setDeleteLoading(false);
      await loadCategories();
    } catch {
      setDeleteError("Something went wrong. Please try again.");
      setDeleteLoading(false);
    }
  }

  async function moveCategory(index, direction) {
    if (!categories) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const reordered = [...categories];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];

    setReorderingId(categories[index].id);
    setListError("");
    try {
      const res = await apiFetch("/api/admin/categories/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: reordered.map((c) => c.id) }),
      });
      const data = await parseJsonSafe(res);

      if (!res.ok) {
        setListError(data?.error?.message ?? "Could not reorder categories.");
        setReorderingId(null);
        return;
      }

      setCategories(data.categories ?? reordered);
      setReorderingId(null);
    } catch {
      setListError("Could not reorder categories.");
      setReorderingId(null);
    }
  }

  const columns = [
    { key: "name", header: "Name", render: (c) => <span className={styles.nameCell}>{c.name}</span> },
    { key: "slug", header: "Slug", render: (c) => <code className={styles.slug}>{c.slug}</code> },
    {
      key: "description",
      header: "Description",
      render: (c) => c.description || <span className={styles.muted}>—</span>,
    },
    { key: "sortOrder", header: "Order", render: (c) => c.sortOrder },
    {
      key: "actions",
      header: "",
      width: "1%",
      render: (c, index) => (
        <div className={styles.rowActions}>
          <Button
            variant="ghost"
            size="sm"
            icon={ArrowUp}
            onClick={() => moveCategory(index, -1)}
            disabled={index === 0 || reorderingId !== null}
            aria-label={`Move ${c.name} up`}
          />
          <Button
            variant="ghost"
            size="sm"
            icon={ArrowDown}
            onClick={() => moveCategory(index, 1)}
            disabled={index === categories.length - 1 || reorderingId !== null}
            aria-label={`Move ${c.name} down`}
          />
          <Button variant="ghost" size="sm" icon={Pencil} onClick={() => openEditForm(c)}>
            Edit
          </Button>
          <Button variant="ghost" size="sm" icon={Trash2} onClick={() => confirmDelete(c)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Post categories and their display order."
        actions={
          <Button variant="primary" icon={Plus} onClick={openCreateForm}>
            Add Category
          </Button>
        }
      />

      {listError ? (
        <div className={styles.errorBanner} role="alert">
          <AlertCircle size={16} strokeWidth={2} aria-hidden="true" />
          <span>{listError}</span>
        </div>
      ) : null}

      {formMode ? (
        <form onSubmit={handleSubmit} className={styles.formCard}>
          <h2 className={styles.formTitle}>{formMode === "create" ? "Add Category" : `Edit "${formMode.name}"`}</h2>

          {formError ? <ErrorState title={formError} /> : null}

          <FormField
            label="Name"
            htmlFor="category-name"
            required
            value={formValues.name}
            onChange={(e) => setFormValues((prev) => ({ ...prev, name: e.target.value }))}
          />

          <FormField
            label="Slug"
            htmlFor="category-slug"
            hint="Optional — leave blank to auto-generate from the name."
            placeholder="(auto)"
            value={formValues.slug}
            onChange={(e) => setFormValues((prev) => ({ ...prev, slug: e.target.value }))}
          />

          <FormField
            label="Description"
            htmlFor="category-description"
            as="textarea"
            value={formValues.description}
            onChange={(e) => setFormValues((prev) => ({ ...prev, description: e.target.value }))}
          />

          <FormField
            label="Order"
            htmlFor="category-sort-order"
            hint="Optional — leave blank to add it at the end."
            type="number"
            min="0"
            placeholder="(auto)"
            value={formValues.sortOrder}
            onChange={(e) => setFormValues((prev) => ({ ...prev, sortOrder: e.target.value }))}
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

      <DataTable
        columns={columns}
        rows={categories}
        getRowKey={(c) => c.id}
        loadingLabel="Loading categories…"
        emptyState={
          <EmptyState
            title="No categories yet"
            action={
              <Button variant="primary" icon={Plus} onClick={openCreateForm}>
                Add Category
              </Button>
            }
          />
        }
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this category?"
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
