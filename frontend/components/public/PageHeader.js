import styles from "./PageHeader.module.css";

export default function PageHeader({ title, description }) {
  return (
    <header className={styles.wrap}>
      <h1 className={styles.title}>{title}</h1>
      {description ? <p className={styles.description}>{description}</p> : null}
    </header>
  );
}
