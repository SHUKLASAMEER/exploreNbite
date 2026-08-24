import Link from "next/link";
import WidgetTitle from "./WidgetTitle";
import styles from "./Sidebar.module.css";

// "Recent Posts" sidebar list (reference/exploreNbite UI: `.recent-list`) —
// plain title links to the most recently published posts. The mockup's
// list items are static <p> text with no link, but since real post data is
// available here, wrapping each title in a link is a functional
// improvement that renders identically (the mockup's global `a { color:
// inherit; text-decoration: none }` rule means a link looks exactly like
// its plain-text paragraph).
export default function RecentPostsWidget({ posts }) {
  if (!posts || posts.length === 0) return null;

  return (
    <div className={styles.widget}>
      <WidgetTitle>Recent Posts</WidgetTitle>
      <ul className={styles.recentList}>
        {posts.map((post) => (
          <li key={post.id}>
            <Link href={`/posts/${post.slug}`}>{post.title}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
