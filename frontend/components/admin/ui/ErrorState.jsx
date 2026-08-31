import styles from "./States.module.css";

export default function ErrorState({ title = "Something went wrong", description, action }) {
  return (
    <div className={`${styles.wrap} ${styles.errorWrap}`} role="alert">
      <p className={styles.title}>{title}</p>
      {description ? <p className={styles.description}>{description}</p> : null}
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
