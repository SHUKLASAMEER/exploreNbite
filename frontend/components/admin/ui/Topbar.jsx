"use client";

import { Menu as MenuIcon, X } from "lucide-react";
import LogoutButton from "@/components/admin/LogoutButton";
import styles from "./Topbar.module.css";

export default function Topbar({ admin, sidebarOpen, onToggleSidebar }) {
  const initial = (admin?.name || admin?.email || "?").trim().charAt(0).toUpperCase();

  return (
    <header className={styles.topbar}>
      <button
        type="button"
        className={styles.menuToggle}
        onClick={onToggleSidebar}
        aria-label={sidebarOpen ? "Close navigation" : "Open navigation"}
        aria-expanded={sidebarOpen}
      >
        {sidebarOpen ? <X size={20} strokeWidth={2} /> : <MenuIcon size={20} strokeWidth={2} />}
      </button>

      <div className={styles.spacer} />

      <div className={styles.account}>
        <div className={styles.accountText}>
          <span className={styles.accountName}>{admin?.name || "Admin"}</span>
          <span className={styles.accountEmail}>{admin?.email}</span>
        </div>
        <div className={styles.avatar} aria-hidden="true">
          {initial}
        </div>
        <LogoutButton className={styles.logout} />
      </div>
    </header>
  );
}
