"use client";

import { Search } from "lucide-react";
import styles from "./SearchInput.module.css";

export default function SearchInput({ value, onChange, placeholder = "Search…", ...rest }) {
  return (
    <div className={styles.wrap}>
      <Search size={16} strokeWidth={2} className={styles.icon} aria-hidden="true" />
      <input
        type="search"
        className={styles.input}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        {...rest}
      />
    </div>
  );
}
