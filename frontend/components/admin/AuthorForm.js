"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { apiFetch } from "@/lib/api";
import PageHeader from "@/components/admin/ui/PageHeader";
import Button from "@/components/admin/ui/Button";
import FormField from "@/components/admin/ui/FormField";
import ImageUpload from "@/components/admin/ui/ImageUpload";
import LoadingState from "@/components/admin/ui/LoadingState";
import ErrorState from "@/components/admin/ui/ErrorState";
import { useToast } from "@/components/admin/ui/Toast";
import styles from "./AuthorForm.module.css";

async function parseJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

const emptyForm = {
  name: "",
  bio: "",
  photoUrl: "",
  facebookUrl: "",
  twitterUrl: "",
  instagramUrl: "",
};

export default function AuthorForm({ mode, authorId }) {
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
        const res = await apiFetch(`/api/admin/authors/${authorId}`);
        const data = await parseJsonSafe(res);
        if (!res.ok) {
          throw new Error(data?.error?.message ?? "Failed to load this author.");
        }
        if (cancelled) return;
        const author = data.author;
        setForm({
          name: author.name,
          bio: author.bio ?? "",
          photoUrl: author.photoUrl ?? "",
          facebookUrl: author.facebookUrl ?? "",
          twitterUrl: author.twitterUrl ?? "",
          instagramUrl: author.instagramUrl ?? "",
        });
      } catch (err) {
        if (!cancelled) setLoadError(err.message || "Failed to load this author.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isEditing, authorId]);

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");
    setSaving(true);

    const payload = {
      name: form.name,
      bio: form.bio,
      photoUrl: form.photoUrl,
      facebookUrl: form.facebookUrl,
      twitterUrl: form.twitterUrl,
      instagramUrl: form.instagramUrl,
    };

    try {
      const res = await apiFetch(isEditing ? `/api/admin/authors/${authorId}` : "/api/admin/authors", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await parseJsonSafe(res);

      if (!res.ok) {
        setFormError(data?.error?.message ?? "Could not save this author.");
        setSaving(false);
        return;
      }

      if (isEditing) {
        showToast("Author updated.");
        setSaving(false);
      } else {
        // Created -> continue editing the now-persisted author, same
        // pattern used by the Posts/Pages/Books/Awards editors.
        showToast("Author created.");
        router.push(`/admin/authors/${data.author.id}/edit`);
      }
    } catch {
      setFormError("Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingState label="Loading author form…" />;
  }

  if (loadError) {
    return <ErrorState title="Couldn't load this form" description={loadError} />;
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <PageHeader
        title={isEditing ? "Edit Author" : "Add Author"}
        actions={
          <Button variant="secondary" icon={ArrowLeft} onClick={() => router.push("/admin/authors")}>
            Back to Authors
          </Button>
        }
      />

      {formError ? <ErrorState title={formError} /> : null}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Details</h2>

        <FormField
          label="Name"
          htmlFor="author-name"
          required
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
        />

        <FormField
          label="Bio"
          htmlFor="author-bio"
          hint="Optional."
          as="textarea"
          value={form.bio}
          onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
        />

        <ImageUpload
          label="Photo"
          value={form.photoUrl}
          onChange={(url) => setForm((prev) => ({ ...prev, photoUrl: url }))}
        />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Social Links</h2>

        <FormField
          label="Facebook URL"
          htmlFor="author-facebook"
          hint="Optional."
          placeholder="https://…"
          value={form.facebookUrl}
          onChange={(e) => setForm((prev) => ({ ...prev, facebookUrl: e.target.value }))}
        />

        <FormField
          label="Twitter URL"
          htmlFor="author-twitter"
          hint="Optional."
          placeholder="https://…"
          value={form.twitterUrl}
          onChange={(e) => setForm((prev) => ({ ...prev, twitterUrl: e.target.value }))}
        />

        <FormField
          label="Instagram URL"
          htmlFor="author-instagram"
          hint="Optional."
          placeholder="https://…"
          value={form.instagramUrl}
          onChange={(e) => setForm((prev) => ({ ...prev, instagramUrl: e.target.value }))}
        />
      </section>

      <div className={styles.formActions}>
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.push("/admin/authors")} disabled={saving}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
