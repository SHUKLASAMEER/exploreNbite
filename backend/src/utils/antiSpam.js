const { ValidationError } = require("./errors");

// Honeypot: public forms render a visually-hidden field named "website"
// (see the frontend form components). A real user never sees or fills it;
// most bots fill every field. If it arrives non-empty we reject the
// submission with the same generic validation error shape as any other bad
// input — no signal to the bot that it was detected as spam.
//
// The field is stripped from the body here so downstream validators/services
// never see it and can't accidentally persist it.
function enforceHoneypot(body) {
  const input = body && typeof body === "object" ? body : {};
  const trap = typeof input.website === "string" ? input.website.trim() : "";
  // also delete common alternates in case a form is wired slightly differently
  delete input.website;
  delete input.url_field;
  if (trap) {
    throw new ValidationError("Your submission could not be processed.");
  }
}

module.exports = { enforceHoneypot };
