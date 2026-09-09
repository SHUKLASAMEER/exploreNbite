import { getPublicSettings, getPublicMenu, resolveMenuItemHref } from "@/lib/publicApi";
import { buildSocialLinks } from "@/lib/socialLinks";
import { buildNavTree } from "@/lib/navGroups";
import HeaderClient from "./HeaderClient";

// Server half of the public Header — fetches Settings + Menu (in parallel;
// Next.js dedupes these with Footer.js's identical fetches within the same
// request) and resolves each menu item to a renderable { id, label, href },
// dropping items whose page/category target can't be resolved. The one bit
// of interactivity (active-link highlighting, via usePathname) lives in
// HeaderClient, a Client Component, since a Server Component can't read the
// current pathname.
//
// Hero tagline + image are admin-editable (Settings.tagline /
// Settings.heroImageUrl — see the admin Settings screen). These constants are
// only the fallbacks used when the field is blank: the tagline the reference
// mockups use, and the live site's own hero photo (explorenbite.com's
// `.entry-header` background) now bundled in frontend/public/ so the masthead
// never depends on the old WordPress server or renders empty.
const FALLBACK_TAGLINE = "Travel and explore off-beat destinations";
const FALLBACK_HERO_IMAGE_URL = "/hero-bhadkeshwar-mahadev.jpg";

export default async function Header() {
  const [{ settings }, { menuItems, error: menuError }] = await Promise.all([
    getPublicSettings(),
    getPublicMenu(),
  ]);

  // Keep every row (including link-less "group" parents, whose href is
  // null) and carry linkType + parentId through — buildNavTree needs them
  // to assemble the two-level dropdown structure from the DB hierarchy.
  const navItems = (menuItems ?? []).map((item) => ({
    id: item.id,
    label: item.label,
    linkType: item.linkType,
    parentId: item.parentId ?? null,
    href: resolveMenuItemHref(item),
  }));

  // Flat menu rows -> mixed list of leaves + dropdown groups, entirely from
  // the admin-managed menu_items data (see lib/navGroups.js).
  const navTree = buildNavTree(navItems);

  return (
    <HeaderClient
      siteTitle={settings?.siteTitle ?? "Explore N Bite"}
      logoUrl={settings?.logoUrl ?? null}
      tagline={settings?.tagline?.trim() || FALLBACK_TAGLINE}
      heroImageUrl={settings?.heroImageUrl?.trim() || FALLBACK_HERO_IMAGE_URL}
      navTree={navTree}
      navError={menuError}
      socialLinks={buildSocialLinks(settings)}
    />
  );
}
