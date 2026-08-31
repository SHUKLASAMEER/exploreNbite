"use client";

import styles from "./FilterControls.module.css";

// filters: [{ key, label, value, onChange, options: [{ value, label }] }]
export default function FilterControls({ filters }) {
  return (
    <div className={styles.wrap}>
      {filters.map((filter) => (
        <label key={filter.key} className={styles.field}>
          <span className={styles.label}>{filter.label}</span>
          <select
            className={styles.select}
            value={filter.value}
            onChange={(e) => filter.onChange(e.target.value)}
          >
            {filter.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
}
