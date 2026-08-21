import { formatDate } from "@/lib/formatDate";
import styles from "./AwardCard.module.css";

export default function AwardCard({ award }) {
  return (
    <article className={styles.card}>
      {award.imageUrl ? (
        <div className={styles.image}>
          <img src={award.imageUrl} alt={award.title} loading="lazy" />
        </div>
      ) : null}
      <h2 className={styles.title}>{award.title}</h2>
      {award.dateReceived ? <div className={styles.date}>{formatDate(award.dateReceived)}</div> : null}
      {award.sourceLink ? (
        <a href={award.sourceLink} target="_blank" rel="noopener noreferrer" className={styles.link}>
          View Source
        </a>
      ) : null}
    </article>
  );
}
