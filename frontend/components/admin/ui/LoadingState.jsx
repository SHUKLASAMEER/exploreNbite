import styles from "./States.module.css";

export default function LoadingState({ label = "Loading…" }) {
  return (
    <div className={styles.wrap} role="status" aria-live="polite">
      <div className={styles.spinner} aria-hidden="true" />
      <p className={styles.title}>{label}</p>
    </div>
  );
}
