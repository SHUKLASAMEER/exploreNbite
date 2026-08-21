import Button from "./Button";
import styles from "./BookCard.module.css";

export default function BookCard({ book }) {
  return (
    <article className={styles.card}>
      {book.coverImageUrl ? (
        <div className={styles.cover}>
          <img src={book.coverImageUrl} alt={book.title} loading="lazy" />
        </div>
      ) : null}
      <h2 className={styles.title}>{book.title}</h2>
      {book.publishedYear ? <div className={styles.year}>{book.publishedYear}</div> : null}
      {book.description ? <p className={styles.description}>{book.description}</p> : null}
      {book.buyLinks && book.buyLinks.length > 0 ? (
        <div className={styles.buyLinks}>
          {book.buyLinks.map((link) => (
            <Button key={link.id} href={link.url} variant="outline">
              Buy on {link.platformName}
            </Button>
          ))}
        </div>
      ) : null}
    </article>
  );
}
