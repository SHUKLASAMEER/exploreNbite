"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import PageHeader from "@/components/admin/ui/PageHeader";
import Button from "@/components/admin/ui/Button";
import FormField from "@/components/admin/ui/FormField";
import ImageUpload from "@/components/admin/ui/ImageUpload";
import LoadingState from "@/components/admin/ui/LoadingState";
import ErrorState from "@/components/admin/ui/ErrorState";
import { useToast } from "@/components/admin/ui/Toast";
import styles from "./SettingsManager.module.css";

async function parseJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

const FIELDS = [
  "siteTitle",
  "tagline",
  "logoUrl",
  "heroImageUrl",
  "contactEmail",
  "socialFacebook",
  "socialTwitter",
  "socialInstagram",
  "footerText",
  "metaDescription",
  "defaultOgImageUrl",
];

const emptyForm = Object.fromEntries(FIELDS.map((key) => [key, ""]));

// Settings is a singleton (id always 1) — a plain load-then-save form, not a
// list manager. Every field maps 1:1 to something the public site shows
// (branding, hero, contact, social, footer, default SEO), so a site owner can
// change what the website displays without a developer touching code.
export default function SettingsManager() {
  const showToast = useToast();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError("");
      try {
        const res = await apiFetch("/api/admin/settings");
        const data = await parseJsonSafe(res);
        if (!res.ok) {
          throw new Error(data?.error?.message ?? "Failed to load settings.");
        }
        if (cancelled) return;
        const settings = data.settings ?? {};
        setForm(Object.fromEntries(FIELDS.map((key) => [key, settings[key] ?? ""])));
      } catch (err) {
        if (!cancelled) setLoadError(err.message || "Failed to load settings.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const setField = (key) => (eventOrValue) =>
    setForm((prev) => ({
      ...prev,
      [key]: typeof eventOrValue === "string" ? eventOrValue : eventOrValue.target.value,
    }));

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");
    setSaving(true);

    try {
      const res = await apiFetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await parseJsonSafe(res);

      if (!res.ok) {
        setFormError(data?.error?.message ?? "Could not save settings.");
        showToast("Could not save settings.", { type: "error" });
        setSaving(false);
        return;
      }

      // Reflect any server-side normalisation (trimming, lowercased email).
      const settings = data.settings ?? {};
      setForm(Object.fromEntries(FIELDS.map((key) => [key, settings[key] ?? ""])));
      setSaving(false);
      showToast("Settings saved.");
    } catch {
      setFormError("Something went wrong. Please try again.");
      showToast("Something went wrong.", { type: "error" });
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingState label="Loading settings…" />;
  }

  if (loadError) {
    return <ErrorState title="Couldn't load settings" description={loadError} />;
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <PageHeader title="Site Settings" description="Branding, hero, contact, social links and default SEO for the public site." />

      {formError ? <ErrorState title={formError} /> : null}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Branding</h2>

        <FormField
          label="Site Title"
          htmlFor="settings-site-title"
          required
          value={form.siteTitle}
          onChange={setField("siteTitle")}
        />

        <FormField
          label="Tagline"
          htmlFor="settings-tagline"
          hint="Shown under the site title in the hero. Leave blank to use the built-in default."
          value={form.tagline}
          onChange={setField("tagline")}
        />

        <ImageUpload label="Logo" value={form.logoUrl} onChange={setField("logoUrl")} />

        <ImageUpload
          label="Hero Image"
          value={form.heroImageUrl}
          onChange={setField("heroImageUrl")}
        />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Contact</h2>

        <FormField
          label="Contact Email"
          htmlFor="settings-contact-email"
          type="email"
          required
          hint="Where Contact / Work With Me enquiries are sent."
          value={form.contactEmail}
          onChange={setField("contactEmail")}
        />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Social Links</h2>
        <p className={styles.sectionHint}>
          Used in the header, footer and sidebar social widgets — one place, no duplicates.
        </p>

        <FormField
          label="Facebook URL"
          htmlFor="settings-facebook"
          placeholder="https://…"
          value={form.socialFacebook}
          onChange={setField("socialFacebook")}
        />
        <FormField
          label="Twitter URL"
          htmlFor="settings-twitter"
          placeholder="https://…"
          value={form.socialTwitter}
          onChange={setField("socialTwitter")}
        />
        <FormField
          label="Instagram URL"
          htmlFor="settings-instagram"
          placeholder="https://…"
          value={form.socialInstagram}
          onChange={setField("socialInstagram")}
        />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Footer</h2>

        <FormField
          label="Footer Text"
          htmlFor="settings-footer-text"
          as="textarea"
          hint="The short 'About' blurb in the footer."
          value={form.footerText}
          onChange={setField("footerText")}
        />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>SEO Defaults</h2>

        <FormField
          label="Default Meta Description"
          htmlFor="settings-meta-description"
          as="textarea"
          hint="Fallback description shown in search results and social previews for pages that don't set their own. Posts still use their own short description."
          value={form.metaDescription}
          onChange={setField("metaDescription")}
        />

        <ImageUpload
          label="Default Social Share Image (OG image)"
          value={form.defaultOgImageUrl}
          onChange={setField("defaultOgImageUrl")}
        />
      </section>

      <div className={styles.formActions}>
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
