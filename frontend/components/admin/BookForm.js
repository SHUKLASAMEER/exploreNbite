"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowUp, ArrowDown, X, Plus } from "lucide-react";
import { apiFetch } from "@/lib/api";
import PageHeader from "@/components/admin/ui/PageHeader";
import Button from "@/components/admin/ui/Button";
import FormField from "@/components/admin/ui/FormField";
import ImageUpload from "@/components/admin/ui/ImageUpload";
import LoadingState from "@/components/admin/ui/LoadingState";
import ErrorState from "@/components/admin/ui/ErrorState";
import { useToast } from "@/components/admin/ui/Toast";
import styles from "./BookForm.module.css";

async function parseJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

const emptyForm = {
  title: "",
  coverImageUrl: "",
  publishedYear: "",
  description: "",
  buyLinks: [],
};

export default function BookForm({ mode, bookId }) {
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
        const res = await apiFetch(`/api/admin/books/${bookId}`);
        const data = await parseJsonSafe(res);
        if (!res.ok) {
          throw new Error(data?.error?.message ?? "Failed to load this book.");
        }
        if (cancelled) return;
        const book = data.book;
        setForm({
          title: book.title,
          coverImageUrl: book.coverImageUrl ?? "",
          publishedYear: book.publishedYear === null || book.publishedYear === undefined ? "" : String(book.publishedYear),
          description: book.description,
          buyLinks: book.buyLinks
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((link) => ({ platformName: link.platformName, url: link.url })),
        });
      } catch (err) {
        if (!cancelled) setLoadError(err.message || "Failed to load this book.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isEditing, bookId]);

  function addBuyLink() {
    setForm((prev) => ({ ...prev, buyLinks: [...prev.buyLinks, { platformName: "", url: "" }] }));
  }

  function updateBuyLink(index, field, value) {
    setForm((prev) => ({
      ...prev,
      buyLinks: prev.buyLinks.map((link, i) => (i === index ? { ...link, [field]: value } : link)),
    }));
  }

  function removeBuyLink(index) {
    setForm((prev) => ({ ...prev, buyLinks: prev.buyLinks.filter((_, i) => i !== index) }));
  }

  function moveBuyLink(index, direction) {
    setForm((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.buyLinks.length) return prev;
      const links = [...prev.buyLinks];
      [links[index], links[target]] = [links[target], links[index]];
      return { ...prev, buyLinks: links };
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");
    setSaving(true);

    const payload = {
      title: form.title,
      coverImageUrl: form.coverImageUrl,
      publishedYear: form.publishedYear === "" ? null : Number(form.publishedYear),
      description: form.description,
      // Array position IS the order — same "position, not a separate typed
      // number" approach as Categories' reorder endpoint.
      buyLinks: form.buyLinks.map((link, index) => ({ ...link, sortOrder: index })),
    };

    try {
      const res = await apiFetch(isEditing ? `/api/admin/books/${bookId}` : "/api/admin/books", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await parseJsonSafe(res);

      if (!res.ok) {
        setFormError(data?.error?.message ?? "Could not save this book.");
        setSaving(false);
        return;
      }

      if (isEditing) {
        showToast("Book updated.");
        setSaving(false);
      } else {
        // Created -> continue editing the now-persisted book, same pattern
        // used by the Posts/Pages editors.
        showToast("Book created.");
        router.push(`/admin/books/${data.book.id}/edit`);
      }
    } catch {
      setFormError("Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingState label="Loading book form…" />;
  }

  if (loadError) {
    return <ErrorState title="Couldn't load this form" description={loadError} />;
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <PageHeader
        title={isEditing ? "Edit Book" : "Add Book"}
        actions={
          <Button variant="secondary" icon={ArrowLeft} onClick={() => router.push("/admin/books")}>
            Back to Books
          </Button>
        }
      />

      {formError ? <ErrorState title={formError} /> : null}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Basic Information</h2>

        <FormField
          label="Book Title"
          htmlFor="book-title"
          required
          value={form.title}
          onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
        />

        <ImageUpload
          label="Cover Image"
          value={form.coverImageUrl}
          onChange={(url) => setForm((prev) => ({ ...prev, coverImageUrl: url }))}
        />

        <FormField
          label="Published Year"
          htmlFor="book-published-year"
          hint="Optional."
          type="number"
          placeholder="e.g. 2021"
          value={form.publishedYear}
          onChange={(e) => setForm((prev) => ({ ...prev, publishedYear: e.target.value }))}
        />

        <FormField
          label="Description"
          htmlFor="book-description"
          as="textarea"
          required
          value={form.description}
          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
        />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Buy Links</h2>

        {form.buyLinks.length === 0 ? <p className={styles.hintInline}>No buy links yet.</p> : null}

        {form.buyLinks.map((link, index) => (
          <div key={index} className={styles.buyLinkRow}>
            <div className={styles.buyLinkPlatform}>
              <FormField
                label="Platform Name"
                htmlFor={`book-buylink-platform-${index}`}
                placeholder="e.g. Amazon"
                value={link.platformName}
                onChange={(e) => updateBuyLink(index, "platformName", e.target.value)}
              />
            </div>
            <div className={styles.buyLinkUrl}>
              <FormField
                label="URL"
                htmlFor={`book-buylink-url-${index}`}
                placeholder="https://…"
                value={link.url}
                onChange={(e) => updateBuyLink(index, "url", e.target.value)}
              />
            </div>
            <div className={styles.buyLinkActions}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                icon={ArrowUp}
                onClick={() => moveBuyLink(index, -1)}
                disabled={index === 0}
                aria-label={`Move buy link ${index + 1} up`}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                icon={ArrowDown}
                onClick={() => moveBuyLink(index, 1)}
                disabled={index === form.buyLinks.length - 1}
                aria-label={`Move buy link ${index + 1} down`}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                icon={X}
                onClick={() => removeBuyLink(index)}
                aria-label={`Remove buy link ${index + 1}`}
              />
            </div>
          </div>
        ))}

        <Button type="button" variant="secondary" size="sm" icon={Plus} onClick={addBuyLink}>
          Add Buy Link
        </Button>
      </section>

      <div className={styles.formActions}>
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.push("/admin/books")} disabled={saving}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
