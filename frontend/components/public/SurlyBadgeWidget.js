import sidebarStyles from "./Sidebar.module.css";
import styles from "./SurlyBadgeWidget.module.css";

// The live explorenbite.com sidebar's third badge: Sur.ly's "Brilliantly
// SAFE!" site-safety widget (`#surly-badge.surly__id_165891396`,
// `surly-badge_white-blue` variant), shown last in the badge stack on the
// front page and category archives. On the live site it's injected by
// cdn.sur.ly's script + stylesheet; there is no image file for it in the
// migrated media and no row for it in the awards table. This is a faithful
// static reproduction — the live widget's exact DOM, text and colours, and
// the real https://sur.ly/i/explorenbite.com/ verification link — with
// Sur.ly's stylesheet trimmed to the one colour variant in use and inlined
// (SurlyBadgeWidget.module.css), so the public site fetches nothing from
// cdn.sur.ly at runtime. Fixed brand/verification content tied to the
// explorenbite.com domain, so it's not admin-editable.
const SURLY_PROFILE_URL = "https://sur.ly/i/explorenbite.com/";

export default function SurlyBadgeWidget() {
  return (
    <div className={sidebarStyles.widget}>
      <div className={styles.badge}>
        <div className="surly-badge__header">
          <h3 className="surly-badge__header-title">Brilliantly</h3>
          <p className="surly-badge__header-text">SAFE!</p>
        </div>
        <div className="surly-badge__tag">
          <a
            className="surly-badge__tag-text"
            href={SURLY_PROFILE_URL}
            target="_blank"
            rel="noreferrer noopener"
          >
            explorenbite.com
          </a>
        </div>
        <div className="surly-badge__footer">
          <h3 className="surly-badge__footer-title">Content &amp; Links</h3>
          <p className="surly-badge__footer-text">
            Verified by{" "}
            <a
              className="surly-badge__footer-link"
              href="https://sur.ly"
              target="_blank"
              rel="noreferrer noopener"
            >
              Sur.ly
            </a>
          </p>
        </div>
        <div className="surly-badge__date">2022</div>
      </div>
    </div>
  );
}
