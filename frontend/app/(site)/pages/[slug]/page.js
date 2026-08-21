import { notFound } from "next/navigation";
import TwoColumnLayout from "@/components/public/TwoColumnLayout";
import Sidebar from "@/components/public/Sidebar";
import PageHeader from "@/components/public/PageHeader";
import ProseContent from "@/components/public/ProseContent";
import StateMessage from "@/components/public/StateMessage";
import { getPublicPageBySlug } from "@/lib/publicApi";

// Generic CMS Page route — About, Contact, Work With Me, Poetry Corner,
// etc. all live here: whatever an admin creates under Pages (Page model),
// no dedicated route per page. Content is admin-authored rich text
// (Page.content), rendered as-is via ProseContent.
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
      <TwoColumnLayout sidebar={<Sidebar />}>
        <StateMessage kind="error" title="Couldn't load this page.">
          {error}
        </StateMessage>
      </TwoColumnLayout>
    );
  }

  return (
    <TwoColumnLayout sidebar={<Sidebar />}>
      <PageHeader title={page.title} />
      <ProseContent html={page.content} />
    </TwoColumnLayout>
  );
}
