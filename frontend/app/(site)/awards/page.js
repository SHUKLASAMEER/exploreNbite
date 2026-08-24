import TwoColumnLayout from "@/components/public/TwoColumnLayout";
import Sidebar from "@/components/public/Sidebar";
import PageHeader from "@/components/public/PageHeader";
import AwardCard from "@/components/public/AwardCard";
import StateMessage from "@/components/public/StateMessage";
import { getPublicAwards } from "@/lib/publicApi";
import gridStyles from "@/components/public/Grid.module.css";

export const metadata = {
  title: "Mentions, Awards & Accolades | Explore N Bite",
};

// Structured Award CMS model, same reasoning as /books — see that page's
// comment.
export default async function AwardsPage() {
  const { awards, error } = await getPublicAwards();

  return (
    <TwoColumnLayout sidebar={<Sidebar layout="page" />}>
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
