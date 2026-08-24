"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Header.module.css";

// Client half of the public Header: the async data fetch lives in the
// server-only Header.js, which passes down plain, already-resolved props.
// This half owns the one bit of state that genuinely needs a browser — the
// current pathname, used to highlight the active nav item (Header/Footer
// stay Server Components, so this is the one place pathname-based UI can
// live).
//
// Structure follows the reference mockups (reference/exploreNbite UI/
// index.html): a full-bleed gradient hero carrying the site title + tagline
// + social icons, and a separate nav bar underneath — not the previous
// compact three-tier header. The nav has no JS-driven mobile toggle: like
// the mockup, it's a plain flex-wrap row that reflows to more lines on
// narrow viewports, so it needs no client state of its own beyond the
// active-link check.
function isAbsoluteUrl(href) {
  return /^https?:\/\//i.test(href);
}

// A menu item is "active" when the current path is that exact route, or
// nested under it — never for "/" itself unless it's an exact match, so the
// home link doesn't light up on every page.
function isActivePath(pathname, href) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ item, isActive }) {
  const classes = `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`.trim();

  if (isAbsoluteUrl(item.href)) {
    // custom_url menu items are always fully-qualified URLs (validated in
    // backend/src/utils/validation/menuItems.js) — could be this same site
    // or an external one, so a plain <a> (not next/link) is used.
    return (
      <a href={item.href} className={styles.navLink} rel="noopener noreferrer">
        {item.label}
      </a>
    );
  }
  return (
    <Link href={item.href} className={classes} aria-current={isActive ? "page" : undefined}>
      {item.label}
    </Link>
  );
}

export default function HeaderClient({ siteTitle, tagline, navItems, navError, socialLinks }) {
  const pathname = usePathname();

  return (
    <header className={styles.header}>
      <div className={styles.hero}>
        {socialLinks && socialLinks.length > 0 ? (
          <div className={styles.social}>
            {socialLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={link.name}
                className={styles.socialLink}
              >
                {link.label}
              </a>
            ))}
          </div>
        ) : null}

        <Link href="/" className={styles.siteTitle}>
          {siteTitle}
        </Link>
        <div className={styles.tagline}>{tagline}</div>
      </div>

      <div className={styles.navBar}>
        <nav className={styles.navRow} aria-label="Primary">
          {navError ? (
            <span role="alert" className={styles.navNotice}>
              Navigation is temporarily unavailable.
            </span>
          ) : (
            navItems.map((item) => (
              <NavLink key={item.id} item={item} isActive={isActivePath(pathname, item.href)} />
            ))
          )}
        </nav>
      </div>
    </header>
  );
}
