"use client";

import { useEffect, useState } from "react";
import { slugify } from "@/lib/validation/categories";

const emptyForm = { name: "", slug: "", description: "", sortOrder: "" };

const inputStyle = { padding: "0.4rem 0.5rem", fontSize: "1rem" };
const labelStyle = { display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.9rem" };
const buttonStyle = { padding: "0.4rem 0.8rem", cursor: "pointer" };
const thStyle = { textAlign: "left", padding: "0.5rem", borderBottom: "2px solid #ccc" };
const tdStyle = { padding: "0.5rem", borderBottom: "1px solid #eee", verticalAlign: "top" };

async function parseJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export default function CategoriesManager() {
  const [categories, setCategories] = useState(null); // null = loading
  const [listError, setListError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [formMode, setFormMode] = useState(null); // null | "create" | category object being edited
  const [formValues, setFormValues] = useState(emptyForm);
  const [slugTouched, setSlugTouched] = useState(false);
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
      const res = await fetch("/api/admin/categories");
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
    setSlugTouched(false);
    setFormError("");
    setSuccessMessage("");
  }

  function openEditForm(category) {
    setFormMode(category);
    setFormValues({
      name: category.name,
      slug: category.slug,
      description: category.description ?? "",
      sortOrder: String(category.sortOrder),
    });
    setSlugTouched(true); // don't silently rewrite an existing slug just because the name is edited
    setFormError("");
    setSuccessMessage("");
  }

  function closeForm() {
    setFormMode(null);
    setFormError("");
  }

  function handleNameChange(value) {
    setFormValues((prev) => ({
      ...prev,
      name: value,
      slug: slugTouched ? prev.slug : slugify(value),
    }));
  }

  function handleSlugChange(value) {
    setSlugTouched(true);
    setFormValues((prev) => ({ ...prev, slug: value }));
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
      const res = await fetch(
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

      setSuccessMessage(isEditing ? "Category updated." : "Category created.");
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
      const res = await fetch(`/api/admin/categories/${deleteTarget.id}`, { method: "DELETE" });
      const data = await parseJsonSafe(res);

      if (!res.ok) {
        // e.g. 409 CONFLICT because posts still reference this category —
        // keep the dialog open and show why, don't remove it from the list.
        setDeleteError(data?.error?.message ?? "Could not delete this category.");
        setDeleteLoading(false);
        return;
      }

      setSuccessMessage(`Deleted "${deleteTarget.name}".`);
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
    setSuccessMessage("");
    try {
      const res = await fetch("/api/admin/categories/reorder", {
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Categories</h1>
        <button type="button" style={buttonStyle} onClick={openCreateForm}>
          + Add Category
        </button>
      </div>

      {successMessage ? (
        <p role="status" style={{ color: "green", margin: 0 }}>
          {successMessage}
        </p>
      ) : null}

      {listError ? (
        <p role="alert" style={{ color: "crimson", margin: 0 }}>
          {listError}
        </p>
      ) : null}

      {formMode ? (
        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            border: "1px solid #ddd",
            borderRadius: "6px",
            padding: "1rem",
            maxWidth: "480px",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "1.1rem" }}>
            {formMode === "create" ? "Add Category" : `Edit "${formMode.name}"`}
          </h2>

          {formError ? (
            <p role="alert" style={{ color: "crimson", margin: 0, fontSize: "0.9rem" }}>
              {formError}
            </p>
          ) : null}

          <label style={labelStyle}>
            Name
            <input
              style={inputStyle}
              type="text"
              required
              value={formValues.name}
              onChange={(e) => handleNameChange(e.target.value)}
            />
          </label>

          <label style={labelStyle}>
            Slug
            <input
              style={inputStyle}
              type="text"
              required
              value={formValues.slug}
              onChange={(e) => handleSlugChange(e.target.value)}
            />
          </label>

          <label style={labelStyle}>
            Description
            <textarea
              style={{ ...inputStyle, fontFamily: "inherit", minHeight: "70px" }}
              value={formValues.description}
              onChange={(e) => setFormValues((prev) => ({ ...prev, description: e.target.value }))}
            />
          </label>

          <label style={labelStyle}>
            Order
            <input
              style={inputStyle}
              type="number"
              min="0"
              placeholder="(auto)"
              value={formValues.sortOrder}
              onChange={(e) => setFormValues((prev) => ({ ...prev, sortOrder: e.target.value }))}
            />
          </label>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="submit" style={buttonStyle} disabled={formSaving}>
              {formSaving ? "Saving…" : "Save"}
            </button>
            <button type="button" style={buttonStyle} onClick={closeForm} disabled={formSaving}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {categories === null ? (
        <p>Loading categories…</p>
      ) : categories.length === 0 ? (
        <div style={{ padding: "1.5rem", border: "1px dashed #ccc", borderRadius: "6px" }}>
          <p>No categories yet.</p>
          <button type="button" style={buttonStyle} onClick={openCreateForm}>
            + Add Category
          </button>
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Slug</th>
              <th style={thStyle}>Description</th>
              <th style={thStyle}>Order</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category, index) => (
              <tr key={category.id}>
                <td style={tdStyle}>{category.name}</td>
                <td style={tdStyle}>
                  <code>{category.slug}</code>
                </td>
                <td style={tdStyle}>{category.description || <em>—</em>}</td>
                <td style={tdStyle}>{category.sortOrder}</td>
                <td style={tdStyle}>
                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      style={buttonStyle}
                      onClick={() => moveCategory(index, -1)}
                      disabled={index === 0 || reorderingId !== null}
                      aria-label={`Move ${category.name} up`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      style={buttonStyle}
                      onClick={() => moveCategory(index, 1)}
                      disabled={index === categories.length - 1 || reorderingId !== null}
                      aria-label={`Move ${category.name} down`}
                    >
                      ↓
                    </button>
                    <button type="button" style={buttonStyle} onClick={() => openEditForm(category)}>
                      Edit
                    </button>
                    <button type="button" style={buttonStyle} onClick={() => confirmDelete(category)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {deleteTarget ? (
        <div
          role="alertdialog"
          aria-label="Confirm delete"
          style={{
            border: "1px solid #ddd",
            borderRadius: "6px",
            padding: "1rem",
            maxWidth: "420px",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          <p style={{ margin: 0 }}>
            Delete category <strong>{deleteTarget.name}</strong>? This can&apos;t be undone.
          </p>

          {deleteError ? (
            <p role="alert" style={{ color: "crimson", margin: 0, fontSize: "0.9rem" }}>
              {deleteError}
            </p>
          ) : null}

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="button" style={buttonStyle} onClick={performDelete} disabled={deleteLoading}>
              {deleteLoading ? "Deleting…" : "Delete"}
            </button>
            <button type="button" style={buttonStyle} onClick={cancelDelete} disabled={deleteLoading}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
