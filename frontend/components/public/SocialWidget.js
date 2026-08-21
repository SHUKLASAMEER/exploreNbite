import WidgetTitle from "./WidgetTitle";
import { buildSocialLinks } from "@/lib/socialLinks";
import styles from "./Sidebar.module.css";

// "Follow Us" sidebar links — built from Settings' social fields (same
// source Header's top bar and Footer use), not a Facebook/Twitter embed
// widget: those are third-party JS SDKs unrelated to any CMS model, out of
// scope here.
export default function SocialWidget({ settings }) {
  const links = buildSocialLinks(settings);

  if (links.length === 0) return null;

  return (
    <div className={styles.widget}>
      <WidgetTitle>Follow Us</WidgetTitle>
      <div className={styles.social}>
        {links.map((link) => (
          <a key={link.name} href={link.href} target="_blank" rel="noopener noreferrer" aria-label={link.name}>
            {link.label}
          </a>
        ))}
      </div>
    </div>
  );
}
