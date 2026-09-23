import TwoColumnLayout from "@/components/public/TwoColumnLayout";
import Sidebar from "@/components/public/Sidebar";
import PageHeader from "@/components/public/PageHeader";
import Button from "@/components/public/Button";
import searchStyles from "@/components/public/Sidebar.module.css";
import styles from "./not-found.module.css";

// Public-site 404 — rendered (via Next's notFound()) whenever a post,
// category, page, or author lookup genuinely doesn't exist (see the
// getPublic*() calls in lib/publicApi.js), and for any public URL that
// matches no route at all (app/(site)/[...notFound]/page.js). Scoped to
// app/(site)/, so it renders inside app/(site)/layout.js (Header/Footer stay
// visible) instead of falling back to Next's unstyled default. Real /admin
// routes are unaffected; an unknown /admin/* URL also reaches the catch-all
// and gets this page (still HTTP 404).
//
// The search form is the same plain GET to /search?q=... as the sidebar's
// SearchWidget, reusing its styles, with its own id and a visible label.
export default function PublicNotFound() {
  return (
    <TwoColumnLayout sidebar={<Sidebar />}>
      <PageHeader
        title={
          <>
            <span className={styles.code}>404</span> Page not found
          </>
        }
      />
      <p className={styles.text}>The page you&apos;re looking for doesn&apos;t exist or may have moved.</p>
      <Button href="/" variant="solid">
        Back to Home
      </Button>
      <form action="/search" method="get" role="search" className={styles.search}>
        <label htmlFor="not-found-search" className={styles.searchLabel}>
          Search the site
        </label>
        <div className={searchStyles.searchForm}>
          <input
            id="not-found-search"
            type="search"
            name="q"
            placeholder="Search..."
            className={searchStyles.searchInput}
          />
          <button type="submit" className={searchStyles.searchSubmit} aria-label="Search">
            ⌕
          </button>
        </div>
      </form>
    </TwoColumnLayout>
  );
}
