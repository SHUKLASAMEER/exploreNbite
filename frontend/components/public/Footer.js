import { getPublicSettings, getPublicMenu, resolveMenuItemHref } from "@/lib/publicApi";
import styles from "./Footer.module.css";

// Server Component — no interactivity needed, so unlike Header there's no
// client half. Fetches Settings + Menu (deduped with Header.js's identical
// fetches by Next.js's request memoization) and renders whatever fields are
// actually set; every Settings field is optional except siteTitle/
// contactEmail (see prisma/schema.prisma), so each block below is
// conditional rather than assuming the data exists.
export default async function Footer() {
  const [{ settings, error: settingsError }, { menuItems }] = await Promise.all([
    getPublicSettings(),
    getPublicMenu(),
  ]);

  const siteTitle = settings?.siteTitle ?? "Explore N Bite";
  const footerLinks = (menuItems ?? [])
    .map((item) => ({ id: item.id, label: item.label, href: resolveMenuItemHref(item) }))
    .filter((item) => Boolean(item.href));

  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <p className={styles.siteTitle}>{siteTitle}</p>
          {settings?.footerText ? <p className={styles.footerText}>{settings.footerText}</p> : null}
          {settingsError ? (
            <p role="alert" className={styles.notice}>
              Some site details are temporarily unavailable.
            </p>
          ) : null}
        </div>

        {footerLinks.length > 0 ? (
          <nav className={styles.links} aria-label="Footer">
            {footerLinks.map((item) => (
              <a key={item.id} href={item.href} rel={/^https?:\/\//i.test(item.href) ? "noopener noreferrer" : undefined}>
                {item.label}
              </a>
            ))}
          </nav>
        ) : null}

        <div className={styles.contact}>
          {settings?.contactEmail ? <a href={`mailto:${settings.contactEmail}`}>{settings.contactEmail}</a> : null}
          {settings?.socialFacebook || settings?.socialTwitter || settings?.socialInstagram ? (
            <div className={styles.social}>
              {settings?.socialFacebook ? (
                <a href={settings.socialFacebook} target="_blank" rel="noopener noreferrer">
                  Facebook
                </a>
              ) : null}
              {settings?.socialTwitter ? (
                <a href={settings.socialTwitter} target="_blank" rel="noopener noreferrer">
                  Twitter
                </a>
              ) : null}
              {settings?.socialInstagram ? (
                <a href={settings.socialInstagram} target="_blank" rel="noopener noreferrer">
                  Instagram
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <p className={styles.copyright}>
        © {year} {siteTitle}
      </p>
    </footer>
  );
}
