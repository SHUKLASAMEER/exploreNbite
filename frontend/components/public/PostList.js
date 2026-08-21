import PostCard from "./PostCard";
import StateMessage from "./StateMessage";

// Shared "list of post cards, or an empty/error state" body — used by Home,
// category archive, author archive, and search results so each page only
// has to decide *which* posts to fetch, not how to render the resulting
// list/empty/error states.
export default function PostList({ posts, error, emptyTitle = "No posts yet.", emptyText }) {
  if (error) {
    return (
      <StateMessage kind="error" title="Couldn't load posts.">
        {error}
      </StateMessage>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <StateMessage kind="empty" title={emptyTitle}>
        {emptyText}
      </StateMessage>
    );
  }

  return (
    <div>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
