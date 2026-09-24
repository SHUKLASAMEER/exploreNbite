"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import PageHeader from "@/components/admin/ui/PageHeader";
import Button from "@/components/admin/ui/Button";
import LoadingState from "@/components/admin/ui/LoadingState";
import ErrorState from "@/components/admin/ui/ErrorState";
import { useToast } from "@/components/admin/ui/Toast";
import styles from "./SidebarManager.module.css";

async function parseJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

// Human names for the fixed set of sidebar layouts (code-owned — one per
// public page shape). The widget registry (labels, which are sticky) comes
// from the API so it's never duplicated here.
const LAYOUT_LABELS = {
  home: "Blog sidebar — home, categories, posts, search, authors",
  archive: "Category archives (not used — categories use the Blog sidebar)",
  post: "Single post (not used — posts use the Blog sidebar)",
  page: "Standard pages — books, awards, about, work with me",
  contact: "Contact page",
  utility: "Search & author archives (not used — they use the Blog sidebar)",
};

function move(list, index, delta) {
  const target = index + delta;
  if (target < 0 || target >= list.length) return list;
  const next = list.slice();
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export default function SidebarManager() {
  const showToast = useToast();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [registry, setRegistry] = useState([]);
  const [layouts, setLayouts] = useState([]);
  const [config, setConfig] = useState({});
  const [savingLayout, setSavingLayout] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError("");
      try {
        const res = await apiFetch("/api/admin/sidebar");
        const data = await parseJsonSafe(res);
        if (!res.ok) throw new Error(data?.error?.message ?? "Failed to load sidebar configuration.");
        if (cancelled) return;
        setRegistry(data.registry ?? []);
        setLayouts(data.layouts ?? []);
        setConfig(data.config ?? {});
      } catch (err) {
        if (!cancelled) setLoadError(err.message || "Failed to load sidebar configuration.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const widgetLabel = (key) => registry.find((w) => w.key === key)?.label ?? key;
  const isSticky = (key) => Boolean(registry.find((w) => w.key === key)?.sticky);

  function updateLayout(layout, nextRows) {
    setConfig((prev) => ({ ...prev, [layout]: nextRows }));
  }

  async function saveLayout(layout) {
    setSavingLayout(layout);
    try {
      const res = await apiFetch(`/api/admin/sidebar/${layout}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ widgets: config[layout] ?? [] }),
      });
      const data = await parseJsonSafe(res);
      if (!res.ok) {
        showToast(data?.error?.message ?? "Could not save this layout.", { type: "error" });
        setSavingLayout(null);
        return;
      }
      setConfig(data.config ?? config);
      showToast(`Saved the ${LAYOUT_LABELS[layout] ?? layout} sidebar.`);
    } catch {
      showToast("Something went wrong. Please try again.", { type: "error" });
    }
    setSavingLayout(null);
  }

  if (loading) return <LoadingState label="Loading sidebar configuration…" />;
  if (loadError) return <ErrorState title="Couldn't load sidebar configuration" description={loadError} />;

  return (
    <div className={styles.wrap}>
      <PageHeader
        title="Sidebar"
        description="Choose which widgets appear in each sidebar layout, and in what order. What each widget shows, and the sticky badge block (Tripoto / IndiBlogger / Sur.ly), stay fixed in code."
      />

      {layouts.map((layout) => {
        const rows = config[layout] ?? [];
        const usedKeys = new Set(rows.map((r) => r.widgetKey));
        const addable = registry.filter((w) => !usedKeys.has(w.key));

        return (
          <section key={layout} className={styles.section}>
            <h2 className={styles.sectionTitle}>{LAYOUT_LABELS[layout] ?? layout}</h2>

            {rows.length === 0 ? (
              <p className={styles.empty}>No widgets — this sidebar layout renders empty.</p>
            ) : (
              <ul className={styles.list}>
                {rows.map((row, index) => (
                  <li key={row.widgetKey} className={styles.row}>
                    <span className={styles.reorder}>
                      <button
                        type="button"
                        aria-label={`Move ${widgetLabel(row.widgetKey)} up`}
                        disabled={index === 0}
                        onClick={() => updateLayout(layout, move(rows, index, -1))}
                      >
                        <ArrowUp size={14} strokeWidth={2} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Move ${widgetLabel(row.widgetKey)} down`}
                        disabled={index === rows.length - 1}
                        onClick={() => updateLayout(layout, move(rows, index, 1))}
                      >
                        <ArrowDown size={14} strokeWidth={2} />
                      </button>
                    </span>

                    <label className={styles.toggle}>
                      <input
                        type="checkbox"
                        checked={row.enabled}
                        onChange={(e) =>
                          updateLayout(
                            layout,
                            rows.map((r, i) => (i === index ? { ...r, enabled: e.target.checked } : r))
                          )
                        }
                      />
                      <span className={row.enabled ? "" : styles.disabledLabel}>
                        {widgetLabel(row.widgetKey)}
                        {isSticky(row.widgetKey) ? <span className={styles.badge}>sticky</span> : null}
                      </span>
                    </label>

                    <button
                      type="button"
                      className={styles.remove}
                      aria-label={`Remove ${widgetLabel(row.widgetKey)}`}
                      onClick={() => updateLayout(layout, rows.filter((_, i) => i !== index))}
                    >
                      <X size={14} strokeWidth={2} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className={styles.actions}>
              {addable.length > 0 ? (
                <select
                  className={styles.addSelect}
                  value=""
                  onChange={(e) => {
                    if (!e.target.value) return;
                    updateLayout(layout, [...rows, { widgetKey: e.target.value, enabled: true }]);
                    e.target.value = "";
                  }}
                >
                  <option value="">
                    + Add widget…
                  </option>
                  {addable.map((w) => (
                    <option key={w.key} value={w.key}>
                      {w.label}
                    </option>
                  ))}
                </select>
              ) : (
                <span className={styles.allAdded}>All widgets added</span>
              )}

              <Button
                type="button"
                variant="primary"
                disabled={savingLayout === layout}
                onClick={() => saveLayout(layout)}
              >
                {savingLayout === layout ? "Saving…" : "Save this layout"}
              </Button>
            </div>
          </section>
        );
      })}
    </div>
  );
}
