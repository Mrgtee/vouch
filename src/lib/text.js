const STOP_WORDS = new Set([
  "a",
  "about",
  "above",
  "across",
  "after",
  "again",
  "against",
  "all",
  "also",
  "am",
  "an",
  "and",
  "any",
  "are",
  "as",
  "at",
  "be",
  "because",
  "been",
  "being",
  "between",
  "both",
  "but",
  "by",
  "can",
  "did",
  "do",
  "does",
  "doing",
  "for",
  "from",
  "had",
  "has",
  "have",
  "having",
  "he",
  "her",
  "here",
  "hers",
  "him",
  "his",
  "how",
  "i",
  "if",
  "in",
  "into",
  "is",
  "it",
  "its",
  "itself",
  "me",
  "more",
  "most",
  "my",
  "no",
  "not",
  "of",
  "on",
  "or",
  "our",
  "out",
  "over",
  "own",
  "per",
  "same",
  "she",
  "should",
  "so",
  "some",
  "such",
  "than",
  "that",
  "the",
  "their",
  "them",
  "then",
  "there",
  "these",
  "they",
  "this",
  "those",
  "through",
  "to",
  "too",
  "under",
  "until",
  "up",
  "very",
  "was",
  "we",
  "were",
  "what",
  "when",
  "where",
  "which",
  "while",
  "who",
  "will",
  "with",
  "within",
  "you",
  "your"
]);

const IMPORTANT_PHRASES = [
  "ab testing",
  "account management",
  "api integration",
  "business intelligence",
  "cross functional",
  "customer success",
  "data analysis",
  "data engineering",
  "data visualization",
  "go to market",
  "growth marketing",
  "machine learning",
  "product analytics",
  "product management",
  "project management",
  "revenue operations",
  "stakeholder management",
  "user research"
];

export function cleanText(value) {
  return String(value ?? "")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function clampText(value, maxLength) {
  const text = cleanText(value);
  if (text.length <= maxLength) {
    return text;
  }

  return text.slice(0, maxLength).trim();
}

export function toSlug(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function splitLines(value) {
  return cleanText(value)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function splitSentences(value) {
  return cleanText(value)
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 10);
}

export function tokenize(value) {
  return cleanText(value)
    .toLowerCase()
    .match(/[a-z][a-z0-9+#.-]{1,}/g) ?? [];
}

export function extractKeywords(value, options = {}) {
  const { limit = 36, minLength = 3 } = options;
  const text = cleanText(value).toLowerCase();
  const counts = new Map();

  for (const phrase of IMPORTANT_PHRASES) {
    if (text.includes(phrase)) {
      counts.set(phrase, (counts.get(phrase) ?? 0) + 4);
    }
  }

  for (const token of tokenize(text)) {
    if (token.length < minLength || STOP_WORDS.has(token)) {
      continue;
    }

    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([keyword, weight]) => ({ keyword, weight }));
}

export function uniqueKeywords(keywordSets, limit = 60) {
  const merged = new Map();

  for (const set of keywordSets) {
    for (const item of set) {
      merged.set(item.keyword, Math.max(merged.get(item.keyword) ?? 0, item.weight));
    }
  }

  return [...merged.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([keyword, weight]) => ({ keyword, weight }));
}

export function hasKeyword(value, keyword) {
  const haystack = ` ${cleanText(value).toLowerCase()} `;
  const needle = cleanText(keyword).toLowerCase();
  if (!needle) {
    return false;
  }

  if (needle.includes(" ")) {
    return haystack.includes(` ${needle} `);
  }

  return new RegExp(`(^|[^a-z0-9+#.-])${escapeRegExp(needle)}([^a-z0-9+#.-]|$)`).test(haystack);
}

export function pickEvidenceLines(resumeText, keyword, limit = 3) {
  return splitSentences(resumeText)
    .filter((sentence) => hasKeyword(sentence, keyword))
    .slice(0, limit);
}

export function extractNumbers(value) {
  return cleanText(value).match(/\b(?:\d+(?:\.\d+)?%?|\$[\d,.]+[kKmM]?)\b/g) ?? [];
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
