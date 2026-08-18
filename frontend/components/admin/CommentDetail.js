"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

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

function formatDate(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

const STATUS_LABELS = { pending: "Pending", approved: "Approved", spam: "Spam" };

export default function CommentDetail({ commentId }) {
  const router = useRouter();

  const [comment, setComment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [actioning, setActioning] = useState(false);

  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError("");
      try {
        const res = await apiFetch(`/api/admin/comments/${commentId}`);
        const data = await parseJsonSafe(res);
        if (!res.ok) {
          throw new Error(data?.error?.message ?? "Failed to load this comment.");
        }
        if (!cancelled) setComment(data.comment);
      } catch (err) {
        if (!cancelled) setLoadError(err.message || "Failed to load this comment.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [commentId]);

  async function changeStatus(status) {
    setActioning(true);
    setActionError("");
    setSuccessMessage("");
    try {
      const res = await apiFetch(`/api/admin/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await parseJsonSafe(res);

      if (!res.ok) {
        setActionError(data?.error?.message ?? "Could not update this comment.");
        setActioning(false);
        return;
      }

      setComment(data.comment);
      setSuccessMessage(`Marked as ${STATUS_LABELS[status].toLowerCase()}.`);
      setActioning(false);
    } catch {
      setActionError("Something went wrong. Please try again.");
      setActioning(false);
    }
  }

  async function performDelete() {
    setDeleteLoading(true);
    setDeleteError("");
    try {
      const res = await apiFetch(`/api/admin/comments/${commentId}`, { method: "DELETE" });
      const data = await parseJsonSafe(res);

      if (!res.ok) {
        setDeleteError(data?.error?.message ?? "Could not delete this comment.");
        setDeleteLoading(false);
        return;
      }

      router.push("/admin/comments");
    } catch {
      setDeleteError("Something went wrong. Please try again.");
      setDeleteLoading(false);
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
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: "640px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Comment</h1>
        <button type="button" style={buttonStyle} onClick={() => router.push("/admin/comments")}>
          ← Back to Comments
        </button>
      </div>

      {successMessage ? (
        <p role="status" style={{ color: "green", margin: 0 }}>
          {successMessage}
        </p>
      ) : null}
      {actionError ? (
        <p role="alert" style={{ color: "crimson", margin: 0 }}>
          {actionError}
        </p>
      ) : null}

      <section style={sectionStyle}>
        <div>
          <strong>Post:</strong> {comment.post?.title ?? "—"}
        </div>
        <div>
          <strong>From:</strong> {comment.readerName} ({comment.email})
        </div>
        <div>
          <strong>Submitted:</strong> {formatDate(comment.createdAt)}
        </div>
        <div>
          <strong>Status:</strong> {STATUS_LABELS[comment.status] ?? comment.status}
        </div>
        <div>
          <strong>Message:</strong>
          <p style={{ whiteSpace: "pre-wrap", marginTop: "0.4rem" }}>{comment.message}</p>
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Moderation</h2>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {comment.status !== "approved" ? (
            <button type="button" style={buttonStyle} disabled={actioning} onClick={() => changeStatus("approved")}>
              Approve
            </button>
          ) : null}
          {comment.status !== "pending" ? (
            <button type="button" style={buttonStyle} disabled={actioning} onClick={() => changeStatus("pending")}>
              Mark Pending
            </button>
          ) : null}
          {comment.status !== "spam" ? (
            <button type="button" style={buttonStyle} disabled={actioning} onClick={() => changeStatus("spam")}>
              Mark Spam
            </button>
          ) : null}
        </div>
      </section>

      {deleteConfirming ? (
        <div
          role="alertdialog"
          aria-label="Confirm delete"
          style={{ ...sectionStyle, borderColor: "#e0b0b0" }}
        >
          <p style={{ margin: 0 }}>Delete this comment? This can&apos;t be undone.</p>
          {deleteError ? (
            <p role="alert" style={{ color: "crimson", margin: 0, fontSize: "0.9rem" }}>
              {deleteError}
            </p>
          ) : null}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="button" style={buttonStyle} onClick={performDelete} disabled={deleteLoading}>
              {deleteLoading ? "Deleting…" : "Delete"}
            </button>
            <button
              type="button"
              style={buttonStyle}
              onClick={() => {
                setDeleteConfirming(false);
                setDeleteError("");
              }}
              disabled={deleteLoading}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div>
          <button type="button" style={buttonStyle} onClick={() => setDeleteConfirming(true)}>
            Delete Comment
          </button>
        </div>
      )}
    </div>
  );
}
