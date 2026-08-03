const STOP_WORDS = new Set([
  "a",
  "ability",
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
  "communicate",
  "did",
  "do",
  "decisions",
  "director",
  "domain",
  "delivering",
  "desks",
  "does",
  "doing",
  "for",
  "financial",
  "financial-sector",
  "from",
  "had",
  "has",
  "have",
  "growth",
  "having",
  "expertise",
  "environment",
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
  "maintain",
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
  "president",
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
  "support",
  "top",
  "using",
  "very",
  "vice",
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
  "bi dashboards",
  "api contracts",
  "agile roadmaps",
  "ai operations",
  "ai-assisted support automation",
  "ai-powered customer operations",
  "ai risk controls",
  "asset management",
  "agentic automation",
  "backend systems",
  "ci/cd",
  "clinical stakeholders",
  "compliance-sensitive launches",
  "control design",
  "credit risk",
  "customer support operations",
  "cross functional",
  "customer success",
  "data analysis",
  "data engineering",
  "data visualization",
  "data quality",
  "data quality controls",
  "data science collaboration",
  "ai explainability controls",
  "go to market",
  "generative ai",
  "healthcare compliance",
  "github actions",
  "executive communication",
  "executive risk reporting",
  "financial risk",
  "fraud-review handoffs",
  "growth marketing",
  "llm apis",
  "llm-powered workflow automation",
  "llm-assisted support workflows",
  "machine learning",
  "market risk",
  "microservices architecture",
  "model monitoring",
  "model risk governance",
  "investment operations",
  "python and sql fluency",
  "openai apis",
  "operational impact",
  "operating playbooks",
  "operational risk",
  "launch governance",
  "support operations",
  "product-engineering partnership",
  "patient-support operations",
  "product analytics",
  "product management",
  "product operations",
  "product specs",
  "project management",
  "react frontends",
  "regulatory audit readiness",
  "requirements definition",
  "revenue operations",
  "risk posture",
  "risk strategy",
  "third-party risk",
  "stakeholder management",
  "stress testing",
  "trade surveillance",
  "client-service analytics",
  "user research",
  "workflow automation"
];

const KEYWORD_VARIANTS = new Map([
  ["a/b testing", ["ab testing", "experimentation", "experiment", "experiments"]],
  ["agile roadmaps", ["roadmap", "roadmaps", "roadmap ownership", "agile roadmap", "agile roadmaps"]],
  ["ai operations", ["ai operations", "ai-assisted", "ai assisted", "llm-powered workflow automation", "generative ai"]],
  ["ai-assisted support automation", ["ai-assisted", "ai assisted", "ai-assisted macros", "llm-assisted support workflows"]],
  ["ai-powered customer operations", ["ai-powered", "ai powered", "ai-assisted", "llm-assisted support workflows"]],
  ["ai risk controls", ["ai-enabled", "ai enabled", "ai-enabled trading", "ai-enabled surveillance", "ai risk", "ai risk controls", "ai-assisted anomaly detection"]],
  ["asset management", ["asset management", "asset-management", "asset-management workflows", "portfolio operations", "fixed income", "equities"]],
  ["bi dashboards", ["dashboard", "dashboards", "business intelligence", "bi", "looker", "sql dashboards"]],
  ["clinical stakeholders", ["clinical", "clinical stakeholder", "clinical and compliance stakeholders", "compliance stakeholders"]],
  ["compliance-sensitive launches", ["compliance-sensitive", "compliance sensitive", "compliance approval", "compliance reviews", "compliance-sensitive launches"]],
  ["ai explainability controls", ["explainability", "explainable", "model explainability", "ai explainability"]],
  ["control design", ["control", "controls", "control design", "controls documentation", "data controls", "remediation controls"]],
  ["cross functional", ["cross-functional", "stakeholder", "stakeholder management"]],
  ["credit risk", ["credit", "credit risk", "counterparty credit risk", "credit concentration", "wholesale lending"]],
  ["customer support operations", ["support operations", "customer support", "customer operations", "support workflow", "support workflows"]],
  ["data quality", ["quality", "data quality", "data controls", "data reconciliation", "reconciliation controls", "reporting defects"]],
  ["data quality controls", ["quality", "data quality", "data controls", "data reconciliation", "reconciliation controls", "reporting defects"]],
  ["data science collaboration", ["science", "data science", "data science teams", "data scientists", "analytics partner"]],
  ["documentation", ["documentation", "documented", "documented assumptions", "audit-ready documentation", "evidence packs"]],
  ["executive risk reporting", ["executive reporting", "executive risk packs", "executive risk", "senior leaders", "directors", "front-office stakeholders"]],
  ["financial risk", ["financial-services risk", "financial risk", "risk expertise", "financial risk expertise"]],
  ["healthcare compliance", ["healthcare", "compliance", "compliance review", "clinical stakeholders"]],
  ["fraud-review handoffs", ["fraud", "fraud review", "fraud-review", "fraud-review handoffs", "risk"]],
  ["llm-powered workflow automation", ["llm-powered", "llm powered", "llm apis", "generative ai", "ai-assisted", "ai-assisted ticket summaries"]],
  ["llm-assisted support workflows", ["llm-assisted", "llm assisted", "ai-assisted macros", "ai-assisted", "support workflows"]],
  ["market risk", ["market risk", "rates", "fx", "var", "value at risk"]],
  ["model monitoring", ["model monitoring", "monitoring", "anomaly detection", "model validation", "model performance"]],
  ["model risk governance", ["model risk", "model governance", "model validation", "model risk governance", "governance", "assumptions"]],
  ["investment operations", ["investment", "investment operations", "investment teams", "portfolio operations", "asset management"]],
  ["operational impact", ["impact", "measure operational impact", "manual review time", "activation", "productivity"]],
  ["operating playbooks", ["playbook", "playbooks", "operating playbooks", "onboarding playbooks", "qa playbooks"]],
  ["operational risk", ["operational risk", "operational controls", "control remediation", "remediation plans"]],
  ["patient-support operations", ["patient support", "patient-support", "support operations", "patient-support operations"]],
  ["support operations", ["customer support operations", "support operations", "support workflow", "support tooling", "agent productivity"]],
  ["product management", ["product manager", "product strategy", "product operations", "product specs"]],
  ["product operations", ["product ops", "product operations", "operational workflows", "support tooling"]],
  ["product specs", ["spec", "specs", "product spec", "product specs", "product specification", "write product specs"]],
  ["requirements definition", ["requirements", "define requirements", "api requirements", "api handoff requirements"]],
  ["workflow automation", ["automation", "automated", "automatically", "operational workflows", "workflow automation"]],

  ["ab testing", ["a/b testing", "experimentation", "experiment", "experiments"]],
  ["agentic", ["agentic automation", "agent workflow", "agent workflows", "workflow automation"]],
  ["agentic automation", ["agentic", "agent workflow", "agent workflows", "workflow automation"]],
  ["api", ["apis", "api contracts", "llm apis", "openai apis", "rest api"]],
  ["api contracts", ["api", "apis", "llm apis", "openai apis", "service contracts"]],
  ["apis", ["api", "api contracts", "llm apis", "openai apis", "rest apis"]],
  ["automation", ["automated", "automatically", "workflow automation", "github actions", "ci/cd"]],
  ["backend systems", ["backend", "server-side", "microservices", "microservices architecture"]],
  ["ci/cd", ["ci cd", "github actions", "pipelines", "deployment pipelines", "deploy code automatically"]],
  ["cross functional", ["cross-functional", "stakeholder", "stakeholder management"]],
  ["customer insights", ["customer insight", "user insights", "user research", "customer research"]],
  ["dashboard", ["dashboards", "dashboarding", "business intelligence", "bi"]],
  ["dashboards", ["dashboard", "dashboarding", "business intelligence", "bi"]],
  ["dashboarding", ["dashboard", "dashboards", "business intelligence", "bi"]],
  ["distributed environments", ["distributed systems", "microservices", "microservices architecture", "multi-service"]],
  ["diagnostics", ["diagnostic", "root cause analysis", "funnel analysis", "analysis"]],
  ["executive", ["executives", "leadership", "stakeholder", "stakeholder reporting", "executive-ready", "executive communication", "executive-ready communication", "executive service metrics", "presented"]],
  ["experimentation", ["experiment", "experiments", "a/b testing", "ab testing"]],
  ["generative ai", ["genai", "gen ai", "llm", "llms", "openai", "openai apis", "ai-assisted", "llm-powered"]],
  ["github actions", ["ci/cd", "deployment pipelines", "pipelines"]],
  ["impact", ["improved", "improvement", "improvements", "increased", "reduced", "revenue", "retention", "conversion"]],
  ["launch governance", ["launch", "launched", "launches", "rollout", "rollouts", "launch governance", "governance"]],
  ["llm", ["llms", "genai", "gen ai", "generative ai", "openai", "openai apis"]],
  ["llm apis", ["llm", "llms", "openai", "openai apis", "api", "apis", "llm-powered", "ai-assisted"]],
  ["microservices architecture", ["microservices", "distributed systems", "service architecture"]],
  ["openai apis", ["openai", "llm apis", "llm", "apis", "api"]],
  ["product analytics", ["product analyst", "product analysis", "product metrics", "analytics"]],
  ["product-engineering partnership", ["partner", "partnered", "partnering", "partnership", "partner with product", "partnered with product", "partner with product and engineering", "product and engineering", "cross-functional partnership"]],
  ["python and sql fluency", ["fluency", "python fluency", "sql fluency", "python or sql fluency", "python", "sql"]],
  ["regulatory audit readiness", ["audit", "audit-ready", "audit readiness", "regulatory audit", "regulatory audit readiness", "regulators", "regulated", "regulated environment", "internal risk committees", "documented assumptions"]],
  ["react frontends", ["react", "react.js", "frontend", "frontends"]],
  ["retention analysis", ["retention", "cohort analysis", "churn analysis", "renewal analysis"]],
  ["revenue reporting", ["revenue", "arr reporting", "sales reporting", "commercial reporting"]],
  ["risk posture", ["posture", "risk posture", "risk insights"]],
  ["risk strategy", ["posture", "risk strategy", "risk posture", "risk insights", "strategy", "strategic risk"]],
  ["third-party risk", ["third-party risk", "vendor risk", "third party risk", "vendor controls"]],
  ["senior", ["lead", "led", "ownership", "owned", "mentored", "manager", "principal"]],
  ["stakeholder", ["stakeholders", "stakeholder management", "cross functional", "cross-functional"]],
  ["stakeholder management", ["stakeholder", "stakeholders", "cross functional", "cross-functional", "partnered", "partnering", "partnership"]],
  ["storytelling", ["storytelling", "story", "narrative", "communication", "presented"]],
  ["client-service analytics", ["client-service", "client service", "client-service analytics", "client service analytics"]],
  ["stress testing", ["stress testing", "stress-testing", "ccar", "scenario analysis"]],
  ["trade surveillance", ["trade surveillance", "surveillance", "surveillance workflows", "trade"]]
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
    variants.add(pluralize(needle));
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

function pluralize(token) {
  if (token.endsWith("s")) {
    return token;
  }

  if (token.endsWith("y") && token.length > 3) {
    return token.slice(0, -1) + "ies";
  }

  return token + "s";
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
