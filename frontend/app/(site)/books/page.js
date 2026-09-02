import TwoColumnLayout from "@/components/public/TwoColumnLayout";
import Sidebar from "@/components/public/Sidebar";
import PageHeader from "@/components/public/PageHeader";
import BookCard from "@/components/public/BookCard";
import StateMessage from "@/components/public/StateMessage";
import { getPublicBooks } from "@/lib/publicApi";
import { buildMetadata } from "@/lib/seo";
import gridStyles from "@/components/public/Grid.module.css";

export const metadata = buildMetadata({
  path: "/books",
  title: "My Books",
  description: "Books by Sweta Papaiyawala — where to read and buy them.",
});

// Structured Book CMS model (title, cover, description, buy links) rather
// than the live site's freeform "My Books" content page — Phase 3's brief
// is explicit that an existing structured CMS model takes priority over
// matching a specific page's ad hoc WordPress layout.
export default async function BooksPage() {
  const { books, error } = await getPublicBooks();

  return (
    <TwoColumnLayout sidebar={<Sidebar layout="page" />}>
      <PageHeader title="My Books" />
      {error ? (
        <StateMessage kind="error" title="Couldn't load books.">
          {error}
        </StateMessage>
      ) : !books || books.length === 0 ? (
        <StateMessage kind="empty" title="No books published yet." />
      ) : (
        <div className={gridStyles.grid}>
          {books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </TwoColumnLayout>
  );
}
