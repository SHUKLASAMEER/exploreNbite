import Image from "next/image";
import logoImage from "@/app/icon.jpeg";

// Single source of truth for the Explore N Bite logo image — reused for the
// header/navbar and, via app/icon.jpeg, the browser favicon. Don't reference
// the image path anywhere else; import this component instead.
//
// `src` (optional): the admin-configured Settings.logoUrl. When it's a safe
// URL the header shows that image instead of the bundled asset; when it's
// empty/invalid the bundled asset is used, so the logo never disappears just
// because no custom one was set. next/image can't take an arbitrary runtime
// remote URL without host allow-listing, so the custom path renders a plain
// <img> (same box size); the default keeps next/image's static optimization.

// Only http(s) absolute URLs or root-relative paths — never javascript:,
// data:, or other schemes. Mirrors the URL rules used elsewhere in the
// project (utils/validation/menuItems.js).
function isSafeLogoSrc(value) {
  if (typeof value !== "string") return false;
  const v = value.trim();
  if (!v) return false;
  if (/^\/(?!\/)/.test(v)) return !/\s/.test(v); // root-relative "/uploads/..."
  try {
    return /^https?:$/.test(new URL(v).protocol);
  } catch {
    return false;
  }
}

export default function Logo({ src, style, priority = false, ...props }) {
  const mergedStyle = { height: "48px", width: "auto", ...style };

  if (isSafeLogoSrc(src)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src.trim()} alt="Explore N Bite" style={mergedStyle} {...props} />;
  }

  return <Image src={logoImage} alt="Explore N Bite" priority={priority} style={mergedStyle} {...props} />;
}
