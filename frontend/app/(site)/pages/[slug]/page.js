import { notFound } from "next/navigation";
import TwoColumnLayout from "@/components/public/TwoColumnLayout";
import Sidebar from "@/components/public/Sidebar";
import PageHeader from "@/components/public/PageHeader";
import ProseContent from "@/components/public/ProseContent";
import ContactForm from "@/components/public/ContactForm";
import StateMessage from "@/components/public/StateMessage";
import { getPublicPageBySlug } from "@/lib/publicApi";
import { buildMetadata, buildBreadcrumbJsonLd, getSeoDefaults } from "@/lib/seo";
import JsonLd from "@/components/JsonLd";
import { stripHtmlToText } from "@/lib/text";

// Generic CMS Page route — About, Contact, Work With Me, Poetry Corner,
// etc. all live here: whatever an admin creates under Pages (Page model),
// no dedicated route per page. Content is admin-authored rich text
// (Page.content), rendered via ProseContent.
//
// Two pages also get a real enquiry form appended below their content: the
// Contact page and the Work With Me page. Which page is which is set
// explicitly in the admin (Page.pageType — "contact" / "work_with_me" /
// "standard"), NOT inferred from the slug or title, so renaming a page never
// removes its form. Both forms post to the same public /api/contact endpoint,
// differing only by `topic`.

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const { page } = await getPublicPageBySlug(slug);
  if (!page) return {};
  const { siteName, description, ogImage } = await getSeoDefaults();
  // Pages built around the enquiry form (Contact, Work With Me) can have
  // almost no body text — Contact's is just "Contact" — so they also offer a
  // description of what the page actually does.
  const hasForm = page.pageType === "contact" || page.pageType === "work_with_me";
  return buildMetadata({
    path: `/pages/${page.slug}`,
    title: page.title,
    description: [
      page.content,
      hasForm ? `${page.title} — use the form on this page to get in touch with ${siteName}.` : null,
    ],
    fallbackDescription: description,
    imageAlt: `${page.title} — ${siteName}`,
    defaultImage: ogImage,
    siteName,
  });
}

export default async function CmsPage({ params }) {
  const { slug } = await params;
  const { page, error, notFound: pageNotFound } = await getPublicPageBySlug(slug);

  if (pageNotFound) {
    notFound();
  }

  if (error || !page) {
    return (
      <TwoColumnLayout sidebar={<Sidebar layout="page" />}>
        <StateMessage kind="error" title="Couldn't load this page.">
          {error}
        </StateMessage>
      </TwoColumnLayout>
    );
  }

  const isContact = page.pageType === "contact";
  const isWorkWithMe = page.pageType === "work_with_me";
  const hasForm = isContact || isWorkWithMe;
  const hasBody = Boolean(stripHtmlToText(page.content));

  // Home -> Page breadcrumb. Pages are a flat collection (no nesting), so
  // that two-level trail is the whole meaningful hierarchy.
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: page.title, path: `/pages/${page.slug}` },
  ]);

  return (
    <TwoColumnLayout sidebar={<Sidebar layout={isContact ? "contact" : "page"} />}>
      <JsonLd data={breadcrumbJsonLd} />
      <PageHeader title={page.title} />
      {hasBody ? <ProseContent html={page.content} /> : null}
      {isWorkWithMe ? (
        <ContactForm topic="work_with_me" submitLabel="Send Enquiry" />
      ) : isContact ? (
        <ContactForm topic="contact" submitLabel="Send" />
      ) : null}
      {!hasBody && !hasForm ? (
        <StateMessage kind="empty" title="This page has no content yet." />
      ) : null}
    </TwoColumnLayout>
  );
}
