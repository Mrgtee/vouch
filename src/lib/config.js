const PAYMENT_MODES = new Set(["paid", "free"]);
const AI_PROVIDERS = new Set(["openai", "local"]);
const X_LAYER_NETWORK = "eip155:196";
const DEFAULT_PRICE = "$0.20";
const DEFAULT_OKX_BASE_URL = "https://web3.okx.com";
const DEFAULT_OPENAI_MODEL = "gpt-5";

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
    fallback: "local benchmark engine"
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
