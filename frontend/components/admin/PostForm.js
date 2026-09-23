"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Plus, ArrowLeft } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { buildTagContext, rankTags, tagSlug } from "@/lib/rankTags";
import { generateTagCandidates } from "@/lib/generateTagCandidates";
import RichTextEditor from "@/components/admin/RichTextEditor";
import RevisionHistory from "@/components/admin/RevisionHistory";
import SeoAssistant from "@/components/admin/SeoAssistant";
import PageHeader from "@/components/admin/ui/PageHeader";
import Button from "@/components/admin/ui/Button";
import FormField from "@/components/admin/ui/FormField";
import ImageUpload from "@/components/admin/ui/ImageUpload";
import LoadingState from "@/components/admin/ui/LoadingState";
import ErrorState from "@/components/admin/ui/ErrorState";
import { useToast } from "@/components/admin/ui/Toast";
import styles from "./PostForm.module.css";

async function parseJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

// Mirrors the backend's tag-name rules (utils/validation/posts.js): trim,
// collapse internal whitespace, cap length. The backend re-validates and is
// the real boundary — this just keeps the UI honest.
const TAG_NAME_MAX = 80;
const NEW_TAG_SUGGESTION_LIMIT = 8;

function normalizeTagName(raw) {
  return String(raw ?? "").trim().replace(/\s+/g, " ");
}

function toDatetimeLocalValue(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const emptyForm = {
  title: "",
  slug: "",
  categoryId: "",
  categoryIds: [],
  authorId: "",
  featuredImageUrl: "",
  shortDescription: "",
  content: "",
  status: "draft",
  allowComments: true,
  sticky: false,
  publishDate: toDatetimeLocalValue(new Date().toISOString()),
  tags: [],
};

export default function PostForm({ mode, postId }) {
  const router = useRouter();
  const showToast = useToast();
  const isEditing = mode === "edit";

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [categories, setCategories] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [allTags, setAllTags] = useState([]);

  const [form, setForm] = useState(emptyForm);
  const [tagInput, setTagInput] = useState("");

  // Progressive reveal for the (potentially hundreds of) existing tags:
  // start at 8, then +30 per "See More" click. Selected tags are shown as
  // chips above and are excluded from this list, so they never get hidden
  // by the slice.
  const TAGS_INITIAL = 8;
  const TAGS_STEP = 30;
  const [visibleTagCount, setVisibleTagCount] = useState(TAGS_INITIAL);

  // Explicit-action tag creation state (the "Create" buttons + manual input).
  const [tagBusy, setTagBusy] = useState(false);
  const [tagError, setTagError] = useState("");

  // Debounced raw snapshot of the fields that drive both tag features
  // (relevance ranking of existing tags + new-tag candidate generation).
  // Debouncing keeps this work off the typing hot path; no network request
  // is involved — tags are fetched once, in the loader below.
  const [tagContextInput, setTagContextInput] = useState({ title: "", description: "", content: "" });
  useEffect(() => {
    const timer = setTimeout(() => {
      setTagContextInput({
        title: form.title,
        description: form.shortDescription,
        content: form.content,
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [form.title, form.shortDescription, form.content]);

  const tagContext = useMemo(() => buildTagContext(tagContextInput), [tagContextInput]);
  const hasTagContext = Boolean(tagContext.title || tagContext.description || tagContext.content);

  // Slugs already covered elsewhere — every existing DB tag and every
  // currently-selected tag — so neither the ranked list nor the generated
  // candidates ever duplicate them.
  const selectedSlugs = useMemo(
    () => new Set(form.tags.map((name) => tagSlug(name))),
    [form.tags]
  );
  const existingSlugs = useMemo(
    () => new Set(allTags.map((t) => tagSlug(t.name))),
    [allTags]
  );

  // Existing tags not already selected, ordered by relevance to tagContext
  // (falls back to the API's name-asc order when there's no context yet).
  const suggestedTags = useMemo(() => {
    const available = allTags.filter((t) => !selectedSlugs.has(tagSlug(t.name)));
    return rankTags(available, tagContext);
  }, [allTags, selectedSlugs, tagContext]);

  // Deterministic, client-side NEW-tag candidates from the post context.
  // These are only strings until the admin clicks "Create".
  const newTagCandidates = useMemo(() => {
    const exclude = new Set([...existingSlugs, ...selectedSlugs]);
    return generateTagCandidates(tagContextInput, {
      excludeSlugs: exclude,
      limit: NEW_TAG_SUGGESTION_LIMIT,
    });
  }, [tagContextInput, existingSlugs, selectedSlugs]);

  // Data sent to the AI SEO Suggestions endpoint — SEO-relevant fields only
  // (never credentials/cookies/other posts), recomputed from current form
  // state each render so "Generate" always analyzes the live draft.
  const seoAssistantSnapshot = useMemo(
    () => ({
      title: form.title,
      shortDescription: form.shortDescription,
      content: form.content,
      category: categories.find((c) => String(c.id) === form.categoryId)?.name ?? "",
      tags: form.tags,
      slug: form.slug,
    }),
    [form.title, form.shortDescription, form.content, form.categoryId, form.tags, form.slug, categories]
  );

  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // ---- Autosave (draft workspace only — see backend post.service.js#autosave)
  // "idle": nothing to save yet (just loaded, or a save/autosave just landed
  // and nothing has changed since). "unsaved": changed, waiting out the
  // debounce. "saving" / "saved" / "error" are the request outcome.
  const [autosaveState, setAutosaveState] = useState("idle");
  const [autosaveNotice, setAutosaveNotice] = useState(""); // e.g. a "stale" warning
  const [revisionRefreshToken, setRevisionRefreshToken] = useState(0);
  // The Post.updatedAt this editor session was loaded with — sent back on
  // every autosave so the server can tell us if a manual save landed
  // elsewhere in the meantime (Section 13: a timestamp check, not a lock).
  // Only ever read/written from event handlers and effects, never during
  // render, so a plain ref is appropriate here.
  const postUpdatedAtRef = useRef(null);
  // The last content snapshot that is already safely persisted — either
  // from the initial load or the most recent successful autosave/manual
  // save. Compared against the live form to decide (a) whether there's
  // anything to autosave at all, and (b) the "Unsaved changes" indicator —
  // both computed during render, so this has to be real state, not a ref.
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState(null);

  function snapshotOf(f) {
    return {
      title: f.title,
      slug: f.slug,
      shortDescription: f.shortDescription,
      content: f.content,
      featuredImageUrl: f.featuredImageUrl,
      categoryId: f.categoryId ? Number(f.categoryId) : null,
      authorId: f.authorId ? Number(f.authorId) : null,
      categoryIds: f.categoryIds.map(Number).sort((a, b) => a - b),
      tags: [...f.tags].map((t) => t.toLowerCase()).sort(),
    };
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError("");
      try {
        const requests = [
          apiFetch("/api/admin/categories"),
          apiFetch("/api/admin/authors"),
          apiFetch("/api/admin/tags"),
        ];
        if (isEditing) {
          requests.push(apiFetch(`/api/admin/posts/${postId}`));
        }

        const responses = await Promise.all(requests);
        const [categoriesRes, authorsRes, tagsRes, postRes] = responses;

        if (!categoriesRes.ok || !authorsRes.ok || !tagsRes.ok || (postRes && !postRes.ok)) {
          throw new Error("Failed to load the data this form needs.");
        }

        const categoriesData = await categoriesRes.json();
        const authorsData = await authorsRes.json();
        const tagsData = await tagsRes.json();

        if (cancelled) return;
        setCategories(categoriesData.categories ?? []);
        setAuthors(authorsData.authors ?? []);
        setAllTags(tagsData.tags ?? []);

        if (isEditing && postRes) {
          const postData = await postRes.json();
          const post = postData.post;
          if (cancelled) return;
          const loadedForm = {
            title: post.title,
            slug: post.slug,
            categoryId: String(post.category.id),
            // `categories` is the full set (primary + extra); the extra
            // ones are whatever's left after excluding the primary.
            categoryIds: (post.categories ?? [])
              .filter((c) => c.id !== post.category.id)
              .map((c) => String(c.id)),
            authorId: String(post.author.id),
            featuredImageUrl: post.featuredImageUrl ?? "",
            shortDescription: post.shortDescription ?? "",
            content: post.content,
            status: post.status,
            allowComments: post.allowComments,
            sticky: post.sticky ?? false,
            publishDate: toDatetimeLocalValue(post.publishDate),
            tags: post.tags.map((t) => t.name),
          };
          setForm(loadedForm);
          // Baseline for autosave comparison + staleness — editing always
          // starts from whatever is currently live (published or draft);
          // autosave only ever records what changes FROM here.
          postUpdatedAtRef.current = post.updatedAt;
          setLastSavedSnapshot(snapshotOf(loadedForm));
          setAutosaveState("idle");
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err.message || "Failed to load this form.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isEditing, postId]);

  // Derived, not stored: whether the live form differs from the last thing
  // that was actually persisted (initial load, last autosave, or last
  // manual save). Drives both the "Unsaved changes" indicator and whether
  // the debounce below bothers scheduling an autosave at all.
  const hasUnsavedChanges =
    isEditing &&
    !loading &&
    Boolean(lastSavedSnapshot) &&
    JSON.stringify(snapshotOf(form)) !== JSON.stringify(lastSavedSnapshot);

  // Autosave — a debounced (3s of no further edits) snapshot of the DRAFT
  // workspace only. This never calls the create/update endpoints and never
  // touches the live post; see backend post.service.js#autosave. Only
  // fires while editing an EXISTING post (a brand-new, never-saved post has
  // no id to attach a revision to — its first explicit Save is what creates
  // it, unchanged). Keyed on exactly the fields a revision stores, so
  // toggling status/sticky/allowComments/publishDate alone never triggers
  // an autosave network call.
  const tagsKey = form.tags.join("");
  const categoryIdsKey = form.categoryIds.join(",");
  useEffect(function scheduleAutosave() {
    if (!isEditing || !postId || loading || !hasUnsavedChanges) return undefined;
    const timer = setTimeout(() => {
      // runAutosave is a hoisted function declaration (defined just below,
      // read via closure each time this effect re-runs), so it always sees
      // the latest form/lastSavedSnapshot despite this call preceding its
      // textual declaration.
      // eslint-disable-next-line react-hooks/immutability
      runAutosave(snapshotOf(form));
    }, 3000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isEditing,
    postId,
    loading,
    hasUnsavedChanges,
    form.title,
    form.slug,
    form.categoryId,
    categoryIdsKey,
    form.authorId,
    form.featuredImageUrl,
    form.shortDescription,
    form.content,
    tagsKey,
  ]);

  async function runAutosave(snapshot) {
    if (lastSavedSnapshot && JSON.stringify(lastSavedSnapshot) === JSON.stringify(snapshot)) {
      // Nothing meaningful changed since the last save — skip the request
      // entirely (Section 5: avoid unnecessary API traffic; Section 9:
      // don't create a duplicate snapshot for identical content).
      return;
    }

    setAutosaveState("saving");
    try {
      const res = await apiFetch(`/api/admin/posts/${postId}/autosave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          slug: form.slug,
          categoryId: form.categoryId ? Number(form.categoryId) : undefined,
          categoryIds: form.categoryIds.map(Number),
          authorId: form.authorId ? Number(form.authorId) : undefined,
          featuredImageUrl: form.featuredImageUrl,
          shortDescription: form.shortDescription,
          content: form.content,
          tags: form.tags,
          // Lets the server tell us if a manual save landed elsewhere since
          // this editor loaded (Section 13) — informational only, autosave
          // still always succeeds either way.
          baseUpdatedAt: postUpdatedAtRef.current,
        }),
      });
      const data = await parseJsonSafe(res);
      if (!res.ok) {
        // A failed autosave must never look like a successful one, and must
        // never block continued editing — nothing here disables any input.
        setAutosaveState("error");
        return;
      }
      setLastSavedSnapshot(snapshot);
      setAutosaveState("idle");
      setAutosaveNotice(
        data.stale
          ? "This post was saved elsewhere since you opened it. Your autosaved draft is safe — review before publishing."
          : ""
      );
      setRevisionRefreshToken((n) => n + 1);
    } catch {
      setAutosaveState("error");
    }
  }

  // Loads a revision's content back into the editor as an in-progress
  // draft. This ONLY calls setForm — it never calls the save/publish
  // endpoint, so a published post's live content is untouched until the
  // admin explicitly clicks Save. status/publishDate/allowComments/sticky
  // are deliberately left exactly as they currently are in the editor.
  function handleRestoreRevision(revision) {
    setForm((prev) => ({
      ...prev,
      title: revision.title ?? "",
      slug: revision.slug ?? "",
      shortDescription: revision.shortDescription ?? "",
      content: revision.content ?? "",
      featuredImageUrl: revision.featuredImageUrl ?? "",
      categoryId: revision.categoryId ? String(revision.categoryId) : prev.categoryId,
      categoryIds: (revision.categoryIds ?? []).map(String),
      authorId: revision.authorId ? String(revision.authorId) : prev.authorId,
      tags: revision.tagNames ?? [],
    }));
    showToast(
      `Restored the ${revision.type === "manual" ? "manual save" : "autosave"} from ${new Date(
        revision.createdAt
      ).toLocaleString()} into the editor. Click Save to keep it.`
    );
  }

  // Previews a past revision using the exact same admin-only preview route
  // as the live editor's own Preview button (see handlePreview below) — no
  // new preview mechanism, just a different source payload. Opened in its
  // own named tab so it can never be confused with (or silently replace) an
  // already-open live-draft preview.
  function handlePreviewRevision(revision) {
    const category = categories.find((c) => c.id === revision.categoryId) ?? null;
    const author = authors.find((a) => a.id === revision.authorId) ?? null;
    const payload = {
      title: revision.title,
      slug: revision.slug,
      shortDescription: revision.shortDescription,
      content: revision.content,
      featuredImageUrl: revision.featuredImageUrl,
      status: form.status,
      publishDate: form.publishDate ? new Date(form.publishDate).toISOString() : null,
      category: category ? { name: category.name, slug: category.slug } : null,
      author: author ? { name: author.name } : null,
      tags: revision.tagNames ?? [],
      isEditing,
      postId: isEditing ? postId : null,
      savedAt: Date.now(),
    };
    try {
      window.localStorage.setItem("enbite:post-preview", JSON.stringify(payload));
    } catch {
      showToast("Couldn't open preview (browser storage unavailable).", { type: "error" });
      return;
    }
    window.open("/admin/preview", "enbitePostPreviewRevision");
  }

  function selectTagByName(name) {
    setForm((prev) => {
      if (prev.tags.some((t) => tagSlug(t) === tagSlug(name))) return prev;
      return { ...prev, tags: [...prev.tags, name] };
    });
  }

  function removeTag(name) {
    setForm((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== name) }));
  }

  // Select an existing tag if an equivalent one is already loaded (matched
  // by slug, case/whitespace-insensitive) — otherwise create it through the
  // existing admin tag API and select the real record it returns. Only ever
  // called from an explicit admin action (a suggestion's "Create" button or
  // the manual "Add Tag" control); never on typing or context changes.
  async function selectOrCreateTag(rawName) {
    const name = normalizeTagName(rawName);
    if (!name) {
      setTagError("Enter a tag name.");
      return false;
    }
    if (name.length > TAG_NAME_MAX) {
      setTagError(`Tag names must be ${TAG_NAME_MAX} characters or fewer.`);
      return false;
    }
    const slug = tagSlug(name);
    setTagError("");

    if (form.tags.some((t) => tagSlug(t) === slug)) return true; // already selected

    const existing = allTags.find((t) => tagSlug(t.name) === slug);
    if (existing) {
      selectTagByName(existing.name);
      return true;
    }

    setTagBusy(true);
    try {
      const res = await apiFetch("/api/admin/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await parseJsonSafe(res);
      if (!res.ok) {
        // The create endpoint now rejects a duplicate slug (409) instead of
        // silently returning the existing tag. If that happens (another
        // admin/tab created it since this form loaded), recover by fetching
        // the current tag list and selecting the real record.
        if (res.status === 409) {
          try {
            const listRes = await apiFetch("/api/admin/tags");
            const listData = await parseJsonSafe(listRes);
            const match = (listData?.tags ?? []).find((t) => tagSlug(t.name) === slug);
            if (match) {
              setAllTags((prev) => (prev.some((t) => t.id === match.id) ? prev : [...prev, match]));
              selectTagByName(match.name);
              return true;
            }
          } catch {
            /* fall through to the error message below */
          }
        }
        setTagError(data?.error?.message ?? "Could not create this tag.");
        return false;
      }
      const created = data?.tag;
      if (!created) {
        setTagError("Could not create this tag.");
        return false;
      }
      setAllTags((prev) =>
        prev.some((t) => t.id === created.id) ? prev : [...prev, created]
      );
      selectTagByName(created.name);
      return true;
    } catch {
      setTagError("Something went wrong creating the tag.");
      return false;
    } finally {
      setTagBusy(false);
    }
  }

  async function handleAddManualTag() {
    const ok = await selectOrCreateTag(tagInput);
    if (ok) setTagInput("");
  }

  function handleTagInputKeyDown(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      handleAddManualTag();
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");
    setSaving(true);

    const payload = {
      title: form.title,
      slug: form.slug,
      categoryId: form.categoryId ? Number(form.categoryId) : undefined,
      categoryIds: form.categoryIds.map(Number),
      authorId: form.authorId ? Number(form.authorId) : undefined,
      featuredImageUrl: form.featuredImageUrl,
      shortDescription: form.shortDescription,
      content: form.content,
      status: form.status,
      allowComments: form.allowComments,
      sticky: form.sticky,
      publishDate: form.publishDate ? new Date(form.publishDate).toISOString() : undefined,
      tags: form.tags,
    };

    try {
      const res = await apiFetch(isEditing ? `/api/admin/posts/${postId}` : "/api/admin/posts", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await parseJsonSafe(res);

      if (!res.ok) {
        setFormError(data?.error?.message ?? "Could not save this post.");
        setSaving(false);
        return;
      }

      if (isEditing) {
        showToast("Post updated.");
        // A manual save is itself already recorded as a "manual" revision
        // server-side (post.service.js#update); just resync our own
        // baseline so the "Unsaved changes" indicator and the next
        // autosave compare against what's now actually persisted.
        postUpdatedAtRef.current = data.post?.updatedAt ?? postUpdatedAtRef.current;
        lastSavedSnapshotRef.current = snapshotOf(form);
        setAutosaveState("idle");
        setAutosaveNotice("");
        setRevisionRefreshToken((n) => n + 1);
        setSaving(false);
      } else {
        // Created -> continue editing the now-persisted post, same pattern
        // most CMS post editors use.
        showToast("Post created.");
        router.push(`/admin/posts/${data.post.id}/edit`);
      }
    } catch {
      setFormError("Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  // Opens the admin-only preview (app/admin/preview) in a dedicated tab,
  // handing it the CURRENT form state — including unsaved edits and, for a
  // brand-new post, before any DB row exists. State travels through
  // localStorage (same-origin, admin's own browser), never a query string,
  // and the preview route sanitizes the content server-side before render.
  // The editor tab is left untouched, so nothing here can be lost.
  function handlePreview() {
    const category = categories.find((c) => String(c.id) === form.categoryId) ?? null;
    const author = authors.find((a) => String(a.id) === form.authorId) ?? null;
    const payload = {
      title: form.title,
      slug: form.slug,
      shortDescription: form.shortDescription,
      content: form.content,
      featuredImageUrl: form.featuredImageUrl,
      status: form.status,
      publishDate: form.publishDate ? new Date(form.publishDate).toISOString() : null,
      category: category ? { name: category.name, slug: category.slug } : null,
      author: author ? { name: author.name } : null,
      tags: form.tags,
      isEditing,
      postId: isEditing ? postId : null,
      savedAt: Date.now(),
    };
    try {
      window.localStorage.setItem("enbite:post-preview", JSON.stringify(payload));
    } catch {
      showToast("Couldn't open preview (browser storage unavailable).");
      return;
    }
    window.open("/admin/preview", "enbitePostPreview");
  }

  if (loading) {
    return <LoadingState label="Loading post form…" />;
  }

  if (loadError) {
    return <ErrorState title="Couldn't load this form" description={loadError} />;
  }

  const visibleSuggestedTags = suggestedTags.slice(0, visibleTagCount);
  const hasMoreTags = visibleTagCount < suggestedTags.length;

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <PageHeader
        title={isEditing ? "Edit Post" : "Add Post"}
        actions={
          <Button variant="secondary" icon={ArrowLeft} onClick={() => router.push("/admin/posts")}>
            Back to Posts
          </Button>
        }
      />

      {formError ? <ErrorState title={formError} /> : null}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Basic Information</h2>

        <FormField
          label="Title"
          htmlFor="post-title"
          required
          value={form.title}
          onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
        />

        <FormField
          label="Slug"
          htmlFor="post-slug"
          hint="Optional — leave blank to auto-generate from the title."
          placeholder="(auto)"
          value={form.slug}
          onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
        />

        <FormField label="Category" htmlFor="post-category" required>
          <select
            id="post-category"
            className={styles.select}
            required
            value={form.categoryId}
            onChange={(e) => setForm((prev) => ({ ...prev, categoryId: e.target.value }))}
          >
            <option value="" disabled>
              Select a category…
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </FormField>

        <div className={styles.field}>
          <span className={styles.label}>
            Additional categories
            <span className={styles.hintInline}>
              {" "}
              (optional — a post can also show up under other category listings besides its primary one above)
            </span>
          </span>
          <div className={styles.checkboxGrid}>
            {categories
              .filter((c) => String(c.id) !== form.categoryId)
              .map((c) => (
                <label key={c.id} className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={form.categoryIds.includes(String(c.id))}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        categoryIds: e.target.checked
                          ? [...prev.categoryIds, String(c.id)]
                          : prev.categoryIds.filter((id) => id !== String(c.id)),
                      }))
                    }
                  />
                  {c.name}
                </label>
              ))}
          </div>
        </div>

        <FormField label="Author" htmlFor="post-author" required>
          <select
            id="post-author"
            className={styles.select}
            required
            value={form.authorId}
            onChange={(e) => setForm((prev) => ({ ...prev, authorId: e.target.value }))}
          >
            <option value="" disabled>
              Select an author…
            </option>
            {authors.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </FormField>

        <ImageUpload
          label="Featured Image"
          value={form.featuredImageUrl}
          onChange={(url) => setForm((prev) => ({ ...prev, featuredImageUrl: url }))}
        />

        <FormField
          label="Short Description"
          htmlFor="post-description"
          as="textarea"
          maxLength={300}
          value={form.shortDescription}
          onChange={(e) => setForm((prev) => ({ ...prev, shortDescription: e.target.value }))}
        />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Content</h2>
        <RichTextEditor value={form.content} onChange={(html) => setForm((prev) => ({ ...prev, content: html }))} />
      </section>

      <SeoAssistant
        postSnapshot={seoAssistantSnapshot}
        currentTitle={form.title}
        currentDescription={form.shortDescription}
        onApplyTitle={(title) => setForm((prev) => ({ ...prev, title }))}
        onApplyDescription={(shortDescription) => setForm((prev) => ({ ...prev, shortDescription }))}
      />

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Tags</h2>

        <div className={styles.tagGroup}>
          <p className={styles.tagGroupTitle}>Selected tags</p>
          <div className={styles.tagList}>
            {form.tags.length === 0 ? <em className={styles.hintInline}>No tags selected yet.</em> : null}
            {form.tags.map((name) => (
              <span key={name} className={styles.tagChip}>
                {name}
                <button
                  type="button"
                  onClick={() => removeTag(name)}
                  aria-label={`Remove tag ${name}`}
                  className={styles.tagRemove}
                >
                  <X size={12} strokeWidth={2.5} />
                </button>
              </span>
            ))}
          </div>
        </div>

        {suggestedTags.length > 0 ? (
          <div className={styles.tagGroup}>
            <p className={styles.tagGroupTitle}>Relevant existing tags</p>
            <p className={styles.hintInline}>
              {hasTagContext
                ? "Existing tags from the library, ranked by relevance to this post's title, description and content."
                : "Existing tags from the library. Add a title, description or content to rank these by relevance."}
            </p>
            <div className={styles.tagList}>
              {visibleSuggestedTags.map((t) => (
                <Button key={t.id} type="button" variant="ghost" size="sm" icon={Plus} onClick={() => selectTagByName(t.name)}>
                  {t.name}
                </Button>
              ))}
            </div>
            {hasMoreTags ? (
              <div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setVisibleTagCount((count) => count + TAGS_STEP)}
                >
                  See More
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}

        {newTagCandidates.length > 0 ? (
          <div className={styles.tagGroup}>
            <p className={styles.tagGroupTitle}>Suggested new tags</p>
            <p className={styles.hintInline}>
              Generated from this post&apos;s details — these don&apos;t exist yet. Click one to create it and add it to this post.
            </p>
            <div className={styles.tagList}>
              {newTagCandidates.map((candidate) => (
                <Button
                  key={candidate}
                  type="button"
                  variant="ghost"
                  size="sm"
                  icon={Plus}
                  disabled={tagBusy}
                  onClick={() => selectOrCreateTag(candidate)}
                >
                  {candidate}
                </Button>
              ))}
            </div>
          </div>
        ) : null}

        <div className={styles.tagGroup}>
          <FormField
            label="Add a tag"
            htmlFor="post-tag-input"
            hint="Type a tag name and press Enter. An existing match is reused; anything new is created when you add it."
            placeholder="e.g. hidden desert village"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagInputKeyDown}
            disabled={tagBusy}
          />
          <div>
            <Button type="button" variant="secondary" size="sm" icon={Plus} onClick={handleAddManualTag} disabled={tagBusy}>
              {tagBusy ? "Adding…" : "Add Tag"}
            </Button>
          </div>
          {tagError ? <p className={styles.tagError}>{tagError}</p> : null}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Publishing</h2>

        <FormField label="Status" htmlFor="post-status">
          <select
            id="post-status"
            className={styles.select}
            value={form.status}
            onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </FormField>

        <FormField
          label="Publish Date"
          htmlFor="post-publish-date"
          type="datetime-local"
          value={form.publishDate}
          onChange={(e) => setForm((prev) => ({ ...prev, publishDate: e.target.value }))}
        />

        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={form.allowComments}
            onChange={(e) => setForm((prev) => ({ ...prev, allowComments: e.target.checked }))}
          />
          Allow comments
        </label>

        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={form.sticky}
            onChange={(e) => setForm((prev) => ({ ...prev, sticky: e.target.checked }))}
          />
          Sticky
          <span className={styles.hintInline}> (pinned above other posts on the homepage feed, newest-sticky-first)</span>
        </label>
      </section>

      {isEditing ? (
        <RevisionHistory
          postId={postId}
          refreshToken={revisionRefreshToken}
          onRestore={handleRestoreRevision}
          onPreview={handlePreviewRevision}
        />
      ) : null}

      <div className={styles.formActions}>
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button type="button" variant="secondary" onClick={handlePreview} disabled={saving}>
          Preview
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.push("/admin/posts")} disabled={saving}>
          Cancel
        </Button>
        {isEditing ? (
          <span
            className={`${styles.autosaveStatus} ${autosaveState === "error" ? styles.autosaveError : ""}`}
            role="status"
            aria-live="polite"
          >
            {autosaveState === "saving"
              ? "Saving…"
              : autosaveState === "error"
                ? "Autosave failed — your edits are still here, will retry on the next change."
                : hasUnsavedChanges
                  ? "Unsaved changes"
                  : "All changes saved"}
            {autosaveNotice ? <span className={styles.autosaveNotice}> · {autosaveNotice}</span> : null}
          </span>
        ) : null}
      </div>
    </form>
  );
}
