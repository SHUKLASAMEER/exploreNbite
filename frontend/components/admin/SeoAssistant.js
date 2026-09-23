"use client";

import { useState } from "react";
import { Sparkles, Check } from "lucide-react";
import { apiFetch } from "@/lib/api";
import Button from "@/components/admin/ui/Button";
import styles from "./SeoAssistant.module.css";

async function parseJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

// Compact "SEO Assistant" panel for the Post editor (AI SEO Suggestions
// task). Calls POST /api/admin/ai/seo-suggestions with the current DRAFT
// content and shows what comes back — it never writes anything itself.
// `onApplyTitle` / `onApplyDescription` are the ONLY way anything from here
// reaches the editor, and both only ever call the parent's setForm — the
// existing Save button remains the sole way to persist a change (Section 12).
export default function SeoAssistant({ postSnapshot, currentTitle, currentDescription, onApplyTitle, onApplyDescription }) {
  const [status, setStatus] = useState("idle"); // idle | loading | ready | error
  const [errorMessage, setErrorMessage] = useState("");
  const [suggestions, setSuggestions] = useState(null);
  const [appliedTitle, setAppliedTitle] = useState(false);
  const [appliedDescription, setAppliedDescription] = useState(false);

  const hasContent = Boolean(postSnapshot.title && postSnapshot.content);

  async function handleGenerate() {
    if (status === "loading") return; // guards rapid re-clicking on top of the button's own disabled state
    setStatus("loading");
    setErrorMessage("");
    setAppliedTitle(false);
    setAppliedDescription(false);
    try {
      const res = await apiFetch("/api/admin/ai/seo-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postSnapshot),
      });
      const data = await parseJsonSafe(res);
      if (!res.ok) {
        setStatus("error");
        setErrorMessage(data?.error?.message ?? "AI suggestions are unavailable right now.");
        return;
      }
      setSuggestions(data.suggestions);
      setStatus("ready");
    } catch {
      setStatus("error");
      setErrorMessage("Something went wrong requesting AI suggestions. Please try again.");
    }
  }

  function applyTitle() {
    onApplyTitle(suggestions.seoTitle);
    setAppliedTitle(true);
  }

  function applyDescription() {
    onApplyDescription(suggestions.metaDescription);
    setAppliedDescription(true);
  }

  return (
    <section className={styles.wrap}>
      <h2 className={styles.title}>
        <Sparkles size={16} strokeWidth={2} aria-hidden="true" />
        SEO Assistant
      </h2>
      <p className={styles.hint}>
        AI suggestions — review before applying. Nothing here is saved until you click Apply, and even then
        only the editor field changes; the post itself is untouched until you click Save.
      </p>

      <div>
        <Button
          variant="secondary"
          size="sm"
          icon={Sparkles}
          onClick={handleGenerate}
          disabled={status === "loading" || !hasContent}
        >
          {status === "loading" ? "Analyzing…" : "Generate SEO Suggestions"}
        </Button>
        {!hasContent ? <p className={styles.hint}>Add a title and some content first.</p> : null}
      </div>

      {status === "loading" ? <p className={styles.muted}>Analyzing…</p> : null}

      {status === "error" ? (
        <p className={styles.error} role="alert">
          {errorMessage}
        </p>
      ) : null}

      {status === "ready" && suggestions ? (
        <div className={styles.results}>
          <p className={styles.muted}>Suggestions ready.</p>

          <div className={styles.field}>
            <p className={styles.fieldLabel}>Suggested SEO Title</p>
            <p className={styles.currentValue}>Current: {currentTitle || <em>(empty)</em>}</p>
            <p className={styles.suggestedValue}>{suggestions.seoTitle}</p>
            <Button variant="ghost" size="sm" icon={appliedTitle ? Check : undefined} onClick={applyTitle}>
              {appliedTitle ? "Applied" : "Apply"}
            </Button>
          </div>

          <div className={styles.field}>
            <p className={styles.fieldLabel}>Suggested Meta Description</p>
            <p className={styles.currentValue}>Current: {currentDescription || <em>(empty)</em>}</p>
            <p className={styles.suggestedValue}>{suggestions.metaDescription}</p>
            <Button variant="ghost" size="sm" icon={appliedDescription ? Check : undefined} onClick={applyDescription}>
              {appliedDescription ? "Applied" : "Apply"}
            </Button>
          </div>

          <div className={styles.field}>
            <p className={styles.fieldLabel}>Focus Keyphrases</p>
            <p className={styles.hint}>Not saved automatically — this is SEO guidance, not tag management.</p>
            <ul className={styles.chipList}>
              {suggestions.focusKeywords.map((phrase) => (
                <li key={phrase} className={styles.chip}>
                  {phrase}
                </li>
              ))}
            </ul>
          </div>

          {suggestions.excerpt ? (
            <div className={styles.field}>
              <p className={styles.fieldLabel}>Suggested Excerpt</p>
              <p className={styles.suggestedValue}>{suggestions.excerpt}</p>
            </div>
          ) : null}

          {suggestions.suggestions?.length ? (
            <div className={styles.field}>
              <p className={styles.fieldLabel}>Content Suggestions</p>
              <ul className={styles.suggestionList}>
                {suggestions.suggestions.map((note, i) => (
                  // Recommendations only — nothing here rewrites the article.
                  // eslint-disable-next-line react/no-array-index-key
                  <li key={i}>{note}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
