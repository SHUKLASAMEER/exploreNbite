"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import Button from "./Button";
import WidgetTitle from "./WidgetTitle";
import styles from "./Sidebar.module.css";

async function parseJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

// "Subscribe to Blog via Email" — the live site's Jetpack subscription
// widget, reimplemented against our own existing public POST /api/subscribers
// endpoint (backend/src/routes/publicSubscriber.routes.js, built in an
// earlier phase — nothing new added here).
export default function SubscribeWidget() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [message, setMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const res = await apiFetch("/api/subscribers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await parseJsonSafe(res);

      if (!res.ok) {
        setStatus("error");
        setMessage(data?.error?.message ?? "Could not subscribe. Please try again.");
        return;
      }

      setStatus("success");
      setMessage("You're subscribed! Check your inbox to confirm.");
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  }

  return (
    <div className={styles.widget}>
      <WidgetTitle>Subscribe to Blog via Email</WidgetTitle>
      <p className={styles.subscribeText}>Get new posts delivered straight to your inbox.</p>
      <form onSubmit={handleSubmit} className={styles.subscribeForm}>
        <input
          type="email"
          required
          placeholder="Your email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={styles.subscribeInput}
          disabled={status === "loading"}
        />
        <Button variant="solid" type="submit" disabled={status === "loading"}>
          {status === "loading" ? "Subscribing…" : "Subscribe"}
        </Button>
        {message ? (
          <p
            role={status === "error" ? "alert" : "status"}
            className={`${styles.subscribeMessage} ${status === "error" ? styles.subscribeError : styles.subscribeSuccess}`}
          >
            {message}
          </p>
        ) : null}
      </form>
    </div>
  );
}
