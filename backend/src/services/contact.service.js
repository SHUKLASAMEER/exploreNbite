const { prisma } = require("../config/prisma");
const { parseContactMessageInput } = require("../utils/validation/contact");
const { enforceHoneypot } = require("../utils/antiSpam");
const { sendContactEmail } = require("./mailer.service");
const settingsService = require("./settings.service");

// Public contact/work-with-me enquiry submission only. Admin read/moderate
// (list, setHandled, remove) lives in services/contactMessage.service.js
// (Phase 4) — kept separate so this file, its controller, and its route can
// ship independently of the admin Messages inbox.

// Always persists the enquiry. Email to Settings.contactEmail is *attempted*
// via services/mailer.service.js, which currently reports { delivered: false }
// because no mail transport is configured — the response tells the frontend
// the truth so the UI can say "received" rather than "sent".
async function submit(body) {
  enforceHoneypot(body);
  const data = parseContactMessageInput(body);

  const created = await prisma.contactMessage.create({
    data,
    select: { id: true, topic: true, createdAt: true },
  });

  let emailed = false;
  let emailNote;
  try {
    const settings = await settingsService.get();
    const recipient = settings?.contactEmail;
    if (recipient) {
      const result = await sendContactEmail({
        to: recipient,
        replyTo: data.email,
        subject:
          (data.topic === "work_with_me" ? "[Work With Me] " : "[Contact] ") +
          (data.subject || `Enquiry from ${data.name}`),
        text: `From: ${data.name} <${data.email}>\nTopic: ${data.topic}\n\n${data.message}`,
      });
      emailed = result.delivered;
      emailNote = result.reason;
    } else {
      emailNote = "No contact email configured in Settings.";
    }
  } catch (err) {
    // Never fail the request because email failed — it's stored regardless.
    console.error("Contact email attempt failed:", err instanceof Error ? err.message : err);
    emailNote = "Mail transport error (enquiry was still stored).";
  }

  return { id: created.id, stored: true, emailed, emailNote };
}

module.exports = { submit };
