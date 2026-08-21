import styles from "./WidgetTitle.module.css";

export default function WidgetTitle({ children, background = "var(--enb-bg)" }) {
  return (
    <div className={styles.wrap}>
      <h2 className={styles.text} style={{ background }}>
        {children}
      </h2>
    </div>
  );
}
