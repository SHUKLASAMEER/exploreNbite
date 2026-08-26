import Button from "./Button";
import WidgetTitle from "./WidgetTitle";
import styles from "./Sidebar.module.css";

// Live-site equivalents (Facebook likebox / Twitter timeline) embed a real
// third-party feed via the Facebook/Twitter widget scripts — reproducing
// that needs those SDKs (and, for Facebook's Page Plugin, generally an app
// setup) that this project doesn't have. Faking a static feed would violate
// "no invented content," so this renders the same real heading (Facebook's
// is itself a link on the live site, via `headingHref`) and a single
// honest link out to the real profile URL already on the Author record —
// no fabricated posts/tweets.
export default function SocialWidget({ heading, headingHref, label, href }) {
  if (!href) return null;

  return (
    <div className={styles.widget}>
      <WidgetTitle href={headingHref}>{heading}</WidgetTitle>
      <div className={styles.socialLink}>
        <Button href={href} variant="outline" target="_blank">
          {label}
        </Button>
      </div>
    </div>
  );
}
