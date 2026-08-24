import { notFound } from "next/navigation";
import TwoColumnLayout from "@/components/public/TwoColumnLayout";
import Sidebar from "@/components/public/Sidebar";
import PageHeader from "@/components/public/PageHeader";
import ProseContent from "@/components/public/ProseContent";
import ContactForm from "@/components/public/ContactForm";
import StateMessage from "@/components/public/StateMessage";
import { getPublicPageBySlug, getPublicSettings } from "@/lib/publicApi";

// Generic CMS Page route — About, Contact, Work With Me, Poetry Corner,
// etc. all live here: whatever an admin creates under Pages (Page model),
// no dedicated route per page. Content is admin-authored rich text
// (Page.content), rendered as-is via ProseContent — except the Contact
// page (reference/exploreNbite UI/contact.html), which shows a real Name/
// Email/Subject/Message form instead of prose. The Page model has no
// "page type" flag, so the contact form is triggered by slug/title
// convention (a Page an admin creates with slug "contact" or titled
// "Contact") rather than a schema change for a one-off special case.
const CONTACT_SLUGS = new Set(["contact", "contact-us", "contct"]);

function isContactPage(page) {
  if (CONTACT_SLUGS.has(page.slug)) return true;
  return page.title?.trim().toLowerCase() === "contact";
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const { page } = await getPublicPageBySlug(slug);
  if (!page) return {};
  return { title: `${page.title} | Explore N Bite` };
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

  const contactPage = isContactPage(page);
  const sidebarLayout = contactPage ? "contact" : "page";

  return (
    <TwoColumnLayout sidebar={<Sidebar layout={sidebarLayout} />}>
      <PageHeader title={page.title} />
      {contactPage ? <ContactFormSection /> : <ProseContent html={page.content} />}
    </TwoColumnLayout>
  );
}

async function ContactFormSection() {
  const { settings } = await getPublicSettings();
  return <ContactForm recipientEmail={settings?.contactEmail ?? null} />;
}
