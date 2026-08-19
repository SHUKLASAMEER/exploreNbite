"use client";

import { useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import styles from "./Header.module.css";

// Client half of the public Header: the async data fetch lives in the
// server-only Header.js, which passes down plain, already-resolved props.
// This half owns only the one bit of state that genuinely needs a browser —
// whether the mobile nav panel is open.
function isAbsoluteUrl(href) {
  return /^https?:\/\//i.test(href);
}

function NavLink({ item, className, onClick }) {
  if (isAbsoluteUrl(item.href)) {
    // custom_url menu items are always fully-qualified URLs (validated in
    // backend/src/utils/validation/menuItems.js) — could be this same site
    // or an external one, so a plain <a> (not next/link) is used.
    return (
      <a href={item.href} className={className} onClick={onClick} rel="noopener noreferrer">
        {item.label}
      </a>
    );
  }
  return (
    <Link href={item.href} className={className} onClick={onClick}>
      {item.label}
    </Link>
  );
}

export default function HeaderClient({ siteTitle, navItems, navError }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const hasNavItems = navItems.length > 0;

  return (
    <header className={styles.header}>
      <div className={styles.bar}>
        <Link href="/" className={styles.logoLink} aria-label={siteTitle}>
          <Logo priority />
          <span className={styles.siteTitle}>{siteTitle}</span>
        </Link>

        <nav className={styles.desktopNav} aria-label="Primary">
          {navError ? (
            <span role="alert" className={styles.navNotice}>
              Navigation is temporarily unavailable.
            </span>
          ) : (
            navItems.map((item) => <NavLink key={item.id} item={item} className={styles.navLink} />)
          )}
        </nav>

        {navError || hasNavItems ? (
          <button
            type="button"
            className={styles.menuToggle}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-nav"
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            onClick={() => setIsMobileMenuOpen((open) => !open)}
          >
            <span className={styles.menuIcon} data-open={isMobileMenuOpen ? "true" : "false"} />
          </button>
        ) : null}
      </div>

      {isMobileMenuOpen ? (
        <nav id="mobile-nav" className={styles.mobileNav} aria-label="Primary mobile">
          {navError ? (
            <span role="alert" className={styles.navNotice}>
              Navigation is temporarily unavailable.
            </span>
          ) : (
            navItems.map((item) => (
              <NavLink key={item.id} item={item} onClick={() => setIsMobileMenuOpen(false)} />
            ))
          )}
        </nav>
      ) : null}
    </header>
  );
}
