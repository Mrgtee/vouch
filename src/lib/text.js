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
  "candidate",
  "communication",
  "did",
  "do",
  "decisions",
  "does",
  "doing",
  "for",
  "from",
  "had",
  "has",
  "have",
  "growth",
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
  "requiring",
  "role",
  "skills",
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

const KEYWORD_VARIANTS = new Map([
  ["a/b testing", ["ab testing", "experimentation", "experiment", "experiments"]],
  ["ab testing", ["a/b testing", "experimentation", "experiment", "experiments"]],
  ["cross functional", ["cross-functional", "stakeholder", "stakeholder management"]],
  ["customer insights", ["customer insight", "user insights", "user research", "customer research"]],
  ["dashboard", ["dashboards", "dashboarding", "business intelligence", "bi"]],
  ["dashboards", ["dashboard", "dashboarding", "business intelligence", "bi"]],
  ["dashboarding", ["dashboard", "dashboards", "business intelligence", "bi"]],
  ["diagnostics", ["diagnostic", "root cause analysis", "funnel analysis", "analysis"]],
  ["executive", ["leadership", "stakeholder", "stakeholder reporting", "executive-ready"]],
  ["experimentation", ["experiment", "experiments", "a/b testing", "ab testing"]],
  ["impact", ["improved", "improvement", "improvements", "increased", "reduced", "revenue", "retention", "conversion"]],
  ["product analytics", ["product analyst", "product analysis", "product metrics", "analytics"]],
  ["retention analysis", ["retention", "cohort analysis", "churn analysis", "renewal analysis"]],
  ["revenue reporting", ["revenue", "arr reporting", "sales reporting", "commercial reporting"]],
  ["senior", ["lead", "led", "ownership", "owned", "mentored", "manager", "principal"]],
  ["stakeholder", ["stakeholders", "stakeholder management", "cross functional", "cross-functional"]],
  ["stakeholder management", ["stakeholder", "stakeholders", "cross functional", "cross-functional"]],
  ["storytelling", ["storytelling", "story", "narrative", "communication", "presented"]]
]);

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
  return (cleanText(value)
    .toLowerCase()
    .match(/[a-z][a-z0-9+#.-]{1,}/g) ?? [])
    .map((token) => token.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ""))
    .filter(Boolean);
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

  const phraseKeywords = [...counts.keys()].filter((keyword) => keyword.includes(" "));

  return [...counts.entries()]
    .filter(([keyword]) => !isRedundantSingleKeyword(keyword, phraseKeywords))
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
  const haystack = " " + cleanText(value).toLowerCase() + " ";
  return keywordVariants(keyword).some((variant) => hasExactKeyword(haystack, variant));
}

function keywordVariants(keyword) {
  const needle = cleanText(keyword).toLowerCase();
  if (!needle) {
    return [];
  }

  const variants = new Set([needle]);
  for (const variant of KEYWORD_VARIANTS.get(needle) ?? []) {
    variants.add(variant);
  }

  if (needle.includes(" ")) {
    variants.add(needle.split(/\s+/).map(looseStem).join(" "));
  } else {
    variants.add(singularize(needle));
    variants.add(looseStem(needle));
  }

  for (const [canonical, mapped] of KEYWORD_VARIANTS.entries()) {
    if (mapped.includes(needle)) {
      variants.add(canonical);
    }
  }

  return [...variants].filter(Boolean);
}

function hasExactKeyword(haystack, needle) {
  if (!needle) {
    return false;
  }

  if (needle.includes(" ")) {
    const phrasePattern = needle
      .split(/\s+/)
      .map(escapeRegExp)
      .join("[^a-z0-9+#.]+");
    return new RegExp("(^|[^a-z0-9+#.])" + phrasePattern + "([^a-z0-9+#.]|$)").test(haystack);
  }

  return new RegExp("(^|[^a-z0-9+#.-])" + escapeRegExp(needle) + "([^a-z0-9+#.-]|$)").test(haystack);
}

function looseStem(token) {
  let stem = singularize(token);
  if (stem.endsWith("ying") && stem.length > 5) {
    stem = stem.slice(0, -4) + "y";
  } else if (stem.endsWith("ing") && stem.length > 5) {
    stem = stem.slice(0, -3);
  } else if (stem.endsWith("ics") && stem.length > 5) {
    stem = stem.slice(0, -1);
  }

  return singularize(stem);
}

function singularize(token) {
  if (token.endsWith("ies") && token.length > 4) {
    return token.slice(0, -3) + "y";
  }

  if (token.endsWith("ses") && token.length > 4) {
    return token.slice(0, -2);
  }

  if (token.endsWith("s") && token.length > 3 && !token.endsWith("ss")) {
    return token.slice(0, -1);
  }

  return token;
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

function isRedundantSingleKeyword(keyword, phraseKeywords) {
  if (keyword.includes(" ")) {
    return false;
  }

  return phraseKeywords.some((phrase) => phrase.split(/\s+/).includes(keyword));
}
