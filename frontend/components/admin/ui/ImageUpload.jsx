"use client";

import { useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import styles from "./ImageUpload.module.css";

async function parseJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

// Uploads the file to the real media library (POST /api/admin/media,
// multipart/form-data) and reports back the resulting fileUrl — mirrors
// components/admin/MediaUploadForm.js. Never encodes the image as base64.
export default function ImageUpload({ label, value, onChange, altText, onAltTextChange, required }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError("");
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    if (altText?.trim()) {
      formData.append("altText", altText.trim());
    }

    try {
      const res = await apiFetch("/api/admin/media", { method: "POST", body: formData });
      const data = await parseJsonSafe(res);

      if (!res.ok) {
        setError(data?.error?.message ?? "Could not upload this image.");
        setUploading(false);
        return;
      }

      onChange(data?.media?.fileUrl ?? "");
      setUploading(false);
    } catch {
      setError("Something went wrong. Please try again.");
      setUploading(false);
    }
  }

  return (
    <div className={styles.wrap}>
      {label ? (
        <span className={styles.label}>
          {label}
          {required ? <span className={styles.required}> *</span> : null}
        </span>
      ) : null}

      {value ? (
        <div className={styles.preview}>
          {/* eslint-disable-next-line @next/next/no-img-element -- remote media URL, not a local project asset */}
          <img src={value} alt="" className={styles.previewImg} />
          <button type="button" className={styles.removeButton} onClick={() => onChange("")} aria-label="Remove image">
            <X size={14} strokeWidth={2} />
          </button>
        </div>
      ) : (
        <label className={styles.dropzone}>
          <ImagePlus size={22} strokeWidth={1.5} aria-hidden="true" />
          <span>{uploading ? "Uploading…" : "Click to upload an image"}</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileChange}
            disabled={uploading}
            hidden
          />
        </label>
      )}

      {onAltTextChange ? (
        <input
          type="text"
          className={styles.altInput}
          placeholder="Alt text (optional)"
          value={altText ?? ""}
          onChange={(e) => onAltTextChange(e.target.value)}
        />
      ) : null}

      {error ? (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
