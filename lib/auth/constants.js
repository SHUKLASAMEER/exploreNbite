// Zero-dependency constant shared between lib/auth/session.js (which uses
// next/headers, valid in Server Components/Route Handlers) and proxy.js
// (which reads cookies straight off NextRequest and must not import
// next/headers). Keeping this in its own file lets both import just the
// name without pulling in an API that isn't available in the other context.
export const SESSION_COOKIE_NAME = "admin_session";
