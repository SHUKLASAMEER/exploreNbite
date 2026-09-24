"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import Button from "./Button";
import styles from "./Comments.module.css";

async function parseJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

// `website` is the honeypot — a hidden field a real user never fills; the
// backend rejects any submission that includes it (see utils/antiSpam.js).
const emptyForm = { readerName: "", email: "", message: "", website: "" };

// Posts to the existing public POST /api/posts/:postId/comments (built in
// an earlier phase — backend/src/services/comment.service.js#createPublic).
// The backend always force-sets status: "pending" regardless of what's
// sent here, so a submitted comment won't appear in CommentList until an
// admin approves it — the success message below says so explicitly rather
// than implying it posted live.
export default function CommentForm({ postId }) {
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [message, setMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const res = await apiFetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await parseJsonSafe(res);

      if (!res.ok) {
        setStatus("error");
        setMessage(data?.error?.message ?? "Could not post your comment. Please try again.");
        return;
      }

      setStatus("success");
      setMessage("Thanks! Your comment has been submitted and will appear once approved.");
      setForm(emptyForm);
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="comment-name" className="visually-hidden">
            Name
          </label>
          <input
            id="comment-name"
            type="text"
            required
            placeholder="Name"
            value={form.readerName}
            onChange={(e) => setForm((prev) => ({ ...prev, readerName: e.target.value }))}
            className={styles.input}
            disabled={status === "loading"}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="comment-email" className="visually-hidden">
            Email
          </label>
          <input
            id="comment-email"
            type="email"
            required
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            className={styles.input}
            disabled={status === "loading"}
          />
        </div>
      </div>
      <label htmlFor="comment-message" className="visually-hidden">
        Your comment
      </label>
      <textarea
        id="comment-message"
        required
        placeholder="Your comment"
        value={form.message}
        onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
        className={styles.textarea}
        disabled={status === "loading"}
      />
      <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}>
        <label htmlFor="comment-website">Leave this field empty</label>
        <input
          id="comment-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={form.website}
          onChange={(e) => setForm((prev) => ({ ...prev, website: e.target.value }))}
        />
      </div>
      <div>
        <Button variant="solid" type="submit" disabled={status === "loading"}>
          {status === "loading" ? "Posting…" : "Post Comment"}
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
