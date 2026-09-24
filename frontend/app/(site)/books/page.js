import TwoColumnLayout from "@/components/public/TwoColumnLayout";
import Sidebar from "@/components/public/Sidebar";
import PageHeader from "@/components/public/PageHeader";
import Breadcrumbs from "@/components/public/Breadcrumbs";
import BookCard from "@/components/public/BookCard";
import StateMessage from "@/components/public/StateMessage";
import { getPublicBooks } from "@/lib/publicApi";
import { buildMetadata, buildBreadcrumbJsonLd, buildBookListJsonLd, getSeoDefaults } from "@/lib/seo";
import JsonLd from "@/components/JsonLd";
import gridStyles from "@/components/public/Grid.module.css";

export async function generateMetadata() {
  const { siteName, description, ogImage } = await getSeoDefaults();
  return buildMetadata({
    path: "/books",
    title: "My Books",
    description,
    fallbackDescription: description,
    imageAlt: `My Books — ${siteName}`,
    defaultImage: ogImage,
    siteName,
  });
}

// Structured Book CMS model (title, cover, description, buy links) rather
// than the live site's freeform "My Books" content page — Phase 3's brief
// is explicit that an existing structured CMS model takes priority over
// matching a specific page's ad hoc WordPress layout.
export default async function BooksPage() {
  const { books, error } = await getPublicBooks();

  // Home -> My Books breadcrumb + an ItemList of Book entities (real Book
  // CMS model: title / cover / description / year / buy links).
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "My Books", path: "/books" },
  ];
  const jsonLd = [buildBreadcrumbJsonLd(crumbs), buildBookListJsonLd({ books, path: "/books" })];

  return (
    <TwoColumnLayout sidebar={<Sidebar layout="page" />}>
      <JsonLd data={jsonLd} />
      <Breadcrumbs crumbs={crumbs} />
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
