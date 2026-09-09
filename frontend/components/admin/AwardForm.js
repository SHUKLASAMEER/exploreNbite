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
import styles from "./AwardForm.module.css";

async function parseJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

// Award.dateReceived is `@db.Date` (date only) — <input type="date"> works
// with plain "YYYY-MM-DD" values, unlike Post's datetime-local publishDate.
function toDateInputValue(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const emptyForm = {
  title: "",
  imageUrl: "",
  sourceLink: "",
  dateReceived: "",
  badgeSlot: "none",
};

// Where (if anywhere) this award shows up in the public sidebar. award_photo
// / tripoto / indiblogger each hold exactly one award (the backend rejects a
// second). Sur.ly is a separate static widget, not an award.
const BADGE_SLOT_OPTIONS = [
  { value: "none", label: "None" },
  { value: "award_photo", label: "Award Photo (heading + image)" },
  { value: "tripoto", label: "Tripoto badge" },
  { value: "indiblogger", label: "IndiBlogger badge" },
];

export default function AwardForm({ mode, awardId }) {
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
        const res = await apiFetch(`/api/admin/awards/${awardId}`);
        const data = await parseJsonSafe(res);
        if (!res.ok) {
          throw new Error(data?.error?.message ?? "Failed to load this award.");
        }
        if (cancelled) return;
        const award = data.award;
        setForm({
          title: award.title,
          imageUrl: award.imageUrl ?? "",
          sourceLink: award.sourceLink ?? "",
          dateReceived: toDateInputValue(award.dateReceived),
          badgeSlot: award.badgeSlot ?? "none",
        });
      } catch (err) {
        if (!cancelled) setLoadError(err.message || "Failed to load this award.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isEditing, awardId]);

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");
    setSaving(true);

    const payload = {
      title: form.title,
      imageUrl: form.imageUrl,
      sourceLink: form.sourceLink,
      dateReceived: form.dateReceived === "" ? null : form.dateReceived,
      badgeSlot: form.badgeSlot,
    };

    try {
      const res = await apiFetch(isEditing ? `/api/admin/awards/${awardId}` : "/api/admin/awards", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await parseJsonSafe(res);

      if (!res.ok) {
        setFormError(data?.error?.message ?? "Could not save this award.");
        setSaving(false);
        return;
      }

      if (isEditing) {
        showToast("Award updated.");
        setSaving(false);
      } else {
        // Created -> continue editing the now-persisted award, same
        // pattern used by the Posts/Pages/Books editors.
        showToast("Award created.");
        router.push(`/admin/awards/${data.award.id}/edit`);
      }
    } catch {
      setFormError("Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingState label="Loading award form…" />;
  }

  if (loadError) {
    return <ErrorState title="Couldn't load this form" description={loadError} />;
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <PageHeader
        title={isEditing ? "Edit Award" : "Add Award"}
        actions={
          <Button variant="secondary" icon={ArrowLeft} onClick={() => router.push("/admin/awards")}>
            Back to Awards
          </Button>
        }
      />

      {formError ? <ErrorState title={formError} /> : null}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Details</h2>

        <FormField
          label="Title"
          htmlFor="award-title"
          required
          value={form.title}
          onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
        />

        <ImageUpload
          label="Image / Badge"
          value={form.imageUrl}
          onChange={(url) => setForm((prev) => ({ ...prev, imageUrl: url }))}
        />

        <FormField
          label="Source Link"
          htmlFor="award-source-link"
          hint="Optional — link to the article or announcement."
          placeholder="https://…"
          value={form.sourceLink}
          onChange={(e) => setForm((prev) => ({ ...prev, sourceLink: e.target.value }))}
        />

        <FormField
          label="Date Received"
          htmlFor="award-date-received"
          hint="Optional."
          type="date"
          value={form.dateReceived}
          onChange={(e) => setForm((prev) => ({ ...prev, dateReceived: e.target.value }))}
        />

        <FormField
          label="Sidebar Badge Slot"
          htmlFor="award-badge-slot"
          hint="Where this award appears in the public sidebar. Each slot holds one award."
        >
          <select
            id="award-badge-slot"
            className={styles.select}
            value={form.badgeSlot}
            onChange={(e) => setForm((prev) => ({ ...prev, badgeSlot: e.target.value }))}
          >
            {BADGE_SLOT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </FormField>
      </section>

      <div className={styles.formActions}>
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.push("/admin/awards")} disabled={saving}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
