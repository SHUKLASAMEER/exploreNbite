"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ImagePlus } from "lucide-react";
import { apiFetch } from "@/lib/api";
import PageHeader from "@/components/admin/ui/PageHeader";
import Button from "@/components/admin/ui/Button";
import FormField from "@/components/admin/ui/FormField";
import ErrorState from "@/components/admin/ui/ErrorState";
import styles from "./MediaUploadForm.module.css";

async function parseJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

// Deliberately not built on the shared ImageUpload primitive: that
// component uploads as soon as a file is picked, but this page's existing
// behavior lets the admin attach alt text *before* the single upload
// request goes out (file + altText together). Preserving that flow exactly
// as it worked before — just restyled.
export default function MediaUploadForm() {
  const router = useRouter();

  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [altText, setAltText] = useState("");

  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  function handleFileChange(event) {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setFormError("");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(selected ? URL.createObjectURL(selected) : "");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");

    if (!file) {
      setFormError("Choose an image file first.");
      return;
    }

    setSaving(true);

    // multipart/form-data, not JSON — the browser sets the correct
    // Content-Type (including the boundary) itself as long as we don't set
    // one ourselves.
    const formData = new FormData();
    formData.append("file", file);
    if (altText.trim()) {
      formData.append("altText", altText.trim());
    }

    try {
      const res = await apiFetch("/api/admin/media", {
        method: "POST",
        body: formData,
      });
      const data = await parseJsonSafe(res);

      if (!res.ok) {
        setFormError(data?.error?.message ?? "Could not upload this image.");
        setSaving(false);
        return;
      }

      router.push("/admin/media");
    } catch {
      setFormError("Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <PageHeader
        title="Upload Image"
        actions={
          <Button variant="secondary" icon={ArrowLeft} onClick={() => router.push("/admin/media")}>
            Back to Media
          </Button>
        }
      />

      {formError ? <ErrorState title={formError} /> : null}

      <section className={styles.section}>
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- local object URL preview, not a project asset
          <img src={previewUrl} alt="" className={styles.preview} />
        ) : (
          <label className={styles.dropzone}>
            <ImagePlus size={22} strokeWidth={1.5} aria-hidden="true" />
            <span>Click to choose an image</span>
            <span className={styles.dropzoneHint}>JPEG, PNG, GIF, or WebP — up to 5MB</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleFileChange}
              hidden
            />
          </label>
        )}

        {previewUrl ? (
          <label className={styles.replaceLink}>
            Choose a different file
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleFileChange}
              hidden
            />
          </label>
        ) : null}

        <FormField
          label="Alt text"
          htmlFor="media-alt-text"
          hint="Optional."
          placeholder="Describe the image for accessibility"
          value={altText}
          onChange={(e) => setAltText(e.target.value)}
        />
      </section>

      <div className={styles.formActions}>
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Uploading…" : "Upload"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.push("/admin/media")} disabled={saving}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
