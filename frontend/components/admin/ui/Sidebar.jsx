"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/Logo";
import { NAV_GROUPS, isNavItemActive } from "./navConfig";
import styles from "./Sidebar.module.css";

export default function Sidebar({ open, onNavigate }) {
  const pathname = usePathname();

  return (
    <nav className={`${styles.sidebar} ${open ? styles.open : ""}`} aria-label="Admin navigation">
      <div className={styles.brand}>
        <Logo style={{ height: "32px", width: "auto" }} />
        <span className={styles.brandLabel}>Admin</span>
      </div>

      <div className={styles.groups}>
        {NAV_GROUPS.map((group, index) => (
          <div key={group.label ?? `group-${index}`} className={styles.group}>
            {group.label ? <div className={styles.groupLabel}>{group.label}</div> : null}
            <ul className={styles.list}>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isNavItemActive(pathname, item);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`${styles.link} ${active ? styles.active : ""}`}
                      aria-current={active ? "page" : undefined}
                      onClick={onNavigate}
                    >
                      <Icon size={17} strokeWidth={2} aria-hidden="true" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
