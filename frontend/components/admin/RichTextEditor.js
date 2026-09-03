"use client";

// Raw HTML source editor for admin-authored post/page content.
//
// value/onChange contract: `value` is an HTML string and is stored verbatim
// (matches Post.content / Page.content in the schema — a plain LongText
// column, no JSON/markdown conversion). The admin writes or pastes complete
// HTML here; existing stored HTML loads straight back into the textarea
// unchanged. Server-side sanitization in the post/page services
// (backend/src/utils/sanitizeHtml.js) remains the security boundary — the
// editor intentionally does not filter input.

const editorStyle = {
  width: "100%",
  minHeight: "300px",
  resize: "vertical",
  fontFamily:
    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
  fontSize: "0.85rem",
  lineHeight: 1.6,
  padding: "0.85rem",
  border: "1px solid var(--admin-border-strong)",
  borderRadius: "var(--admin-radius-sm)",
  background: "var(--admin-surface)",
  color: "var(--admin-text)",
  whiteSpace: "pre-wrap",
  tabSize: 2,
  MozTabSize: 2,
};

const hintStyle = {
  fontSize: "0.78rem",
  color: "var(--admin-text-muted)",
  margin: "0.4rem 0 0",
};

export default function RichTextEditor({ value, onChange }) {
  return (
    <div>
      <textarea
        aria-label="HTML content"
        style={editorStyle}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
      />
      <p style={hintStyle}>
        Write or paste HTML content here. Tags such as &lt;h2&gt;, &lt;h3&gt;,
        &lt;p&gt;, &lt;strong&gt;, &lt;em&gt;, &lt;ul&gt;/&lt;li&gt;,
        &lt;ol&gt;/&lt;li&gt;, &lt;blockquote&gt; and links are kept and stored
        as HTML. Dangerous markup is stripped by the server on save.
      </p>
    </div>
  );
}
