"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

const LINK_TYPES = [
  { value: "page", label: "Page" },
  { value: "category", label: "Category" },
  { value: "custom_url", label: "Custom URL" },
  { value: "group", label: "Group (dropdown parent — no link)" },
];

const emptyForm = {
  label: "",
  linkType: "page",
  pageId: "",
  categoryId: "",
  customUrl: "",
  parentId: "",
  sortOrder: "",
};

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
  if (item.linkType === "group") {
    return <em style={{ color: "#888" }}>Dropdown parent (no link)</em>;
  }
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

// The flat API list -> [{ item, depth }] in nav order: each top-level item,
// immediately followed by the items nested under it. This is exactly the
// order the public header renders (see lib/navGroups.js), so what the admin
// sees here matches the site.
function toTreeRows(items) {
  const groupIds = new Set(items.filter((i) => i.linkType === "group").map((i) => i.id));
  const childrenByParent = new Map();
  for (const item of items) {
    if (item.parentId != null && groupIds.has(item.parentId)) {
      if (!childrenByParent.has(item.parentId)) childrenByParent.set(item.parentId, []);
      childrenByParent.get(item.parentId).push(item);
    }
  }
  const rows = [];
  for (const item of items) {
    const isTopLevel = item.parentId == null || !groupIds.has(item.parentId);
    if (!isTopLevel) continue;
    rows.push({ item, depth: 0 });
    for (const child of childrenByParent.get(item.id) ?? []) {
      rows.push({ item: child, depth: 1 });
    }
  }
  return rows;
}

// Reorders one scope (top level, or the children of a single group) by
// swapping two neighbours, then flattens the whole tree back to a single id
// list for PATCH /api/admin/menu/reorder (which still takes the full order).
function reorderWithinScope(items, movingItem, direction) {
  const groupIds = new Set(items.filter((i) => i.linkType === "group").map((i) => i.id));
  const childrenByParent = new Map();
  const topLevel = [];
  for (const item of items) {
    const isTop = item.parentId == null || !groupIds.has(item.parentId);
    if (isTop) {
      topLevel.push(item);
    } else {
      if (!childrenByParent.has(item.parentId)) childrenByParent.set(item.parentId, []);
      childrenByParent.get(item.parentId).push(item);
    }
  }

  const movingIsTop = movingItem.parentId == null || !groupIds.has(movingItem.parentId);
  const scope = movingIsTop ? topLevel : childrenByParent.get(movingItem.parentId) ?? [];
  const index = scope.findIndex((i) => i.id === movingItem.id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= scope.length) return null;
  [scope[index], scope[target]] = [scope[target], scope[index]];

  const flat = [];
  for (const item of topLevel) {
    flat.push(item.id);
    if (groupIds.has(item.id)) {
      for (const child of childrenByParent.get(item.id) ?? []) flat.push(child.id);
    }
  }
  return flat;
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

  const [reordering, setReordering] = useState(false);

  const groupOptions = useMemo(
    () => (menuItems ?? []).filter((item) => item.linkType === "group"),
    [menuItems]
  );
  const treeRows = useMemo(() => toTreeRows(menuItems ?? []), [menuItems]);

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
      // Non-fatal — the affected picker just shows no options.
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
      parentId: item.parentId ? String(item.parentId) : "",
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
    // Switching link type clears the other targets. A group can't have a
    // parent, so clear that too when switching to "group".
    setFormValues((prev) => ({
      ...prev,
      linkType,
      pageId: "",
      categoryId: "",
      customUrl: "",
      parentId: linkType === "group" ? "" : prev.parentId,
    }));
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
    } else if (formValues.linkType === "custom_url") {
      payload.customUrl = formValues.customUrl;
    }
    // parentId is always sent (null clears it) except for groups, which
    // can't be nested.
    if (formValues.linkType !== "group") {
      payload.parentId = formValues.parentId ? Number(formValues.parentId) : null;
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

  async function moveMenuItem(item, direction) {
    if (!menuItems || reordering) return;
    const order = reorderWithinScope(menuItems, item, direction);
    if (!order) return;

    setReordering(true);
    setSuccessMessage("");
    try {
      const res = await apiFetch("/api/admin/menu/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order }),
      });
      const data = await parseJsonSafe(res);
      if (!res.ok) {
        setListError(data?.error?.message ?? "Could not reorder menu items.");
        setReordering(false);
        return;
      }
      setMenuItems(data.menuItems ?? menuItems);
      setReordering(false);
    } catch {
      setListError("Could not reorder menu items.");
      setReordering(false);
    }
  }

  // Is `row` first / last within its own scope (top level, or its group's
  // children)? Used to disable the up/down buttons at the edges.
  function scopeEdges(row, index) {
    const sameScope = (a, b) =>
      (a.item.parentId ?? null) === (b.item.parentId ?? null) && a.depth === b.depth;
    const prev = treeRows[index - 1];
    const next = treeRows[index + 1];
    return {
      isFirst: !prev || !sameScope(prev, row),
      isLast: !next || !sameScope(next, row),
    };
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Menu</h1>
        <button type="button" style={buttonStyle} onClick={openCreateForm}>
          + Add Menu Item
        </button>
      </div>

      <p style={{ margin: 0, fontSize: "0.9rem", color: "#555" }}>
        This is the public site&apos;s navigation, exactly as it renders. A <strong>Group</strong> is a
        dropdown parent with no page of its own (e.g. <em>Travel</em>, <em>More About Me</em>); set an
        item&apos;s <strong>Parent group</strong> to nest it in that dropdown. Use ↑/↓ to reorder within
        the top level or within a dropdown.
      </p>

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

          {formValues.linkType === "group" ? (
            <p style={{ margin: 0, fontSize: "0.8rem", color: "#888" }}>
              A group has no destination — it just holds the items nested under it as a dropdown.
            </p>
          ) : null}

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

          {formValues.linkType !== "group" ? (
            <label style={labelStyle}>
              Parent group <span style={{ color: "#888", fontWeight: "normal" }}>(optional)</span>
              <select
                style={inputStyle}
                value={formValues.parentId}
                onChange={(e) => setFormValues((prev) => ({ ...prev, parentId: e.target.value }))}
              >
                <option value="">— Top level —</option>
                {groupOptions
                  .filter((g) => formMode === "create" || g.id !== formMode.id)
                  .map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.label}
                    </option>
                  ))}
              </select>
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
            {treeRows.map((row, index) => {
              const { item, depth } = row;
              const { isFirst, isLast } = scopeEdges(row, index);
              return (
                <tr key={item.id}>
                  <td style={{ ...tdStyle, paddingLeft: depth ? "2rem" : "0.5rem" }}>
                    {depth ? <span style={{ color: "#aaa" }}>↳ </span> : null}
                    {item.linkType === "group" ? <strong>{item.label}</strong> : item.label}
                  </td>
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
                        onClick={() => moveMenuItem(item, -1)}
                        disabled={isFirst || reordering}
                        aria-label={`Move ${item.label} up`}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        style={buttonStyle}
                        onClick={() => moveMenuItem(item, 1)}
                        disabled={isLast || reordering}
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
              );
            })}
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
