"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/Logo";
import SocialIcon from "./SocialIcon";
import styles from "./Header.module.css";

// Client half of the public Header: the async data fetch lives in the
// server-only Header.js, which passes down plain, already-resolved props.
// This half owns the browser-only bits — the current pathname (active-link
// highlight), the one-at-a-time open state for the "Travel" / "More About
// Me" parent dropdowns, and the mobile menu toggle.
//
// Structure: a single white header row — logo, then the primary nav, then
// the settings-driven social icons, all on one line at desktop widths (the
// `.collapse` wrapper is `display: contents` there, so nav + social are
// direct flex children of the row). Immediately below it, the full-bleed
// photo hero (site title + tagline). Below the desktop breakpoint the row
// collapses to a hamburger: `.collapse` becomes a dropdown panel holding
// the nav (parent groups expand/collapse inline) and the social icons.
//
// `navTree` is the flat menu grouped by lib/navGroups.js — each entry is
// either { type: "link", ... } or { type: "group", label, children }.
function isAbsoluteUrl(href) {
  return /^https?:\/\//i.test(href);
}

// A menu item is "active" when the current path is that exact route, or
// nested under it — never for "/" itself unless it's an exact match, so the
// home link doesn't light up on every page.
function isActivePath(pathname, href) {
  if (!href) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ item, isActive, className }) {
  const classes = `${className} ${isActive ? styles.navLinkActive : ""}`.trim();

  if (isAbsoluteUrl(item.href)) {
    // custom_url menu items can be fully-qualified URLs (validated in
    // backend/src/utils/validation/menuItems.js) — could be this same site
    // or an external one, so a plain <a> (not next/link) is used.
    return (
      <a href={item.href} className={className} rel="noopener noreferrer">
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

// A parent nav item: a dropdown-only trigger (never a link — there is no
// parent route) plus its list of child links. Open state is controlled by
// the parent HeaderClient so only one group is open at a time; hover opens
// it on pointer devices, click/tap toggles it everywhere.
function NavGroup({ node, pathname, isOpen, onToggle, onHoverOpen, onHoverClose }) {
  const hasActiveChild = node.children.some((child) => isActivePath(pathname, child.href));
  const buttonClasses = `${styles.navLink} ${styles.navGroupButton} ${
    hasActiveChild ? styles.navLinkActive : ""
  }`.trim();
  const panelId = `nav-group-${node.label.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <div className={styles.navGroup} onMouseEnter={onHoverOpen} onMouseLeave={onHoverClose}>
      <button
        type="button"
        className={buttonClasses}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-controls={panelId}
        onClick={onToggle}
      >
        {node.label}
        <span aria-hidden="true" className={styles.navGroupCaret} />
      </button>
      <ul id={panelId} className={styles.navDropdown} hidden={!isOpen}>
        {node.children.map((child) => (
          <li key={child.id}>
            <NavLink
              item={child}
              isActive={isActivePath(pathname, child.href)}
              className={styles.navDropdownLink}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function HeaderClient({ siteTitle, tagline, heroImageUrl, navTree, navError, socialLinks }) {
  const pathname = usePathname();
  const [openGroup, setOpenGroup] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const canHover = useRef(false);
  const rowRef = useRef(null);

  // Any navigation closes the dropdown + the mobile menu — handled during
  // render (React's documented "adjust state when a prop changes" pattern)
  // rather than in an effect, so there's no extra render pass.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (lastPathname !== pathname) {
    setLastPathname(pathname);
    if (openGroup !== null) setOpenGroup(null);
    if (menuOpen) setMenuOpen(false);
  }

  useEffect(() => {
    if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
      canHover.current = window.matchMedia("(hover: hover)").matches;
    }
  }, []);

  // Outside click / Escape closes the open dropdown.
  useEffect(() => {
    if (!openGroup) return undefined;
    function onPointerDown(event) {
      if (rowRef.current && !rowRef.current.contains(event.target)) {
        setOpenGroup(null);
      }
    }
    function onKeyDown(event) {
      if (event.key === "Escape") setOpenGroup(null);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openGroup]);

  const socialStrip =
    socialLinks && socialLinks.length > 0 ? (
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
            <SocialIcon name={link.name} />
          </a>
        ))}
      </div>
    ) : null;

  return (
    <header className={styles.header}>
      <div className={styles.headerRow} ref={rowRef}>
        <Link href="/" className={styles.logoLink} aria-label={siteTitle}>
          <Logo priority style={{ height: "var(--header-logo-height)", width: "auto" }} />
        </Link>

        <button
          type="button"
          className={styles.menuToggle}
          aria-expanded={menuOpen}
          aria-controls="primary-nav"
          aria-label="Menu"
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          <span aria-hidden="true" className={styles.menuToggleBars} />
        </button>

        <div className={`${styles.collapse} ${menuOpen ? styles.collapseOpen : ""}`.trim()}>
          <nav id="primary-nav" className={styles.nav} aria-label="Primary">
            {navError ? (
              <span role="alert" className={styles.navNotice}>
                Navigation is temporarily unavailable.
              </span>
            ) : (
              navTree.map((node) =>
                node.type === "group" ? (
                  <NavGroup
                    key={`group-${node.label}`}
                    node={node}
                    pathname={pathname}
                    isOpen={openGroup === node.label}
                    onToggle={() => setOpenGroup((prev) => (prev === node.label ? null : node.label))}
                    onHoverOpen={() => {
                      if (canHover.current) setOpenGroup(node.label);
                    }}
                    onHoverClose={() => {
                      if (canHover.current) setOpenGroup((prev) => (prev === node.label ? null : prev));
                    }}
                  />
                ) : (
                  <NavLink
                    key={node.id}
                    item={node}
                    isActive={isActivePath(pathname, node.href)}
                    className={styles.navLink}
                  />
                )
              )
            )}
          </nav>

          {socialStrip}
        </div>
      </div>

      <div className={styles.hero} style={heroImageUrl ? { backgroundImage: `url(${heroImageUrl})` } : undefined}>
        <Link href="/" className={styles.siteTitle}>
          {siteTitle}
        </Link>
        <div className={styles.tagline}>{tagline}</div>
      </div>
    </header>
  );
}
