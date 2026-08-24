import { getPublicSettings, getPublicMenu, resolveMenuItemHref } from "@/lib/publicApi";
import { buildSocialLinks } from "@/lib/socialLinks";
import WidgetTitle from "./WidgetTitle";
import styles from "./Footer.module.css";

// Server Component — no interactivity needed. Fetches Settings + Menu
// (deduped with Header.js's identical fetches by Next.js's request
// memoization). Structurally this follows the reference mockups'
// `.footer-stats` two-column-plus-copyright-bar layout, but the mockup's
// two columns ("Blog Stats: 38,736 hits" / "Most Viewed Posts") are
// WordPress/Jetpack view-counter data with no equivalent anywhere in this
// CMS (Post has no view count at all — see prisma/schema.prisma) — showing
// them would mean hard-coding fake numbers. Real Settings/Menu data fills
// the same column layout instead: About, Quick Links, Get in Touch.
export default async function Footer() {
  const [{ settings, error: settingsError }, { menuItems }] = await Promise.all([
    getPublicSettings(),
    getPublicMenu(),
  ]);

  const siteTitle = settings?.siteTitle ?? "Explore N Bite";
  const socialLinks = buildSocialLinks(settings);
  const footerLinks = (menuItems ?? [])
    .map((item) => ({ id: item.id, label: item.label, href: resolveMenuItemHref(item) }))
    .filter((item) => Boolean(item.href));

  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.stats}>
        <div className={styles.col}>
          <WidgetTitle background="var(--enb-footer-bg)">About</WidgetTitle>
          <p className={styles.value}>{settings?.footerText || siteTitle}</p>
          {settingsError ? (
            <p role="alert" className={styles.notice}>
              Some site details are temporarily unavailable.
            </p>
          ) : null}
        </div>

        {footerLinks.length > 0 ? (
          <div className={styles.col}>
            <WidgetTitle background="var(--enb-footer-bg)">Quick Links</WidgetTitle>
            <nav className={styles.linkList} aria-label="Footer">
              {footerLinks.map((item) => (
                <a key={item.id} href={item.href} rel={/^https?:\/\//i.test(item.href) ? "noopener noreferrer" : undefined}>
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
        ) : null}

        {settings?.contactEmail || socialLinks.length > 0 ? (
          <div className={styles.col}>
            <WidgetTitle background="var(--enb-footer-bg)">Get in Touch</WidgetTitle>
            {settings?.contactEmail ? (
              <p className={styles.value}>
                <a href={`mailto:${settings.contactEmail}`}>{settings.contactEmail}</a>
              </p>
            ) : null}
            {socialLinks.length > 0 ? (
              <div className={styles.social}>
                {socialLinks.map((link) => (
                  <a key={link.name} href={link.href} target="_blank" rel="noopener noreferrer">
                    {link.name}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <p className={styles.copyright}>
        Copyright © {year}. Created by {siteTitle}.
      </p>
    </footer>
  );
}
