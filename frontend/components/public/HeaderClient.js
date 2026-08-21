"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/Logo";
import styles from "./Header.module.css";

// Client half of the public Header: the async data fetch lives in the
// server-only Header.js, which passes down plain, already-resolved props.
// This half owns the two bits of state that genuinely need a browser —
// whether the mobile nav panel is open, and (Phase 3 Part 4) the current
// pathname, used only to highlight the active nav item; Header/Footer stay
// Server Components, so this is the one place pathname-based UI can live.
//
// Structure (Phase 3 Part 3 revision) follows the live site's actual
// three-tier header (wp-content/themes/ashe/style.css, "3.0 Top Bar" / "4.0
// Page Header" / "6.0 Main Navigation"): a slim social-icon strip, a
// centered logo/site-title row, and a separate centered nav bar with its
// own box-shadow — not a single flex row like a typical SaaS header.
function isAbsoluteUrl(href) {
  return /^https?:\/\//i.test(href);
}

// A menu item is "active" when the current path is that exact route, or
// nested under it (e.g. /category/must-visit/ nested paths, if any are
// added later) — never for "/" itself unless it's an exact match, so the
// home link doesn't light up on every page.
function isActivePath(pathname, href) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ item, className = "", activeClassName = "", isActive, onClick }) {
  const classes = [className, isActive ? activeClassName : ""].filter(Boolean).join(" ");

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
    <Link href={item.href} className={classes} onClick={onClick} aria-current={isActive ? "page" : undefined}>
      {item.label}
    </Link>
  );
}

export default function HeaderClient({ siteTitle, navItems, navError, socialLinks }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const hasNavItems = navItems.length > 0;

  return (
    <header className={styles.header}>
      {socialLinks && socialLinks.length > 0 ? (
        <div className={styles.topBar}>
          <div className={styles.topBarInner}>
            {socialLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={link.name}
                className={styles.topBarLink}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      ) : null}

      <div className={styles.brandRow}>
        <Link href="/" className={styles.logoLink} aria-label={siteTitle}>
          <Logo priority />
          <span className={styles.siteTitle}>{siteTitle}</span>
        </Link>
      </div>

      <div className={styles.navBar}>
        <div className={styles.navBarInner}>
          <nav className={styles.desktopNav} aria-label="Primary">
            {navError ? (
              <span role="alert" className={styles.navNotice}>
                Navigation is temporarily unavailable.
              </span>
            ) : (
              navItems.map((item) => (
                <NavLink
                  key={item.id}
                  item={item}
                  className={styles.navLink}
                  activeClassName={styles.navLinkActive}
                  isActive={isActivePath(pathname, item.href)}
                />
              ))
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
                <NavLink
                  key={item.id}
                  item={item}
                  activeClassName={styles.navLinkActive}
                  isActive={isActivePath(pathname, item.href)}
                  onClick={() => setIsMobileMenuOpen(false)}
                />
              ))
            )}
          </nav>
        ) : null}
      </div>
    </header>
  );
}
