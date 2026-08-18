"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

const LINK_TYPES = [
  { value: "page", label: "Page" },
  { value: "category", label: "Category" },
  { value: "custom_url", label: "Custom URL" },
];

const emptyForm = { label: "", linkType: "page", pageId: "", categoryId: "", customUrl: "", sortOrder: "" };

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

function targetLabel(item) {
  if (item.linkType === "page") {
    return item.page ? `Page: ${item.page.title}` : <em style={{ color: "crimson" }}>Page not found</em>;
  }
  if (item.linkType === "category") {
    return item.category ? `Category: ${item.category.name}` : <em style={{ color: "crimson" }}>Category not found</em>;
  }
  return (
    <a href={item.customUrl} target="_blank" rel="noreferrer">
      {item.customUrl}
    </a>
  );
}

export default function MenuItemsManager() {
  const [menuItems, setMenuItems] = useState(null); // null = loading
  const [pages, setPages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [listError, setListError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [formMode, setFormMode] = useState(null); // null | "create" | menu item object being edited
  const [formValues, setFormValues] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [formSaving, setFormSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [reorderingId, setReorderingId] = useState(null);

  useEffect(() => {
    loadMenuItems();
    loadPickerData();
  }, []);

  async function loadMenuItems() {
    setListError("");
    try {
      const res = await apiFetch("/api/admin/menu");
      const data = await parseJsonSafe(res);
      if (!res.ok) {
        setListError(data?.error?.message ?? "Failed to load menu items.");
        setMenuItems([]);
        return;
      }
      setMenuItems(data.menuItems ?? []);
    } catch {
      setListError("Failed to load menu items.");
      setMenuItems([]);
    }
  }

  // Pages/categories for the pickers — best-effort only. If either fails to
  // load, the manager itself still works (the affected picker just shows no
  // options); this is not fatal to the page the way loadMenuItems() is.
  async function loadPickerData() {
    try {
      const [pagesRes, categoriesRes] = await Promise.all([
        apiFetch("/api/admin/pages"),
        apiFetch("/api/admin/categories"),
      ]);
      const [pagesData, categoriesData] = await Promise.all([parseJsonSafe(pagesRes), parseJsonSafe(categoriesRes)]);
      if (pagesRes.ok) setPages(pagesData?.pages ?? []);
      if (categoriesRes.ok) setCategories(categoriesData?.categories ?? []);
    } catch {
      // Non-fatal — see comment above.
    }
  }

  function openCreateForm() {
    setFormMode("create");
    setFormValues(emptyForm);
    setFormError("");
    setSuccessMessage("");
  }

  function openEditForm(item) {
    setFormMode(item);
    setFormValues({
      label: item.label,
      linkType: item.linkType,
      pageId: item.pageId ? String(item.pageId) : "",
      categoryId: item.categoryId ? String(item.categoryId) : "",
      customUrl: item.customUrl ?? "",
      sortOrder: String(item.sortOrder),
    });
    setFormError("");
    setSuccessMessage("");
  }

  function closeForm() {
    setFormMode(null);
    setFormError("");
  }

  function setLinkType(linkType) {
    // Switching link type clears the other two targets so the form can
    // never submit a stale, no-longer-relevant pageId/categoryId/customUrl
    // alongside the new type.
    setFormValues((prev) => ({ ...prev, linkType, pageId: "", categoryId: "", customUrl: "" }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");
    setFormSaving(true);

    const isEditing = formMode !== "create";
    const payload = { label: formValues.label, linkType: formValues.linkType };
    if (formValues.linkType === "page") {
      payload.pageId = formValues.pageId ? Number(formValues.pageId) : null;
    } else if (formValues.linkType === "category") {
      payload.categoryId = formValues.categoryId ? Number(formValues.categoryId) : null;
    } else {
      payload.customUrl = formValues.customUrl;
    }
    if (formValues.sortOrder !== "") {
      payload.sortOrder = Number(formValues.sortOrder);
    }

    try {
      const res = await apiFetch(isEditing ? `/api/admin/menu/${formMode.id}` : "/api/admin/menu", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await parseJsonSafe(res);

      if (!res.ok) {
        setFormError(data?.error?.message ?? "Could not save this menu item.");
        setFormSaving(false);
        return;
      }

      setSuccessMessage(isEditing ? "Menu item updated." : "Menu item created.");
      setFormMode(null);
      setFormSaving(false);
      await loadMenuItems();
    } catch {
      setFormError("Something went wrong. Please try again.");
      setFormSaving(false);
    }
  }

  function confirmDelete(item) {
    setDeleteTarget(item);
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
      const res = await apiFetch(`/api/admin/menu/${deleteTarget.id}`, { method: "DELETE" });
      const data = await parseJsonSafe(res);

      if (!res.ok) {
        setDeleteError(data?.error?.message ?? "Could not delete this menu item.");
        setDeleteLoading(false);
        return;
      }

      setSuccessMessage(`Deleted "${deleteTarget.label}".`);
      setDeleteTarget(null);
      setDeleteLoading(false);
      await loadMenuItems();
    } catch {
      setDeleteError("Something went wrong. Please try again.");
      setDeleteLoading(false);
    }
  }

  async function moveMenuItem(index, direction) {
    if (!menuItems) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= menuItems.length) return;

    const reordered = [...menuItems];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];

    setReorderingId(menuItems[index].id);
    setSuccessMessage("");
    try {
      const res = await apiFetch("/api/admin/menu/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: reordered.map((m) => m.id) }),
      });
      const data = await parseJsonSafe(res);

      if (!res.ok) {
        setListError(data?.error?.message ?? "Could not reorder menu items.");
        setReorderingId(null);
        return;
      }

      setMenuItems(data.menuItems ?? reordered);
      setReorderingId(null);
    } catch {
      setListError("Could not reorder menu items.");
      setReorderingId(null);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Menu</h1>
        <button type="button" style={buttonStyle} onClick={openCreateForm}>
          + Add Menu Item
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
            {formMode === "create" ? "Add Menu Item" : `Edit "${formMode.label}"`}
          </h2>

          {formError ? (
            <p role="alert" style={{ color: "crimson", margin: 0, fontSize: "0.9rem" }}>
              {formError}
            </p>
          ) : null}

          <label style={labelStyle}>
            Label
            <input
              style={inputStyle}
              type="text"
              required
              value={formValues.label}
              onChange={(e) => setFormValues((prev) => ({ ...prev, label: e.target.value }))}
            />
          </label>

          <label style={labelStyle}>
            Link Type
            <select style={inputStyle} value={formValues.linkType} onChange={(e) => setLinkType(e.target.value)}>
              {LINK_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>

          {formValues.linkType === "page" ? (
            <label style={labelStyle}>
              Page
              <select
                style={inputStyle}
                required
                value={formValues.pageId}
                onChange={(e) => setFormValues((prev) => ({ ...prev, pageId: e.target.value }))}
              >
                <option value="">Select a page…</option>
                {pages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
              {pages.length === 0 ? (
                <span style={{ color: "#888", fontSize: "0.8rem" }}>No pages exist yet — create one under Pages first.</span>
              ) : null}
            </label>
          ) : null}

          {formValues.linkType === "category" ? (
            <label style={labelStyle}>
              Category
              <select
                style={inputStyle}
                required
                value={formValues.categoryId}
                onChange={(e) => setFormValues((prev) => ({ ...prev, categoryId: e.target.value }))}
              >
                <option value="">Select a category…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {categories.length === 0 ? (
                <span style={{ color: "#888", fontSize: "0.8rem" }}>No categories exist yet.</span>
              ) : null}
            </label>
          ) : null}

          {formValues.linkType === "custom_url" ? (
            <label style={labelStyle}>
              URL
              <input
                style={inputStyle}
                type="text"
                required
                placeholder="https://…"
                value={formValues.customUrl}
                onChange={(e) => setFormValues((prev) => ({ ...prev, customUrl: e.target.value }))}
              />
            </label>
          ) : null}

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

      {menuItems === null ? (
        <p>Loading menu…</p>
      ) : menuItems.length === 0 ? (
        <div style={{ padding: "1.5rem", border: "1px dashed #ccc", borderRadius: "6px" }}>
          <p>No menu items yet. The public site has no navigation until you add some here.</p>
          <button type="button" style={buttonStyle} onClick={openCreateForm}>
            + Add Menu Item
          </button>
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Label</th>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Target</th>
              <th style={thStyle}>Order</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {menuItems.map((item, index) => (
              <tr key={item.id}>
                <td style={tdStyle}>{item.label}</td>
                <td style={tdStyle}>
                  <code>{item.linkType}</code>
                </td>
                <td style={tdStyle}>{targetLabel(item)}</td>
                <td style={tdStyle}>{item.sortOrder}</td>
                <td style={tdStyle}>
                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      style={buttonStyle}
                      onClick={() => moveMenuItem(index, -1)}
                      disabled={index === 0 || reorderingId !== null}
                      aria-label={`Move ${item.label} up`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      style={buttonStyle}
                      onClick={() => moveMenuItem(index, 1)}
                      disabled={index === menuItems.length - 1 || reorderingId !== null}
                      aria-label={`Move ${item.label} down`}
                    >
                      ↓
                    </button>
                    <button type="button" style={buttonStyle} onClick={() => openEditForm(item)}>
                      Edit
                    </button>
                    <button type="button" style={buttonStyle} onClick={() => confirmDelete(item)}>
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
            Delete menu item <strong>{deleteTarget.label}</strong>? This can&apos;t be undone.
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
