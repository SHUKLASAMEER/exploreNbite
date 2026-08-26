import WidgetTitle from "./WidgetTitle";
import styles from "./Sidebar.module.css";

// Covers all three of the live site's small image-only sidebar widgets:
// the single "Awarded best travel and food writer of Gujarat" photo
// (`#media_image-2` — heading, no link), the Tripoto badge (`#custom_html-3`
// — no heading, links out), and the IndiBlogger badge (`#custom_html-4` —
// heading, links out). Same shape, just different heading/link presence, so
// one component with those as optional props rather than three near-copies.
// Renders nothing if there's no image — never a placeholder box.
export default function MediaBadgeWidget({ heading, imageUrl, imageWidth, imageHeight, alt = "", href }) {
  if (!imageUrl) return null;

  const image = (
    <img
      src={imageUrl}
      alt={alt}
      width={imageWidth}
      height={imageHeight}
      className={styles.mediaBadgeImage}
      style={imageWidth && imageHeight ? { aspectRatio: `${imageWidth} / ${imageHeight}` } : undefined}
    />
  );

  return (
    <div className={styles.widget}>
      {heading ? <WidgetTitle>{heading}</WidgetTitle> : null}
      {href ? (
        <a href={href} target="_blank" rel="noreferrer noopener" className={styles.mediaBadgeLink}>
          {image}
        </a>
      ) : (
        image
      )}
    </div>
  );
}
