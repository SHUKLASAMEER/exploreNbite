// Escapes the SQL LIKE metacharacters in user input so they match
// literally. Prisma's `contains` wraps the value as `%value%` but does not
// escape it, so a raw `%` or `_` from a visitor would act as a wildcard
// (`?search=%` matched every post, `co_rg` matched "Coorg").
//
// Backslash is MySQL's default LIKE escape character, so it is escaped
// first (a literal `\` becomes `\\`), then `%` -> `\%` and `_` -> `\_`.
// Text without these characters is returned unchanged.
function escapeLike(value) {
  return String(value).replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

module.exports = { escapeLike };
