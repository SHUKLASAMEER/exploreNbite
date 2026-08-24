"use client";

import { useState } from "react";
import Button from "./Button";
import styles from "./ContactForm.module.css";

const emptyForm = { name: "", email: "", subject: "", message: "" };

// Contact page form (reference/exploreNbite UI/contact.html: Name / Email /
// Subject / Message / Send). There's no POST /api/contact endpoint on the
// backend — Settings only exposes a contactEmail, and adding a new
// submission endpoint + admin inbox for one static page is out of scope
// here (see the mapping note in app/(site)/pages/[slug]/page.js). Instead
// "Send" opens the visitor's own email client via a mailto: link
// pre-filled with the subject/body, addressed to the real
// Settings.contactEmail — a working submission path with no backend
// change, matching the mockup's exact field layout.
export default function ContactForm({ recipientEmail }) {
  const [form, setForm] = useState(emptyForm);

  function handleChange(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!recipientEmail) return;

    const subject = form.subject.trim() || `Message from ${form.name}`;
    const body = `${form.message}\n\n— ${form.name} (${form.email})`;
    window.location.href = `mailto:${recipientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <label htmlFor="contact-name">Your Name (required)</label>
      <input
        id="contact-name"
        type="text"
        required
        value={form.name}
        onChange={handleChange("name")}
        className={styles.input}
      />

      <label htmlFor="contact-email">Your Email (required)</label>
      <input
        id="contact-email"
        type="email"
        required
        value={form.email}
        onChange={handleChange("email")}
        className={styles.input}
      />

      <label htmlFor="contact-subject">Subject</label>
      <input
        id="contact-subject"
        type="text"
        value={form.subject}
        onChange={handleChange("subject")}
        className={styles.input}
      />

      <label htmlFor="contact-message">Your Message</label>
      <textarea
        id="contact-message"
        required
        value={form.message}
        onChange={handleChange("message")}
        className={styles.textarea}
      />

      <div className={styles.submitWrap}>
        <Button variant="solid" type="submit" disabled={!recipientEmail}>
          Send
        </Button>
      </div>

      {!recipientEmail ? (
        <p className={styles.formMessage} role="alert">
          The contact form is temporarily unavailable.
        </p>
      ) : null}
    </form>
  );
}
