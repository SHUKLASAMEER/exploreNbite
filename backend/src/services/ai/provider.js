const { env } = require("../../config/env");
const { AiUnavailableError } = require("../../utils/errors");

// ---------------------------------------------------------------------------
// AI provider abstraction (AI SEO Suggestions task).
//
// STATUS: no provider is implemented. Per explicit product decision, this
// build does NOT integrate OpenAI/Anthropic/Gemini or any other paid AI
// SDK/API, and does NOT call out to the network. PROVIDERS is deliberately
// empty. This file exists so the rest of the feature (validation, routing,
// structured-response checking, the admin UI) is built against a stable
// interface: the day a free/local provider is wired in, it is registered
// here as `PROVIDERS[name] = async (prompt, apiKey) => rawResponseText`,
// AI_PROVIDER + AI_API_KEY are set in backend/.env, and nothing above this
// file needs to change.
//
// isConfigured() reflects that honestly — it can never return true today,
// no matter what AI_PROVIDER/AI_API_KEY are set to, because there is no
// registered adapter to dispatch to.
// ---------------------------------------------------------------------------

const PROVIDERS = {
  // e.g. anthropic: async (prompt, apiKey) => { ... fetch(...) ... }
};

function isConfigured() {
  return Boolean(env.ai.provider && env.ai.apiKey && PROVIDERS[env.ai.provider]);
}

/**
 * Sends a prompt to the configured provider and returns its raw text
 * response. Throws AiUnavailableError (503) when unconfigured — which is
 * always, in this build. Never fabricates a response.
 */
async function callProvider(prompt) {
  if (!isConfigured()) {
    throw new AiUnavailableError(
      "AI suggestions are not available: no AI provider is configured for this deployment yet."
    );
  }
  // Unreachable until a provider is registered above.
  return PROVIDERS[env.ai.provider](prompt, env.ai.apiKey);
}

module.exports = { isConfigured, callProvider };
