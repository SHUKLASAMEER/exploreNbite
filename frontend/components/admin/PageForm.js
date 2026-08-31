"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { apiFetch } from "@/lib/api";
import RichTextEditor from "@/components/admin/RichTextEditor";
import PageHeader from "@/components/admin/ui/PageHeader";
import Button from "@/components/admin/ui/Button";
import FormField from "@/components/admin/ui/FormField";
import LoadingState from "@/components/admin/ui/LoadingState";
import ErrorState from "@/components/admin/ui/ErrorState";
import { useToast } from "@/components/admin/ui/Toast";
import styles from "./PageForm.module.css";

async function parseJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

const emptyForm = {
  title: "",
  slug: "",
  content: "",
  showInMenu: false,
  menuPosition: "",
};

export default function PageForm({ mode, pageId }) {
  const router = useRouter();
  const showToast = useToast();
  const isEditing = mode === "edit";

  const [loading, setLoading] = useState(isEditing);
  const [loadError, setLoadError] = useState("");

  const [form, setForm] = useState(emptyForm);

  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEditing) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError("");
      try {
        const res = await apiFetch(`/api/admin/pages/${pageId}`);
        const data = await parseJsonSafe(res);
        if (!res.ok) {
          throw new Error(data?.error?.message ?? "Failed to load this page.");
        }
        if (cancelled) return;
        const page = data.page;
        setForm({
          title: page.title,
          slug: page.slug,
          content: page.content,
          showInMenu: page.showInMenu,
          menuPosition: page.menuPosition === null || page.menuPosition === undefined ? "" : String(page.menuPosition),
        });
      } catch (err) {
        if (!cancelled) setLoadError(err.message || "Failed to load this page.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isEditing, pageId]);

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");
    setSaving(true);

    const payload = {
      title: form.title,
      slug: form.slug,
      content: form.content,
      showInMenu: form.showInMenu,
      menuPosition: form.menuPosition === "" ? null : Number(form.menuPosition),
    };

    try {
      const res = await apiFetch(isEditing ? `/api/admin/pages/${pageId}` : "/api/admin/pages", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await parseJsonSafe(res);

      if (!res.ok) {
        setFormError(data?.error?.message ?? "Could not save this page.");
        setSaving(false);
        return;
      }

      if (isEditing) {
        showToast("Page updated.");
        setSaving(false);
      } else {
        // Created -> continue editing the now-persisted page, same pattern
        // used by the Posts editor.
        showToast("Page created.");
        router.push(`/admin/pages/${data.page.id}/edit`);
      }
    } catch {
      setFormError("Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingState label="Loading page form…" />;
  }

  if (loadError) {
    return <ErrorState title="Couldn't load this form" description={loadError} />;
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <PageHeader
        title={isEditing ? "Edit Page" : "Add Page"}
        actions={
          <Button variant="secondary" icon={ArrowLeft} onClick={() => router.push("/admin/pages")}>
            Back to Pages
          </Button>
        }
      />

      {formError ? <ErrorState title={formError} /> : null}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Basic</h2>

        <FormField
          label="Title"
          htmlFor="page-title"
          required
          value={form.title}
          onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
        />

        <FormField
          label="Slug"
          htmlFor="page-slug"
          hint="Optional — leave blank to auto-generate from the title."
          placeholder="(auto)"
          value={form.slug}
          onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
        />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Content</h2>
        <RichTextEditor value={form.content} onChange={(html) => setForm((prev) => ({ ...prev, content: html }))} />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Menu</h2>

        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={form.showInMenu}
            onChange={(e) => setForm((prev) => ({ ...prev, showInMenu: e.target.checked }))}
          />
          Show in menu
        </label>

        <FormField
          label="Menu position"
          htmlFor="page-menu-position"
          hint="Optional — leave blank to add it at the end."
          type="number"
          min="0"
          placeholder="(auto)"
          value={form.menuPosition}
          onChange={(e) => setForm((prev) => ({ ...prev, menuPosition: e.target.value }))}
        />
      </section>

      <div className={styles.formActions}>
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.push("/admin/pages")} disabled={saving}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
