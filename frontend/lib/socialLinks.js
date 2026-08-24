// Shared derivation of social links from Settings — used by Header (hero
// social strip) and Footer, so both read the same three optional Settings
// fields the same way instead of each re-deriving it slightly differently.
// Each caller still renders its own markup/style — only the data shape is
// shared here.
export function buildSocialLinks(settings) {
  return [
    settings?.socialFacebook ? { label: "FB", name: "Facebook", href: settings.socialFacebook } : null,
    settings?.socialTwitter ? { label: "TW", name: "Twitter", href: settings.socialTwitter } : null,
    settings?.socialInstagram ? { label: "IG", name: "Instagram", href: settings.socialInstagram } : null,
  ].filter(Boolean);
}
