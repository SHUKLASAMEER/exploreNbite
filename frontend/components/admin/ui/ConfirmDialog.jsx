"use client";

import { useEffect, useRef } from "react";
import Button from "./Button";
import styles from "./ConfirmDialog.module.css";

// Only for destructive/irreversible actions (delete, unpublish-with-data-loss,
// etc.) — per the project's UX rules, harmless actions should never be
// wrapped in a confirmation dialog.
export default function ConfirmDialog({
  open,
  title = "Are you sure?",
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  loading = false,
  error,
  onConfirm,
  onCancel,
}) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleKey(e) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleKey);
    dialogRef.current?.focus();
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className={styles.overlay} onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div
        className={styles.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        tabIndex={-1}
        ref={dialogRef}
      >
        <h2 id="confirm-dialog-title" className={styles.title}>
          {title}
        </h2>
        {description ? <p className={styles.description}>{description}</p> : null}
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={loading}>
            {loading ? "Working…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
