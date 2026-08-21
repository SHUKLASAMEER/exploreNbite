import styles from "./StateMessage.module.css";

// Shared empty/error placeholder used anywhere public CMS data is missing
// or failed to load — a post list with zero items, a failed fetch, a 404'd
// lookup that the caller chose not to hard-404. `kind` only changes the
// heading color; the message itself always comes from the caller so it can
// be specific ("No posts in this category yet." vs "No awards yet.").
export default function StateMessage({ kind = "empty", title, children }) {
  return (
    <div className={`${styles.wrap} ${kind === "error" ? styles.error : ""}`} role={kind === "error" ? "alert" : "status"}>
      <p className={styles.title}>{title}</p>
      {children ? <p className={styles.text}>{children}</p> : null}
    </div>
  );
}
