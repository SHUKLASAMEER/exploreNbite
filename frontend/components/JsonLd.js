import { jsonLdScript } from "@/lib/seo";

// Renders one or more Schema.org JSON-LD objects as
// <script type="application/ld+json"> tags. Server Component — the objects
// are built from CMS data by the buildXJsonLd() helpers in lib/seo.js.
//
// `data` may be a single object, an array, or contain nulls (a builder
// returns null when a block isn't meaningful for the page); nulls are
// dropped. jsonLdScript() JSON-serialises and escapes "<" so a value can
// never break out of the <script> element.
export default function JsonLd({ data }) {
  const items = (Array.isArray(data) ? data : [data]).filter(Boolean);
  if (items.length === 0) return null;
  return (
    <>
      {items.map((item, i) => (
        <script
          // Structured-data script order is stable per render; index key is fine.
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(item) }}
        />
      ))}
    </>
  );
}
