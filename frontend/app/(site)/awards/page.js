import TwoColumnLayout from "@/components/public/TwoColumnLayout";
import Sidebar from "@/components/public/Sidebar";
import PageHeader from "@/components/public/PageHeader";
import AwardCard from "@/components/public/AwardCard";
import StateMessage from "@/components/public/StateMessage";
import { getPublicAwards } from "@/lib/publicApi";
import { buildMetadata, buildBreadcrumbJsonLd, getSeoDefaults } from "@/lib/seo";
import JsonLd from "@/components/JsonLd";
import gridStyles from "@/components/public/Grid.module.css";

export async function generateMetadata() {
  const { siteName, description, ogImage } = await getSeoDefaults();
  return buildMetadata({
    path: "/awards",
    title: "Mentions, Awards & Accolades",
    description: `Recognition, features and mentions for ${siteName}.`,
    fallbackDescription: description,
    imageAlt: `Mentions, Awards & Accolades — ${siteName}`,
    defaultImage: ogImage,
    siteName,
  });
}

// Structured Award CMS model, same reasoning as /books — see that page's
// comment.
export default async function AwardsPage() {
  const { awards, error } = await getPublicAwards();

  // Only a Home -> section breadcrumb. The Award CMS model (title, badge
  // image, optional source link, mostly-absent dates, no issuer field) has
  // no structured shape that maps cleanly to a Schema.org award/credential
  // type without inventing issuers or dates — see the SEO task report.
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Mentions, Awards & Accolades", path: "/awards" },
  ]);

  return (
    <TwoColumnLayout sidebar={<Sidebar layout="page" />}>
      <JsonLd data={breadcrumbJsonLd} />
      <PageHeader title="Mentions, Awards & Accolades" />
      {error ? (
        <StateMessage kind="error" title="Couldn't load awards.">
          {error}
        </StateMessage>
      ) : !awards || awards.length === 0 ? (
        <StateMessage kind="empty" title="No awards listed yet." />
      ) : (
        <div className={gridStyles.grid}>
          {awards.map((award) => (
            <AwardCard key={award.id} award={award} />
          ))}
        </div>
      )}
    </TwoColumnLayout>
  );
}
