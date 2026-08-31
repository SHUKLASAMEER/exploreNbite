"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./Pagination.module.css";

export default function Pagination({ page, totalPages, total, onPageChange }) {
  if (!totalPages || totalPages <= 1) return null;

  return (
    <div className={styles.wrap}>
      <span className={styles.summary}>
        Page {page} of {totalPages}
        {typeof total === "number" ? ` · ${total} total` : ""}
      </span>
      <div className={styles.controls}>
        <button
          type="button"
          className={styles.button}
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} strokeWidth={2} />
        </button>
        <button
          type="button"
          className={styles.button}
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          <ChevronRight size={16} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
