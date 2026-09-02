const { env } = require("../config/env");

// Mail transport seam for contact-form enquiries.
//
// CURRENT STATE: there is NO mail library in the project (no nodemailer, no
// ESP SDK) and no SMTP credentials configured. This module therefore never
// sends anything — it logs the enquiry server-side and returns
// { delivered: false, reason }. The contact endpoint still persists every
// enquiry to the database, and the API/UI report "received", never "sent".
//
// TO ENABLE REAL DELIVERY (follow-up, needs approval):
//   1. add a transport dependency (e.g. `nodemailer`)
//   2. set SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_FROM
//      (already read by config/env.js into env.smtp)
//   3. implement the `send` branch below using that transport
// Until then this stays a no-op by design — it must not fake success.

const SMTP_CONFIGURED = Boolean(env.smtp.host && env.smtp.from);

async function sendContactEmail({ to, replyTo, subject, text }) {
  if (!SMTP_CONFIGURED) {
    console.info(
      `[mailer] enquiry stored but NOT emailed (no SMTP configured). Would send to=${to} replyTo=${replyTo} subject="${subject}"`
    );
    return {
      delivered: false,
      reason: "No mail transport configured (missing `nodemailer` dependency and SMTP_* env vars).",
    };
  }

  // Intentionally not implemented — see the header comment. Reaching here
  // means SMTP_* is set but the transport code was never added; fail loud
  // in logs rather than silently dropping mail.
  console.error("[mailer] SMTP_* is configured but no transport implementation exists. Enquiry not emailed.");
  return {
    delivered: false,
    reason: "SMTP configured but transport not implemented (add a mail library and wire it here).",
  };
}

module.exports = { sendContactEmail, SMTP_CONFIGURED };
