// Deterministic, client-side "Suggested New Tags" generator for the post
// editor. Produces a small set of high-confidence candidate tag names from
// the current post context (title / short description / HTML content).
//
// It NEVER touches the network, NEVER creates a tag, and NEVER attaches
// anything to the post — it only returns strings. A candidate becomes a
// real tag only when the admin explicitly clicks "Create".

import { STOP_WORDS, tagSlug } from "./rankTags";

const MAX_CANDIDATES = 10;
const MIN_SCORE = 10;
const MAX_WORDS = 3;

// Function/connector words that shouldn't sit inside or at the edge of a
// candidate phrase, on top of the shared STOP_WORDS list.
const EXTRA_STOP_WORDS = new Set([
  "through", "near", "around", "along", "across", "behind", "beyond",
  "within", "without", "upon", "onto", "between", "among", "amongst",
  "while", "whilst", "when", "where", "which", "who", "whom", "whose",
  "what", "why", "how", "there", "here", "also", "just", "very", "much",
  "many", "few", "lot", "lots", "still", "even", "again", "ever", "never",
  "always", "often", "sometimes", "etc",
]);

function isStopWord(lower) {
  return STOP_WORDS.has(lower) || EXTRA_STOP_WORDS.has(lower);
}

// Fine inside a phrase ("rajasthan travel"), but a weak stand-alone tag.
const WEAK_SOLO_WORDS = new Set([
  "best", "top", "guide", "guides", "tips", "tip", "list", "lists", "places",
  "place", "visit", "visiting", "things", "thing", "way", "ways", "trip",
  "trips", "travel", "tour", "tours", "review", "reviews", "day", "days",
  "week", "weeks", "ultimate", "complete", "essential", "beautiful",
  "amazing", "perfect", "great", "good", "nice", "new", "old", "world",
  "year", "years", "time", "times", "today", "everything", "guide",
]);

const URL_RE = /\bhttps?:\/\/\S+|\bwww\.\S+|\S+@\S+\.\S+/gi;
// Sentence-ish splitter: strong punctuation and structural characters. A
// comma also ends a phrase — list items ("Jaisalmer Fort, desert safari")
// must not merge into one candidate.
const SENTENCE_SPLIT_RE = /[.!?,\n\r;:•|/()[\]{}"“”–—]+|\s&\s|\s-\s/;
const WORD_RE = /[A-Za-z][A-Za-z'’-]*|\d[\d.,]*/g;
// Block-level HTML boundaries become hard breaks so a heading never merges
// into the paragraph that follows it.
const BLOCK_BOUNDARY_RE =
  /<\/(p|h[1-6]|li|ul|ol|div|section|article|blockquote|figure|figcaption|pre|table|tr|td|th|header|footer|aside|main)\s*>|<br\s*\/?>|<li\b[^>]*>/gi;

function htmlToBrokenText(value) {
  return String(value || "")
    .replace(BLOCK_BOUNDARY_RE, " .\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#8217;|&#8216;|&rsquo;|&lsquo;/gi, "'")
    .replace(/&#8220;|&#8221;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/[ \t]+/g, " ");
}

function cleanText(value) {
  return String(value || "").replace(URL_RE, " ");
}

function isNumberToken(raw) {
  return !/[A-Za-z]/.test(raw);
}

// Tokenise one text into an array of sentences, each an array of
// { lower, capitalized, sentenceStart } token records.
function tokenizeSentences(text) {
  const sentences = [];
  for (const chunk of cleanText(text).split(SENTENCE_SPLIT_RE)) {
    const raws = chunk.match(WORD_RE);
    if (!raws) continue;
    const tokens = [];
    raws.forEach((raw, index) => {
      const lower = raw.toLowerCase().replace(/[’']/g, "");
      if (!lower) return;
      tokens.push({
        lower,
        raw,
        isNumber: isNumberToken(raw),
        capitalized: /^[A-Z]/.test(raw),
        sentenceStart: index === 0,
      });
    });
    if (tokens.length) sentences.push(tokens);
  }
  return sentences;
}

// Slugs that appear capitalized somewhere other than a sentence start —
// a cheap "proper noun / place / subject" heuristic. Only fed from the
// description and content: titles are frequently written in Title Case,
// where the capitalisation carries no proper-noun signal at all.
function collectProperSlugs(sentenceSets) {
  const proper = new Set();
  for (const sentences of sentenceSets) {
    for (const tokens of sentences) {
      for (const token of tokens) {
        if (token.capitalized && !token.sentenceStart && !token.isNumber) {
          proper.add(tagSlug(token.lower));
        }
      }
    }
  }
  return proper;
}

function phraseIsAcceptable(slice) {
  if (slice.some((t) => t.isNumber || isStopWord(t.lower))) return false;
  if (slice.some((t) => t.lower.length < 2)) return false;
  // at least one "real" word of 3+ letters
  if (!slice.some((t) => t.lower.length >= 3)) return false;
  // a phrase made entirely of filler adjectives ("best places") is not a tag
  if (slice.every((t) => WEAK_SOLO_WORDS.has(t.lower))) return false;
  // "best places to visit", "top things ..." — a phrase that leads with a
  // filler adjective rarely makes a good tag
  if (slice.length >= 2 && WEAK_SOLO_WORDS.has(slice[0].lower)) return false;
  return true;
}

// Count every acceptable 1..3-word phrase in a token stream.
function collectPhrases(sentences) {
  const counts = new Map(); // slug -> { phrase, slug, words, count }
  for (const tokens of sentences) {
    for (let n = 1; n <= MAX_WORDS; n += 1) {
      for (let i = 0; i + n <= tokens.length; i += 1) {
        const slice = tokens.slice(i, i + n);
        if (!phraseIsAcceptable(slice)) continue;
        const phrase = slice.map((t) => t.lower).join(" ");
        const slug = tagSlug(phrase);
        if (!slug) continue;
        const entry = counts.get(slug) || { phrase, slug, words: n, count: 0 };
        entry.count += 1;
        counts.set(slug, entry);
      }
    }
  }
  return counts;
}

export function generateTagCandidates(context = {}, options = {}) {
  const { title = "", description = "", content = "" } = context;
  const excludeSlugs = new Set(options.excludeSlugs || []);
  const limit = options.limit || MAX_CANDIDATES;

  const titleText = String(title || "");
  const descText = String(description || "");
  const contentText = htmlToBrokenText(content);

  if (!titleText.trim() && !descText.trim() && !contentText.trim()) return [];

  const titleSentences = tokenizeSentences(titleText);
  const descSentences = tokenizeSentences(descText);
  const contentSentences = tokenizeSentences(contentText);

  const properSlugs = collectProperSlugs([descSentences, contentSentences]);

  const titlePhrases = collectPhrases(titleSentences);
  const descPhrases = collectPhrases(descSentences);
  const contentPhrases = collectPhrases(contentSentences);

  const scored = new Map(); // slug -> { phrase, score }

  const consider = (entry, { inTitle = false, inDesc = false, base = 0, repeats = 0 }) => {
    const slugParts = entry.slug.split("-").filter(Boolean);
    const hasProper = slugParts.some((part) => properSlugs.has(part));

    // Stand-alone single words need a real signal to qualify.
    if (entry.words === 1) {
      if (WEAK_SOLO_WORDS.has(entry.phrase)) return;
      if (!hasProper && !inTitle && repeats < 2) return;
      if (entry.phrase.length < 3) return;
    }

    let sources = 0;
    if (inTitle) sources += 1;
    if (inDesc) sources += 1;
    if (repeats > 0) sources += 1;

    // Cross-signal gate — the main noise filter. A candidate has to be more
    // than an arbitrary run of words from a single sentence: it must look
    // like a name/subject, be repeated, or show up in more than one field.
    if (!hasProper && sources < 2 && repeats < 2) return;

    let score = base;
    if (entry.words >= 2) score += 3;
    if (entry.words === 3) score += 1;
    if (hasProper) score += 4;
    if (slugParts.length > 1 && slugParts.every((part) => properSlugs.has(part))) score += 3;
    if (repeats >= 2) score += Math.min(repeats, 4) * 2;
    if (sources >= 2) score += 3;

    const prev = scored.get(entry.slug);
    if (!prev || score > prev.score) {
      scored.set(entry.slug, { phrase: entry.phrase, score });
    }
  };

  for (const entry of titlePhrases.values()) {
    consider(entry, {
      inTitle: true,
      inDesc: descPhrases.has(entry.slug),
      base: 10,
      repeats: contentPhrases.get(entry.slug)?.count || 0,
    });
  }

  for (const entry of descPhrases.values()) {
    if (titlePhrases.has(entry.slug)) continue;
    consider(entry, {
      inDesc: true,
      inTitle: false,
      base: 6,
      repeats: contentPhrases.get(entry.slug)?.count || 0,
    });
  }

  for (const entry of contentPhrases.values()) {
    if (titlePhrases.has(entry.slug) || descPhrases.has(entry.slug)) continue;
    const slugParts = entry.slug.split("-").filter(Boolean);
    const hasProper = slugParts.some((part) => properSlugs.has(part));
    // From content alone we only trust phrases that either repeat or look
    // like a proper noun / named subject — everything else is noise.
    if (entry.count < 2 && !hasProper) continue;
    consider(entry, { base: 3, repeats: entry.count });
  }

  return [...scored.entries()]
    .filter(([slug, item]) => !excludeSlugs.has(slug) && item.score >= MIN_SCORE)
    .sort((a, b) => b[1].score - a[1].score || a[1].phrase.localeCompare(b[1].phrase))
    .slice(0, limit)
    .map(([, item]) => item.phrase);
}
