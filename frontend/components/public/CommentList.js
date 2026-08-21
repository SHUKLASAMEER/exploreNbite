import { formatDate } from "@/lib/formatDate";
import styles from "./Comments.module.css";

// Flat list — the schema deliberately has no parent_comment_id
// (prisma/schema.prisma: "Comments are flat, no threading"), so unlike the
// live WordPress site's nested reply threads, every approved comment here
// renders at the same level in chronological order.
export default function CommentList({ comments }) {
  if (!comments || comments.length === 0) {
    return null;
  }

  return (
    <ul className={styles.list}>
      {comments.map((comment) => (
        <li key={comment.id} className={styles.comment}>
          <span className={styles.avatar} aria-hidden="true">
            {comment.readerName?.[0] ?? "?"}
          </span>
          <div className={styles.body}>
            <p className={styles.author}>{comment.readerName}</p>
            <p className={styles.date}>{formatDate(comment.createdAt)}</p>
            <p className={styles.message}>{comment.message}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
