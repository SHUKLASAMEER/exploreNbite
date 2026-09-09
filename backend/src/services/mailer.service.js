const nodemailer = require("nodemailer");
const { env } = require("../config/env");

// Mail transport seam for contact-form enquiries.
//
// Two modes, chosen entirely by environment (config/env.js -> env.smtp):
//
//   • NOT configured (SMTP_HOST or SMTP_FROM missing) — the default. Nothing
//     is sent. sendContactEmail() returns { delivered: false, reason }. The
//     contact endpoint still persists every enquiry and the API/UI report
//     "received", never "sent". No behaviour change from before.
//
//   • Configured — a generic SMTP transport (nodemailer, the standard
//     minimal SMTP client; NOT a provider SDK). Delivery is ATTEMPTED. On
//     success: { delivered: true, messageId }. On any failure the enquiry is
//     ALREADY saved, so we swallow the error, log it server-side WITHOUT
//     credentials, and return { delivered: false, reason } — a failed email
//     never turns a valid saved enquiry into a failed HTTP request.
//
// Credentials (SMTP_USER / SMTP_PASS) are read from env only, never logged,
// never returned to the client.

const SMTP_CONFIGURED = env.smtp.configured;

let transportPromise = null;

// Lazily build + verify the transport once, then reuse it. `auth` is only
// set when a username is present — some relays authenticate by IP allow-list
// and reject an empty AUTH.
function getTransport() {
  if (!transportPromise) {
    const options = {
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure, // true => implicit TLS (465); false => STARTTLS
    };
    if (env.smtp.user) {
      options.auth = { user: env.smtp.user, pass: env.smtp.pass || "" };
    }
    const transport = nodemailer.createTransport(options);
    transportPromise = transport
      .verify()
      .then(() => transport)
      .catch((err) => {
        // Reset so a later request can retry (e.g. transient DNS/network).
        transportPromise = null;
        throw err;
      });
  }
  return transportPromise;
}

// Redact the username if it happens to appear in an SMTP error string, so a
// log line can't leak credentials. Plain string replace — no regex.
function safeError(err) {
  let msg = err instanceof Error ? err.message : String(err);
  if (env.smtp.user) msg = msg.split(env.smtp.user).join("<user>");
  return msg;
}

async function sendContactEmail({ to, replyTo, subject, text }) {
  if (!SMTP_CONFIGURED) {
    console.info(
      `[mailer] enquiry stored, not emailed (SMTP not configured). to=${to} subject="${subject}"`
    );
    return {
      delivered: false,
      reason: "No mail transport configured (set SMTP_HOST / SMTP_FROM to enable delivery).",
    };
  }

  try {
    const transport = await getTransport();
    const info = await transport.sendMail({
      from: env.smtp.from,
      to,
      replyTo: replyTo || undefined,
      subject,
      text,
    });
    console.info(`[mailer] enquiry emailed to=${to} messageId=${info.messageId}`);
    return { delivered: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[mailer] delivery failed via ${env.smtp.host}:${env.smtp.port} — ${safeError(err)}`);
    return {
      delivered: false,
      reason: "The enquiry was saved, but the notification email could not be delivered.",
    };
  }
}

// Optional health probe — connect + AUTH without sending anything. Used by
// nothing critical; handy for a deploy smoke test.
async function verifyTransport() {
  if (!SMTP_CONFIGURED) return { ok: false, reason: "SMTP not configured." };
  try {
    await getTransport();
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: safeError(err) };
  }
}

module.exports = { sendContactEmail, verifyTransport, SMTP_CONFIGURED };
