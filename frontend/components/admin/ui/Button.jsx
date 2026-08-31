"use client";

import Link from "next/link";
import styles from "./Button.module.css";

// variant: "primary" | "secondary" | "danger" | "ghost"
export default function Button({
  variant = "secondary",
  size = "md",
  icon: Icon,
  href,
  className = "",
  children,
  ...rest
}) {
  const classes = [styles.button, styles[variant], styles[size], className].filter(Boolean).join(" ");

  const content = (
    <>
      {Icon ? <Icon size={16} strokeWidth={2} aria-hidden="true" /> : null}
      {children}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={classes} {...rest}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={classes} {...rest}>
      {content}
    </button>
  );
}
