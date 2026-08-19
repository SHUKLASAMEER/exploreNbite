import { getPublicSettings, getPublicMenu, resolveMenuItemHref } from "@/lib/publicApi";
import HeaderClient from "./HeaderClient";

// Server half of the public Header — fetches Settings + Menu (in parallel;
// Next.js dedupes these with Footer.js's identical fetches within the same
// request) and resolves each menu item to a renderable { id, label, href },
// dropping items whose page/category target can't be resolved. All
// interactivity (the mobile menu toggle) lives in HeaderClient, a Client
// Component, since a Server Component can't hold browser state.
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
      navItems={navItems}
      navError={menuError}
    />
  );
}
