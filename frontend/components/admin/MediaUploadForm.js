"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

const inputStyle = { padding: "0.4rem 0.5rem", fontSize: "1rem" };
const labelStyle = { display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.9rem" };
const buttonStyle = { padding: "0.4rem 0.8rem", cursor: "pointer" };

async function parseJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

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
    <form
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        maxWidth: "480px",
        border: "1px solid #ddd",
        borderRadius: "6px",
        padding: "1rem",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0, fontSize: "1.3rem" }}>Upload Image</h1>
        <button type="button" style={buttonStyle} onClick={() => router.push("/admin/media")}>
          ← Back to Media
        </button>
      </div>

      {formError ? (
        <p role="alert" style={{ color: "crimson", margin: 0 }}>
          {formError}
        </p>
      ) : null}

      <label style={labelStyle}>
        Image file <span style={{ color: "#888", fontWeight: "normal" }}>(JPEG, PNG, GIF, or WebP — up to 5MB)</span>
        <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleFileChange} required />
      </label>

      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- local object URL preview, not a project asset
        <img src={previewUrl} alt="" style={{ maxWidth: "100%", maxHeight: "220px", objectFit: "contain" }} />
      ) : null}

      <label style={labelStyle}>
        Alt text <span style={{ color: "#888", fontWeight: "normal" }}>(optional)</span>
        <input
          style={inputStyle}
          type="text"
          placeholder="Describe the image for accessibility"
          value={altText}
          onChange={(e) => setAltText(e.target.value)}
        />
      </label>

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button type="submit" style={buttonStyle} disabled={saving}>
          {saving ? "Uploading…" : "Upload"}
        </button>
        <button type="button" style={buttonStyle} onClick={() => router.push("/admin/media")} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  );
}
