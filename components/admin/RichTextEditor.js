"use client";

import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

const toolbarButtonStyle = (active) => ({
  padding: "0.3rem 0.6rem",
  cursor: "pointer",
  fontWeight: active ? "bold" : "normal",
  background: active ? "#e0e0e0" : "#fff",
  border: "1px solid #ccc",
  borderRadius: "4px",
});

// value/onChange contract: value is an HTML string (matches Post.content in
// the schema, a plain LongText column — no JSON/markdown conversion).
export default function RichTextEditor({ value, onChange }) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || "",
    // Next.js renders this on the server first; without this the editor
    // tries to render immediately during SSR and mismatches on hydration.
    immediatelyRender: false,
    onUpdate: ({ editor: currentEditor }) => {
      onChange(currentEditor.getHTML());
    },
  });

  // Post data loads asynchronously (fetched after mount in edit mode), so
  // the editor is created empty and needs to be resynced once the real
  // content arrives. emitUpdate: false stops this from re-triggering
  // onChange and fighting the admin's own typing once they start editing.
  useEffect(() => {
    if (!editor) return;
    if (value !== undefined && value !== editor.getHTML()) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) {
    return <p>Loading editor…</p>;
  }

  return (
    <div style={{ border: "1px solid #ccc", borderRadius: "6px" }}>
      <div
        style={{
          display: "flex",
          gap: "0.3rem",
          flexWrap: "wrap",
          padding: "0.4rem",
          borderBottom: "1px solid #eee",
        }}
      >
        <button type="button" style={toolbarButtonStyle(editor.isActive("bold"))} onClick={() => editor.chain().focus().toggleBold().run()}>
          Bold
        </button>
        <button type="button" style={toolbarButtonStyle(editor.isActive("italic"))} onClick={() => editor.chain().focus().toggleItalic().run()}>
          Italic
        </button>
        <button
          type="button"
          style={toolbarButtonStyle(editor.isActive("heading", { level: 2 }))}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2
        </button>
        <button
          type="button"
          style={toolbarButtonStyle(editor.isActive("heading", { level: 3 }))}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          H3
        </button>
        <button type="button" style={toolbarButtonStyle(editor.isActive("bulletList"))} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          • List
        </button>
        <button type="button" style={toolbarButtonStyle(editor.isActive("orderedList"))} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          1. List
        </button>
        <button type="button" style={toolbarButtonStyle(editor.isActive("blockquote"))} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          Quote
        </button>
        <button type="button" style={toolbarButtonStyle(false)} onClick={() => editor.chain().focus().undo().run()}>
          Undo
        </button>
        <button type="button" style={toolbarButtonStyle(false)} onClick={() => editor.chain().focus().redo().run()}>
          Redo
        </button>
      </div>
      <div style={{ padding: "0.75rem", minHeight: "220px" }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
