import { getPublicSettings, getPublicAuthors, getPublicAwards } from "@/lib/publicApi";
import SearchWidget from "./SearchWidget";
import SubscribeWidget from "./SubscribeWidget";
import AuthorWidget from "./AuthorWidget";
import AwardWidget from "./AwardWidget";
import SocialWidget from "./SocialWidget";

// Self-fetching sidebar — every page that needs it (Home, category, single
// post, search) just renders <Sidebar /> instead of each fetching
// settings/authors/awards itself. Matches the live site's sidebar, which is
// the same global widget stack on every page (not contextual per post).
// Widgets fail independently: one missing/failed dataset (e.g. no awards
// yet) never blanks the rest of the sidebar.
export default async function Sidebar() {
  const [{ settings }, { authors }, { awards }] = await Promise.all([
    getPublicSettings(),
    getPublicAuthors(),
    getPublicAwards(),
  ]);

  const primaryAuthor = authors?.[0] ?? null;
  const latestAward = awards?.[0] ?? null;

  return (
    <div>
      <SearchWidget />
      <AuthorWidget author={primaryAuthor} />
      <SubscribeWidget />
      <AwardWidget award={latestAward} />
      <SocialWidget settings={settings} />
    </div>
  );
}
