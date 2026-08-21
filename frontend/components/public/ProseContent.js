import styles from "./ProseContent.module.css";

// Renders trusted, admin-authored rich-text HTML (Post.content /
// Page.content — written via the admin RichTextEditor, Tiptap) as content
// markup. This is CMS-managed content coming straight from our own backend,
// not user-submitted input, so dangerouslySetInnerHTML here carries the
// same trust boundary as any other server-rendered admin content.
export default function ProseContent({ html }) {
  return <div className={styles.prose} dangerouslySetInnerHTML={{ __html: html }} />;
}
