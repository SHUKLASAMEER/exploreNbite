"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { ToastProvider } from "./Toast";
import "./tokens.css";
import styles from "./AdminShell.module.css";

export default function AdminShell({ admin, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ToastProvider>
      <div className={`${styles.shell} adminRoot`}>
        {sidebarOpen ? (
          <button
            type="button"
            className={styles.scrim}
            aria-label="Close navigation"
            onClick={() => setSidebarOpen(false)}
          />
        ) : null}
        <Sidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
        <div className={styles.main}>
          <Topbar admin={admin} sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen((v) => !v)} />
          <main className={styles.content}>{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
