import styles from "./States.module.css";

export default function EmptyState({ icon: Icon, title = "Nothing here yet", description, action }) {
  return (
    <div className={styles.wrap}>
      {Icon ? <Icon size={28} strokeWidth={1.5} aria-hidden="true" className={styles.icon} /> : null}
      <p className={styles.title}>{title}</p>
      {description ? <p className={styles.description}>{description}</p> : null}
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
