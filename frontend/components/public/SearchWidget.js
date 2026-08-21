import WidgetTitle from "./WidgetTitle";
import styles from "./Sidebar.module.css";

// Plain GET form (no client JS needed) — submits to /search?q=..., which
// reuses the same public posts list endpoint's `search` param.
export default function SearchWidget() {
  return (
    <div className={styles.widget}>
      <WidgetTitle>Search</WidgetTitle>
      <form action="/search" method="get" className={styles.searchForm}>
        <label htmlFor="sidebar-search" className="visually-hidden" style={{ display: "none" }}>
          Search
        </label>
        <input
          id="sidebar-search"
          type="search"
          name="q"
          placeholder="Search..."
          className={styles.searchInput}
        />
        <button type="submit" className={styles.searchSubmit} aria-label="Search">
          ⌕
        </button>
      </form>
    </div>
  );
}
