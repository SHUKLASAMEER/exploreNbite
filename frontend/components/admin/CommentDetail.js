"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, RotateCcw, Ban, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import PageHeader from "@/components/admin/ui/PageHeader";
import Button from "@/components/admin/ui/Button";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import LoadingState from "@/components/admin/ui/LoadingState";
import ErrorState from "@/components/admin/ui/ErrorState";
import { useToast } from "@/components/admin/ui/Toast";
import styles from "./CommentDetail.module.css";

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
  const showToast = useToast();

  const [comment, setComment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [actionError, setActionError] = useState("");
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
      showToast(`Marked as ${STATUS_LABELS[status].toLowerCase()}.`);
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
    return <LoadingState label="Loading comment…" />;
  }

  if (loadError) {
    return <ErrorState title="Couldn't load this comment" description={loadError} />;
  }

  return (
    <div className={styles.wrap}>
      <PageHeader
        title="Comment"
        actions={
          <Button variant="secondary" icon={ArrowLeft} onClick={() => router.push("/admin/comments")}>
            Back to Comments
          </Button>
        }
      />

      {actionError ? <ErrorState title={actionError} /> : null}

      <section className={styles.section}>
        <div className={styles.field}>
          <span className={styles.label}>Post</span>
          <span>{comment.post?.title ?? "—"}</span>
        </div>
        <div className={styles.field}>
          <span className={styles.label}>From</span>
          <span>
            {comment.readerName} ({comment.email})
          </span>
        </div>
        <div className={styles.field}>
          <span className={styles.label}>Submitted</span>
          <span>{formatDate(comment.createdAt)}</span>
        </div>
        <div className={styles.field}>
          <span className={styles.label}>Status</span>
          <span className={`${styles.badge} ${styles[comment.status] ?? ""}`}>
            {STATUS_LABELS[comment.status] ?? comment.status}
          </span>
        </div>
        <div className={styles.field}>
          <span className={styles.label}>Message</span>
          <p className={styles.message}>{comment.message}</p>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Moderation</h2>
        <div className={styles.moderationActions}>
          {comment.status !== "approved" ? (
            <Button variant="secondary" icon={Check} disabled={actioning} onClick={() => changeStatus("approved")}>
              Approve
            </Button>
          ) : null}
          {comment.status !== "pending" ? (
            <Button variant="secondary" icon={RotateCcw} disabled={actioning} onClick={() => changeStatus("pending")}>
              Mark Pending
            </Button>
          ) : null}
          {comment.status !== "spam" ? (
            <Button variant="secondary" icon={Ban} disabled={actioning} onClick={() => changeStatus("spam")}>
              Mark Spam
            </Button>
          ) : null}
        </div>
      </section>

      <div>
        <Button variant="danger" icon={Trash2} onClick={() => setDeleteConfirming(true)}>
          Delete Comment
        </Button>
      </div>

      <ConfirmDialog
        open={deleteConfirming}
        title="Delete this comment?"
        description="This can't be undone."
        loading={deleteLoading}
        error={deleteError}
        onConfirm={performDelete}
        onCancel={() => {
          setDeleteConfirming(false);
          setDeleteError("");
        }}
      />
    </div>
  );
}
