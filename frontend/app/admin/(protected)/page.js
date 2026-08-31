import Link from "next/link";
import { FileText, FolderTree, MessageSquare, Mail, Users, BookOpen, Award } from "lucide-react";
import { serverApiFetch } from "@/lib/serverApi";
import PageHeader from "@/components/admin/ui/PageHeader";
import StatCard from "@/components/admin/ui/StatCard";
import EmptyState from "@/components/admin/ui/EmptyState";
import styles from "./page.module.css";

// A metric that fails to load renders "—", never a fabricated number.
async function safeJson(path) {
  try {
    const res = await serverApiFetch(path);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function formatDate(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default async function AdminDashboardPage() {
  const [posts, categories, comments, subscribers, authors, books, awards, recentPosts, recentComments] =
    await Promise.all([
      safeJson("/api/admin/posts?limit=1"),
      safeJson("/api/admin/categories"),
      safeJson("/api/admin/comments?limit=1"),
      safeJson("/api/admin/subscribers?limit=1"),
      safeJson("/api/admin/authors"),
      safeJson("/api/admin/books"),
      safeJson("/api/admin/awards"),
      safeJson("/api/admin/posts?limit=5"),
      safeJson("/api/admin/comments?limit=5"),
    ]);

  const stats = [
    { label: "Total Posts", value: posts?.pagination?.total ?? "—", href: "/admin/posts", icon: FileText },
    { label: "Categories", value: categories?.categories?.length ?? "—", href: "/admin/categories", icon: FolderTree },
    { label: "Comments", value: comments?.pagination?.total ?? "—", href: "/admin/comments", icon: MessageSquare },
    { label: "Subscribers", value: subscribers?.pagination?.total ?? "—", href: "/admin/subscribers", icon: Mail },
    { label: "Authors", value: authors?.authors?.length ?? "—", href: "/admin/authors", icon: Users },
    { label: "Books", value: books?.books?.length ?? "—", href: "/admin/books", icon: BookOpen },
    { label: "Awards", value: awards?.awards?.length ?? "—", href: "/admin/awards", icon: Award },
  ];

  const recentPostsList = recentPosts?.data ?? [];
  const recentCommentsList = recentComments?.data ?? [];

  return (
    <div>
      <PageHeader title="Dashboard" description="An overview of Explore N Bite's content and activity." />

      <div className={styles.statGrid}>
        {stats.map((stat) => (
          <StatCard key={stat.label} icon={stat.icon} label={stat.label} value={stat.value} href={stat.href} />
        ))}
      </div>

      <div className={styles.panels}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Recent Posts</h2>
            <Link href="/admin/posts" className={styles.panelLink}>
              View all
            </Link>
          </div>
          {recentPostsList.length === 0 ? (
            <EmptyState title="No posts yet" description="Published and draft posts will show up here." />
          ) : (
            <ul className={styles.list}>
              {recentPostsList.map((post) => (
                <li key={post.id} className={styles.listRow}>
                  <div className={styles.listMain}>
                    <span className={styles.listTitle}>{post.title}</span>
                    <span className={styles.listMeta}>
                      {post.category?.name} · {post.status}
                    </span>
                  </div>
                  <span className={styles.listDate}>{formatDate(post.publishDate)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Recent Comments</h2>
            <Link href="/admin/comments" className={styles.panelLink}>
              View all
            </Link>
          </div>
          {recentCommentsList.length === 0 ? (
            <EmptyState title="No comments yet" description="Reader comments will show up here." />
          ) : (
            <ul className={styles.list}>
              {recentCommentsList.map((comment) => (
                <li key={comment.id} className={styles.listRow}>
                  <div className={styles.listMain}>
                    <span className={styles.listTitle}>{comment.readerName}</span>
                    <span className={styles.listMeta}>
                      on {comment.post?.title} · {comment.status}
                    </span>
                  </div>
                  <span className={styles.listDate}>{formatDate(comment.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
