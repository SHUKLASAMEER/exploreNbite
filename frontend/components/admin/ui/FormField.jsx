import styles from "./FormField.module.css";

// as: "input" | "textarea" | "select" | custom component
// Pass children instead of `as`/props when the control needs full control
// (e.g. a rich text editor or a custom multi-select).
export default function FormField({
  label,
  htmlFor,
  hint,
  error,
  required,
  as: Component = "input",
  children,
  ...rest
}) {
  return (
    <div className={styles.field}>
      {label ? (
        <label htmlFor={htmlFor} className={styles.label}>
          {label}
          {required ? <span className={styles.required}> *</span> : null}
        </label>
      ) : null}
      {children ?? <Component id={htmlFor} className={styles.control} {...rest} />}
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className={styles.hint}>{hint}</p>
      ) : null}
    </div>
  );
}
