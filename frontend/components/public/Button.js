import Link from "next/link";
import styles from "./Button.module.css";

// Shared button — `variant`: "outline" (post-card read-more, ghost) or
// "solid" (form submits, pagination). Renders a next/link Link when `href`
// is given (internal navigation), a plain `<a>` when `href` looks absolute
// (external), or a `<button>` otherwise (form submit / onClick).
function isAbsoluteUrl(href) {
  return /^https?:\/\//i.test(href);
}

export default function Button({ href, variant = "outline", className = "", children, ...props }) {
  const classes = `${variant === "solid" ? styles.solid : styles.outline} ${className}`.trim();

  if (href) {
    if (isAbsoluteUrl(href)) {
      return (
        <a href={href} className={classes} rel="noopener noreferrer" {...props}>
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className={classes} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className={classes} {...props}>
      {children}
    </button>
  );
}
