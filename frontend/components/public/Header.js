import { getPublicSettings, getPublicMenu, resolveMenuItemHref } from "@/lib/publicApi";
import { buildSocialLinks } from "@/lib/socialLinks";
import HeaderClient from "./HeaderClient";

// Server half of the public Header — fetches Settings + Menu (in parallel;
// Next.js dedupes these with Footer.js's identical fetches within the same
// request) and resolves each menu item to a renderable { id, label, href },
// dropping items whose page/category target can't be resolved. The one bit
// of interactivity (active-link highlighting, via usePathname) lives in
// HeaderClient, a Client Component, since a Server Component can't read the
// current pathname.
//
// The social-icon strip is derived from the same Settings fetch already
// happening here — no extra request. Settings has no tagline field
// (prisma/schema.prisma), so the tagline below is the same static copy the
// reference mockups use, not admin-editable content.
const TAGLINE = "Travel and explore off-beat destinations";

// Settings has no hero-image field either (same reasoning as TAGLINE above —
// this is fixed brand content, not admin-editable CMS data, so adding a
// schema column for one hardcoded image isn't warranted). This is the real
// photo the live site itself uses for its hero (explorenbite.com's own
// `.entry-header { background-image: url(...) }`, verified against the
// live HTML/CSS) — not a substitute or generated image.
const HERO_IMAGE_URL = "https://www.explorenbite.com/wp-content/uploads/2024/03/cropped-bhadkeshwar-mahadev.jpg";

export default async function Header() {
  const [{ settings }, { menuItems, error: menuError }] = await Promise.all([
    getPublicSettings(),
    getPublicMenu(),
  ]);

  const navItems = (menuItems ?? [])
    .map((item) => ({ id: item.id, label: item.label, href: resolveMenuItemHref(item) }))
    .filter((item) => Boolean(item.href));

  return (
    <HeaderClient
      siteTitle={settings?.siteTitle ?? "Explore N Bite"}
      tagline={TAGLINE}
      heroImageUrl={HERO_IMAGE_URL}
      navItems={navItems}
      navError={menuError}
      socialLinks={buildSocialLinks(settings)}
    />
  );
}
