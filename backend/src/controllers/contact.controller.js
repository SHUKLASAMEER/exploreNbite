const { asyncHandler } = require("../utils/asyncHandler");
const contactService = require("../services/contact.service");

// Public — no req.admin. Rate-limited + honeypot-guarded at the route/service
// layer. Returns { stored, emailed } so the frontend shows an honest
// confirmation ("received", never "sent", unless email actually went out).
const submitPublic = asyncHandler(async (req, res) => {
  const result = await contactService.submit(req.body ?? {});
  res.status(201).json(result);
});

module.exports = { submitPublic };
