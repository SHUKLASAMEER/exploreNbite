"use client";

import { useEffect, useState } from "react";
import { History, Eye, RotateCcw } from "lucide-react";
import { apiFetch } from "@/lib/api";
import Button from "@/components/admin/ui/Button";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import styles from "./RevisionHistory.module.css";

async function parseJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function formatDateTime(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const TYPE_LABEL = { autosave: "Autosave", manual: "Manual save" };

// Compact revision history panel for the Post editor. Lists metadata only
// (id/type/title/createdAt) — full revision content is fetched only when
// the admin explicitly opens Preview or Restore (Section 14: don't fetch
// content just to render a timestamp list).
//
// `onRestore(snapshot)` is called with the FULL revision row after an
// explicit, confirmed restore; the caller (PostForm) is the only thing that
// ever touches the actual form state — this component never mutates the
// editor directly and never calls the real save endpoint.
export default function RevisionHistory({ postId, refreshToken, onRestore, onPreview }) {
  const [revisions, setRevisions] = useState(null); // null = loading
  const [listError, setListError] = useState("");

  const [restoreTarget, setRestoreTarget] = useState(null); // revision metadata row
  const [restoreError, setRestoreError] = useState("");
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [previewLoadingId, setPreviewLoadingId] = useState(null);

  useEffect(() => {
    if (!postId) return;
    let cancelled = false;

    async function load() {
      setListError("");
      try {
        const res = await apiFetch(`/api/admin/posts/${postId}/revisions`);
        const data = await parseJsonSafe(res);
        if (!res.ok) {
          if (!cancelled) {
            setListError(data?.error?.message ?? "Failed to load revision history.");
            setRevisions([]);
          }
          return;
        }
        if (!cancelled) setRevisions(data.revisions ?? []);
      } catch {
        if (!cancelled) {
          setListError("Failed to load revision history.");
          setRevisions([]);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [postId, refreshToken]);

  async function fetchFullRevision(revisionId) {
    const res = await apiFetch(`/api/admin/posts/${postId}/revisions/${revisionId}`);
    const data = await parseJsonSafe(res);
    if (!res.ok) {
      throw new Error(data?.error?.message ?? "Could not load this revision.");
    }
    return data.revision;
  }

  async function handlePreview(row) {
    setPreviewLoadingId(row.id);
    try {
      const revision = await fetchFullRevision(row.id);
      onPreview(revision);
    } catch (err) {
      setListError(err.message || "Could not load this revision.");
    } finally {
      setPreviewLoadingId(null);
    }
  }

  function confirmRestore(row) {
    setRestoreTarget(row);
    setRestoreError("");
  }
  function cancelRestore() {
    setRestoreTarget(null);
    setRestoreError("");
  }

  async function performRestore() {
    if (!restoreTarget) return;
    setRestoreLoading(true);
    setRestoreError("");
    try {
      // The dedicated restore endpoint validates the revision belongs to
      // this post and returns the full snapshot — it never writes to the
      // post itself (see backend post.service.js#restoreRevision).
      const res = await apiFetch(`/api/admin/posts/${postId}/revisions/${restoreTarget.id}/restore`, {
        method: "POST",
      });
      const data = await parseJsonSafe(res);
      if (!res.ok) {
        setRestoreError(data?.error?.message ?? "Could not restore this revision.");
        setRestoreLoading(false);
        return;
      }
      onRestore(data.revision);
      setRestoreTarget(null);
      setRestoreLoading(false);
    } catch {
      setRestoreError("Something went wrong. Please try again.");
      setRestoreLoading(false);
    }
  }

  if (!postId) return null;

  return (
    <section className={styles.wrap}>
      <h2 className={styles.title}>
        <History size={16} strokeWidth={2} aria-hidden="true" />
        Revision History
      </h2>
      <p className={styles.hint}>
        Autosaves and manual saves for this post. Restoring loads a revision back into this editor as a
        draft — it does not publish or change the live post until you click Save.
      </p>

      {listError ? (
        <p className={styles.error} role="alert">
          {listError}
        </p>
      ) : null}

      {revisions === null ? (
        <p className={styles.muted}>Loading revisions…</p>
      ) : revisions.length === 0 ? (
        <p className={styles.muted}>No revisions yet.</p>
      ) : (
        <ul className={styles.list}>
          {revisions.map((row) => (
            <li key={row.id} className={styles.row}>
              <span className={`${styles.badge} ${row.type === "manual" ? styles.manual : styles.autosave}`}>
                {TYPE_LABEL[row.type] ?? row.type}
              </span>
              <span className={styles.when}>{formatDateTime(row.createdAt)}</span>
              <span className={styles.rowTitle}>{row.title || <em>(untitled)</em>}</span>
              <div className={styles.rowActions}>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Eye}
                  onClick={() => handlePreview(row)}
                  disabled={previewLoadingId === row.id}
                >
                  {previewLoadingId === row.id ? "Loading…" : "Preview"}
                </Button>
                <Button variant="ghost" size="sm" icon={RotateCcw} onClick={() => confirmRestore(row)}>
                  Restore
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(restoreTarget)}
        title="Restore this revision?"
        description={
          restoreTarget
            ? `This will load the ${TYPE_LABEL[restoreTarget.type]?.toLowerCase() ?? restoreTarget.type} from ${formatDateTime(
                restoreTarget.createdAt
              )} back into the editor as a draft. It replaces your current unsaved edits in this form — the live post is not changed until you click Save.`
            : ""
        }
        confirmLabel="Restore into editor"
        loading={restoreLoading}
        error={restoreError}
        onConfirm={performRestore}
        onCancel={cancelRestore}
      />
    </section>
  );
}
