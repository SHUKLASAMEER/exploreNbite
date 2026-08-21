import styles from "./TwoColumnLayout.module.css";

// Shared "content container + main column + right sidebar" shell — used by
// Home, single post, and category pages so the flex/width/breakpoint rules
// live in exactly one place instead of being repeated per page.
export default function TwoColumnLayout({ sidebar, children }) {
  return (
    <div className={styles.container}>
      <div className={styles.columns}>
        <div className={styles.main}>{children}</div>
        {sidebar ? <aside className={styles.sidebar}>{sidebar}</aside> : null}
      </div>
    </div>
  );
}
