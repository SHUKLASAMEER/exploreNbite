"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

const inputStyle = { padding: "0.4rem 0.5rem", fontSize: "1rem" };
const labelStyle = { display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.9rem" };
const buttonStyle = { padding: "0.4rem 0.8rem", cursor: "pointer" };
const sectionStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "0.75rem",
  border: "1px solid #ddd",
  borderRadius: "6px",
  padding: "1rem",
};

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
};

export default function AwardForm({ mode, awardId }) {
  const router = useRouter();
  const isEditing = mode === "edit";

  const [loading, setLoading] = useState(isEditing);
  const [loadError, setLoadError] = useState("");

  const [form, setForm] = useState(emptyForm);

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
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
    setSuccessMessage("");
    setSaving(true);

    const payload = {
      title: form.title,
      imageUrl: form.imageUrl,
      sourceLink: form.sourceLink,
      dateReceived: form.dateReceived === "" ? null : form.dateReceived,
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
        setSuccessMessage("Award updated.");
        setSaving(false);
      } else {
        // Created -> continue editing the now-persisted award, same
        // pattern used by the Posts/Pages/Books editors.
        router.push(`/admin/awards/${data.award.id}/edit`);
      }
    } catch {
      setFormError("Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  if (loading) {
    return <p>Loading…</p>;
  }

  if (loadError) {
    return (
      <p role="alert" style={{ color: "crimson" }}>
        {loadError}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: "560px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>{isEditing ? "Edit Award" : "Add Award"}</h1>
        <button type="button" style={buttonStyle} onClick={() => router.push("/admin/awards")}>
          ← Back to Awards
        </button>
      </div>

      {successMessage ? (
        <p role="status" style={{ color: "green", margin: 0 }}>
          {successMessage}
        </p>
      ) : null}
      {formError ? (
        <p role="alert" style={{ color: "crimson", margin: 0 }}>
          {formError}
        </p>
      ) : null}

      <section style={sectionStyle}>
        <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Details</h2>

        <label style={labelStyle}>
          Title
          <input
            style={inputStyle}
            type="text"
            required
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
          />
        </label>

        <label style={labelStyle}>
          Image / Badge URL <span style={{ color: "#888", fontWeight: "normal" }}>(optional)</span>
          <input
            style={inputStyle}
            type="text"
            placeholder="https://…"
            value={form.imageUrl}
            onChange={(e) => setForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
          />
        </label>

        <label style={labelStyle}>
          Source Link <span style={{ color: "#888", fontWeight: "normal" }}>(optional)</span>
          <input
            style={inputStyle}
            type="text"
            placeholder="https://…"
            value={form.sourceLink}
            onChange={(e) => setForm((prev) => ({ ...prev, sourceLink: e.target.value }))}
          />
        </label>

        <label style={labelStyle}>
          Date Received <span style={{ color: "#888", fontWeight: "normal" }}>(optional)</span>
          <input
            style={inputStyle}
            type="date"
            value={form.dateReceived}
            onChange={(e) => setForm((prev) => ({ ...prev, dateReceived: e.target.value }))}
          />
        </label>
      </section>

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button type="submit" style={buttonStyle} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
        <button type="button" style={buttonStyle} onClick={() => router.push("/admin/awards")} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  );
}
