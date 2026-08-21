import TwoColumnLayout from "@/components/public/TwoColumnLayout";
import Sidebar from "@/components/public/Sidebar";
import StateMessage from "@/components/public/StateMessage";
import Button from "@/components/public/Button";

// Public-site 404 — rendered (via Next's notFound()) whenever a post,
// category, page, or author lookup genuinely doesn't exist (see the
// getPublic*() calls in lib/publicApi.js). Scoped to app/(site)/, so it
// still renders inside app/(site)/layout.js (Header/Footer stay visible)
// instead of falling back to Next's unstyled default — /admin is untouched,
// it has no not-found.js of its own.
export default function PublicNotFound() {
  return (
    <TwoColumnLayout sidebar={<Sidebar />}>
      <StateMessage kind="empty" title="Page not found.">
        The page you&apos;re looking for doesn&apos;t exist or may have been moved.
      </StateMessage>
      <div style={{ textAlign: "center", marginTop: "1rem" }}>
        <Button href="/" variant="solid">
          Back to Home
        </Button>
      </div>
    </TwoColumnLayout>
  );
}
