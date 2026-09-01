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
// endpoint (backend/src/routes/publicSubscriber.routes.js). Copy text and
// placeholder below are verbatim from the live widget's own markup; `count`
// (GET /api/subscribers/count) is this project's own real active-subscriber
// count, not live's — showing our own real number is the honest match for
// "Join N other subscribers," not copying live's unrelated figure.
export default function SubscribeWidget({ count }) {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot — real users never fill this
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
        body: JSON.stringify({ email, website }),
      });
      const data = await parseJsonSafe(res);

      if (!res.ok) {
        setStatus("error");
        setMessage(data?.error?.message ?? "Could not subscribe. Please try again.");
        return;
      }

      setStatus("success");
      // Honest copy: the address is recorded. There is no confirmation
      // email and no automated new-post email yet (no mail transport
      // configured — see the audit), so this no longer claims "check your
      // inbox" or promises delivery.
      setMessage("Thanks — you're on the list.");
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  }

  return (
    <div className={styles.widget}>
      <WidgetTitle>Subscribe to Blog via Email</WidgetTitle>
      <p className={styles.subscribeText}>
        Enter your email address to subscribe to this blog and receive notifications of new posts by email.
      </p>
      <form onSubmit={handleSubmit} className={styles.subscribeForm}>
        <input
          type="email"
          required
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={styles.subscribeInput}
          disabled={status === "loading"}
        />
        <span aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}>
          <label htmlFor="subscribe-website">Leave this field empty</label>
          <input
            id="subscribe-website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </span>
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
      {typeof count === "number" && count > 0 ? (
        <p className={styles.subscribeCount}>Join {count} other subscriber{count === 1 ? "" : "s"}</p>
      ) : null}
    </div>
  );
}
