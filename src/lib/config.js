const PAYMENT_MODES = new Set(["paid", "free"]);
const AI_PROVIDERS = new Set(["openai", "local"]);
const X_LAYER_NETWORK = "eip155:196";
const DEFAULT_PRICE = "$0.20";
const DEFAULT_OKX_BASE_URL = "https://web3.okx.com";
const DEFAULT_OPENAI_MODEL = "gpt-5";
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_PUBLIC_RATE_LIMIT_MAX = 120;
const DEFAULT_PACKET_RATE_LIMIT_MAX = 30;
const DEFAULT_OKX_ORIGINS = [
  "https://okx.com",
  "https://www.okx.com",
  "https://web3.okx.com",
  "https://app.okx.com"
];
const DEFAULT_FRAME_ANCESTORS = ["'self'", "https://okx.com", "https://*.okx.com"];

export function getRuntimeConfig(env = process.env) {
  const paymentMode = normalizePaymentMode(env.VOUCH_PAYMENT_MODE);
  const publicBaseUrl = cleanEnv(env.VOUCH_PUBLIC_BASE_URL);
  const port = Number(env.PORT ?? 3000);
  const config = {
    port,
    publicBaseUrl: publicBaseUrl || "http://localhost:" + port,
    payment: {
      mode: paymentMode,
      isPaid: paymentMode === "paid",
      network: X_LAYER_NETWORK,
      price: normalizePrice(env.VOUCH_PRICE_USD) || DEFAULT_PRICE,
      payToAddress: cleanEnv(env.PAY_TO_ADDRESS),
      facilitatorBaseUrl: cleanEnv(env.OKX_BASE_URL) || DEFAULT_OKX_BASE_URL,
      syncSettle: parseBoolean(env.VOUCH_SYNC_SETTLE, true),
      okxApiKey: cleanEnv(env.OKX_API_KEY),
      okxSecretKey: cleanEnv(env.OKX_SECRET_KEY),
      okxPassphrase: cleanEnv(env.OKX_PASSPHRASE)
    },
    features: {
      fetchJobUrls: parseBoolean(env.VOUCH_ENABLE_URL_FETCH, true)
    },
    ai: {
      provider: normalizeAiProvider(env.VOUCH_AI_PROVIDER),
      model: cleanEnv(env.VOUCH_OPENAI_MODEL) || DEFAULT_OPENAI_MODEL,
      apiKey: cleanEnv(env.OPENAI_API_KEY),
      timeoutMs: normalizeInteger(env.VOUCH_OPENAI_TIMEOUT_MS, 45_000),
      maxOutputTokens: normalizeInteger(env.VOUCH_OPENAI_MAX_OUTPUT_TOKENS, 7_000)
    },
    security: {
      trustProxy: normalizeTrustProxy(env.VOUCH_TRUST_PROXY, paymentMode === "paid" ? "1" : "false"),
      allowedOrigins: normalizeOrigins(env.VOUCH_ALLOWED_ORIGINS, publicBaseUrl),
      frameAncestors: normalizeCspSources(env.VOUCH_FRAME_ANCESTORS, DEFAULT_FRAME_ANCESTORS),
      rateLimit: {
        enabled: parseBoolean(env.VOUCH_RATE_LIMIT_ENABLED, true),
        windowMs: normalizeInteger(env.VOUCH_RATE_LIMIT_WINDOW_MS, DEFAULT_RATE_LIMIT_WINDOW_MS),
        publicMax: normalizeInteger(env.VOUCH_RATE_LIMIT_PUBLIC_MAX, DEFAULT_PUBLIC_RATE_LIMIT_MAX),
        packetMax: normalizeInteger(env.VOUCH_RATE_LIMIT_PACKET_MAX, DEFAULT_PACKET_RATE_LIMIT_MAX)
      },
      allowLocalAiInPaid: parseBoolean(env.VOUCH_ALLOW_LOCAL_AI_IN_PAID, false)
    }
  };

  validateConfig(config);
  return config;
}

export function getPublicPaymentConfig(config) {
  return {
    mode: config.payment.mode,
    network: config.payment.network,
    price: config.payment.isPaid ? config.payment.price : "$0.00",
    payToAddress: config.payment.isPaid ? config.payment.payToAddress : "",
    settlement: "OKX x402 exact payment on X Layer",
    protectedRoutes: config.payment.isPaid
      ? ["GET /api/v1/vouch/application-packet", "POST /api/v1/vouch/application-packet"]
      : []
  };
}

export function getPublicAiConfig(config) {
  return {
    provider: config.ai.provider,
    model: config.ai.provider === "openai" ? config.ai.model : "vouch-local-benchmark",
    fallback: "local benchmark engine",
    productionReady: !config.payment.isPaid || config.ai.provider === "openai"
  };
}

function validateConfig(config) {
  if (!Number.isInteger(config.port) || config.port <= 0) {
    throw new Error("PORT must be a positive integer.");
  }

  if (!config.payment.isPaid) {
    return;
  }

  const missing = [];
  if (!isEvmAddress(config.payment.payToAddress)) {
    missing.push("PAY_TO_ADDRESS");
  }
  if (!config.payment.okxApiKey) {
    missing.push("OKX_API_KEY");
  }
  if (!config.payment.okxSecretKey) {
    missing.push("OKX_SECRET_KEY");
  }
  if (!config.payment.okxPassphrase) {
    missing.push("OKX_PASSPHRASE");
  }
  if (!/^\$\d+(?:\.\d{1,6})?$/.test(config.payment.price)) {
    missing.push("VOUCH_PRICE_USD");
  }
  if (config.ai.provider === "openai" && !config.ai.apiKey) {
    missing.push("OPENAI_API_KEY");
  }
  if (config.ai.provider === "local" && !config.security.allowLocalAiInPaid) {
    missing.push("OPENAI_API_KEY or VOUCH_ALLOW_LOCAL_AI_IN_PAID=true");
  }

  if (missing.length > 0) {
    throw new Error(
      "Paid mode requires valid production payment config: " + missing.join(", ") + ". " +
        "Set VOUCH_PAYMENT_MODE=free only for local development."
    );
  }
}

function normalizePrice(value) {
  const price = cleanEnv(value);
  if (!price) {
    return "";
  }

  return price.startsWith("$") ? price : "$" + price;
}

function normalizePaymentMode(value) {
  const mode = cleanEnv(value || "paid").toLowerCase();
  if (!PAYMENT_MODES.has(mode)) {
    throw new Error("VOUCH_PAYMENT_MODE must be paid or free.");
  }

  return mode;
}

function normalizeTrustProxy(value, fallback) {
  const text = cleanEnv(value || fallback);
  if (!text || text === "false" || text === "0") {
    return false;
  }

  if (text === "true") {
    return true;
  }

  if (/^\d+$/.test(text)) {
    return Number(text);
  }

  return text.split(",").map((entry) => entry.trim()).filter(Boolean);
}

function normalizeAiProvider(value) {
  const provider = cleanEnv(value || "openai").toLowerCase();
  if (!AI_PROVIDERS.has(provider)) {
    throw new Error("VOUCH_AI_PROVIDER must be openai or local.");
  }

  return provider;
}

function normalizeInteger(value, fallback) {
  const number = Number(value ?? fallback);
  if (!Number.isInteger(number) || number <= 0) {
    return fallback;
  }

  return number;
}

function normalizeOrigins(value, publicBaseUrl) {
  const configured = splitCsv(value);
  const defaults = [originFromUrl(publicBaseUrl), ...DEFAULT_OKX_ORIGINS].filter(Boolean);
  const origins = configured.length > 0 ? configured : defaults;
  return [...new Set(origins.map(normalizeOrigin).filter(Boolean))];
}

function normalizeOrigin(value) {
  const text = cleanEnv(value);
  if (!text || text === "null") {
    return "";
  }

  if (text.startsWith("https://*.")) {
    return text.toLowerCase();
  }

  try {
    const parsed = new URL(text);
    if (!["https:", "http:"].includes(parsed.protocol)) {
      return "";
    }
    return parsed.origin;
  } catch {
    return "";
  }
}

function normalizeCspSources(value, fallback) {
  const sources = splitCsv(value);
  const selected = sources.length > 0 ? sources : fallback;
  return selected.map(normalizeCspSource).filter(Boolean);
}

function normalizeCspSource(value) {
  const text = cleanEnv(value);
  if (text === "self" || text === "'self'") {
    return "'self'";
  }

  if (text === "none" || text === "'none'") {
    return "'none'";
  }

  return text;
}

function originFromUrl(value) {
  try {
    return new URL(cleanEnv(value)).origin;
  } catch {
    return "";
  }
}

function splitCsv(value) {
  return cleanEnv(value)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function isEvmAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(value || "");
}

function parseBoolean(value, fallback) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function cleanEnv(value) {
  return String(value ?? "").trim();
}
