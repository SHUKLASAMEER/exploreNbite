"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import Button from "./Button";
import styles from "./ContactForm.module.css";

async function parseJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

const emptyForm = { name: "", email: "", subject: "", message: "", website: "" };

// Real enquiry form for the Contact and Work With Me pages. Submits to the
// public POST /api/contact endpoint (backend/src/services/contactMessage.service.js),
// which validates server-side, runs a honeypot + rate-limit check, and
// stores the enquiry. The recipient address is Settings.contactEmail on the
// server — it is never sent from or exposed in the client.
//
// `topic` is "contact" (default) or "work_with_me".
// `website` is the honeypot: a visually-hidden field a human never fills.
export default function ContactForm({ topic = "contact", submitLabel = "Send" }) {
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [message, setMessage] = useState("");

  function handleChange(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const res = await apiFetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          name: form.name,
          email: form.email,
          subject: form.subject,
          message: form.message,
          website: form.website, // honeypot
        }),
      });
      const data = await parseJsonSafe(res);

      if (!res.ok) {
        setStatus("error");
        setMessage(data?.error?.message ?? "Could not send your message. Please try again.");
        return;
      }

      setStatus("success");
      // Honest confirmation: the enquiry is stored. It only says "emailed"
      // if the server actually delivered mail (it currently cannot — no
      // mail transport is configured).
      setMessage(
        data?.emailed
          ? "Thanks! Your message has been sent."
          : "Thanks! Your message has been received — you'll hear back by email."
      );
      setForm(emptyForm);
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <label htmlFor={`${topic}-name`}>Your Name (required)</label>
      <input
        id={`${topic}-name`}
        type="text"
        required
        value={form.name}
        onChange={handleChange("name")}
        className={styles.input}
        disabled={status === "loading"}
      />

      <label htmlFor={`${topic}-email`}>Your Email (required)</label>
      <input
        id={`${topic}-email`}
        type="email"
        required
        value={form.email}
        onChange={handleChange("email")}
        className={styles.input}
        disabled={status === "loading"}
      />

      <label htmlFor={`${topic}-subject`}>Subject</label>
      <input
        id={`${topic}-subject`}
        type="text"
        value={form.subject}
        onChange={handleChange("subject")}
        className={styles.input}
        disabled={status === "loading"}
      />

      <label htmlFor={`${topic}-message`}>Your Message (required)</label>
      <textarea
        id={`${topic}-message`}
        required
        value={form.message}
        onChange={handleChange("message")}
        className={styles.textarea}
        disabled={status === "loading"}
      />

      {/* Honeypot — hidden from real users, off the a11y tree, tab-skipped. */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}>
        <label htmlFor={`${topic}-website`}>Leave this field empty</label>
        <input
          id={`${topic}-website`}
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={form.website}
          onChange={handleChange("website")}
        />
      </div>

      <div className={styles.submitWrap}>
        <Button variant="solid" type="submit" disabled={status === "loading"}>
          {status === "loading" ? "Sending…" : submitLabel}
        </Button>
      </div>

      {message ? (
        <p
          role={status === "error" ? "alert" : "status"}
          className={`${styles.formMessage} ${status === "error" ? styles.formError : styles.formSuccess}`}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
