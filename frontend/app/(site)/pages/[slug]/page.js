import { notFound } from "next/navigation";
import TwoColumnLayout from "@/components/public/TwoColumnLayout";
import Sidebar from "@/components/public/Sidebar";
import PageHeader from "@/components/public/PageHeader";
import ProseContent from "@/components/public/ProseContent";
import ContactForm from "@/components/public/ContactForm";
import StateMessage from "@/components/public/StateMessage";
import { getPublicPageBySlug } from "@/lib/publicApi";
import { buildMetadata } from "@/lib/seo";
import { stripHtmlToText } from "@/lib/text";

// Generic CMS Page route — About, Contact, Work With Me, Poetry Corner,
// etc. all live here: whatever an admin creates under Pages (Page model),
// no dedicated route per page. Content is admin-authored rich text
// (Page.content), rendered via ProseContent.
//
// Two pages also get a real enquiry form appended below their content: the
// Contact page and the Work With Me page. The Page model has no "page type"
// flag, so these are matched by slug/title convention (not a schema change
// for two special cases). Both post to the same public /api/contact
// endpoint, differing only by `topic`.
const CONTACT_SLUGS = new Set(["contact", "contact-us", "contct"]);
const WORK_WITH_ME_SLUGS = new Set(["work-with-me", "work-with-me-2", "collaborate", "hire-me"]);

function matchesPage(page, slugSet, titles) {
  if (slugSet.has(page.slug)) return true;
  const t = page.title?.trim().toLowerCase();
  return titles.includes(t);
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const { page } = await getPublicPageBySlug(slug);
  if (!page) return {};
  return buildMetadata({
    path: `/pages/${page.slug}`,
    title: page.title,
    description: stripHtmlToText(page.content) || undefined,
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

  const isContact = matchesPage(page, CONTACT_SLUGS, ["contact", "contact us"]);
  const isWorkWithMe = matchesPage(page, WORK_WITH_ME_SLUGS, ["work with me", "collaborate"]);
  const hasForm = isContact || isWorkWithMe;
  const hasBody = Boolean(stripHtmlToText(page.content));

  return (
    <TwoColumnLayout sidebar={<Sidebar layout={isContact ? "contact" : "page"} />}>
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
