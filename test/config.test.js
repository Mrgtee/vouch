import test from "node:test";
import assert from "node:assert/strict";
import { getPublicAiConfig, getPublicPaymentConfig, getRuntimeConfig } from "../src/lib/config.js";

test("defaults to paid mode and requires production payment config", () => {
  assert.throws(
    () => getRuntimeConfig({ PORT: "3000" }),
    /PAY_TO_ADDRESS, OKX_API_KEY, OKX_SECRET_KEY, OKX_PASSPHRASE/
  );
});

test("accepts explicit free mode for local development", () => {
  const config = getRuntimeConfig({
    PORT: "3000",
    VOUCH_PAYMENT_MODE: "free",
    VOUCH_PUBLIC_BASE_URL: "http://localhost:3000"
  });

  assert.equal(config.payment.mode, "free");
  assert.equal(config.payment.isPaid, false);
  assert.deepEqual(getPublicPaymentConfig(config).protectedRoutes, []);
});

test("accepts paid mode with x402 payment environment", () => {
  const config = getRuntimeConfig({
    PORT: "3000",
    VOUCH_PAYMENT_MODE: "paid",
    VOUCH_PUBLIC_BASE_URL: "https://vouch.example",
    VOUCH_PRICE_USD: "$0.20",
    PAY_TO_ADDRESS: "0x000000000000000000000000000000000000dEaD",
    OKX_API_KEY: "key",
    OKX_SECRET_KEY: "secret",
    OKX_PASSPHRASE: "passphrase",
    OPENAI_API_KEY: "sk-test"
  });
  const publicPayment = getPublicPaymentConfig(config);

  assert.equal(config.payment.isPaid, true);
  assert.equal(config.payment.facilitatorBaseUrl, "https://web3.okx.com");
  assert.equal(config.ai.timeoutMs, 20_000);
  assert.equal(publicPayment.mode, "paid");
  assert.equal(publicPayment.network, "eip155:196");
  assert.equal(publicPayment.price, "$0.20");
  assert.deepEqual(publicPayment.protectedRoutes, [
    "GET /api/v1/vouch/application-packet",
    "POST /api/v1/vouch/application-packet"
  ]);
});


test("normalizes unprefixed dollar prices", () => {
  const config = getRuntimeConfig({
    PORT: "3000",
    VOUCH_PAYMENT_MODE: "paid",
    VOUCH_PUBLIC_BASE_URL: "https://vouch.example",
    VOUCH_PRICE_USD: "0.20",
    PAY_TO_ADDRESS: "0x000000000000000000000000000000000000dEaD",
    OKX_API_KEY: "key",
    OKX_SECRET_KEY: "secret",
    OKX_PASSPHRASE: "passphrase",
    OPENAI_API_KEY: "sk-test"
  });

  assert.equal(config.payment.price, "$0.20");
});


test("rejects paid local AI unless the emergency override is explicit", () => {
  assert.throws(
    () => getRuntimeConfig({
      PORT: "3000",
      VOUCH_PAYMENT_MODE: "paid",
      VOUCH_AI_PROVIDER: "local",
      VOUCH_PUBLIC_BASE_URL: "https://vouch.example",
      VOUCH_PRICE_USD: "0.20",
      PAY_TO_ADDRESS: "0x000000000000000000000000000000000000dEaD",
      OKX_API_KEY: "key",
      OKX_SECRET_KEY: "secret",
      OKX_PASSPHRASE: "passphrase"
    }),
    /VOUCH_ALLOW_LOCAL_AI_IN_PAID=true/
  );
});


test("allows paid local AI only with an explicit emergency override", () => {
  const config = getRuntimeConfig({
    PORT: "3000",
    VOUCH_PAYMENT_MODE: "paid",
    VOUCH_AI_PROVIDER: "local",
    VOUCH_ALLOW_LOCAL_AI_IN_PAID: "true",
    VOUCH_PUBLIC_BASE_URL: "https://vouch.example",
    VOUCH_PRICE_USD: "0.20",
    PAY_TO_ADDRESS: "0x000000000000000000000000000000000000dEaD",
    OKX_API_KEY: "key",
    OKX_SECRET_KEY: "secret",
    OKX_PASSPHRASE: "passphrase"
  });

  assert.equal(config.ai.provider, "local");
  assert.equal(getPublicAiConfig(config).productionReady, false);
  assert.equal(config.payment.price, "$0.20");
});


test("normalizes production security controls", () => {
  const config = getRuntimeConfig({
    PORT: "3000",
    VOUCH_PAYMENT_MODE: "paid",
    VOUCH_PUBLIC_BASE_URL: "https://vouch.example",
    VOUCH_PRICE_USD: "0.20",
    VOUCH_TRUST_PROXY: "1",
    VOUCH_ALLOWED_ORIGINS: "https://vouch.example, https://web3.okx.com",
    VOUCH_FRAME_ANCESTORS: "self,https://okx.com",
    VOUCH_RATE_LIMIT_PUBLIC_MAX: "99",
    VOUCH_RATE_LIMIT_PACKET_MAX: "11",
    PAY_TO_ADDRESS: "0x000000000000000000000000000000000000dEaD",
    OKX_API_KEY: "key",
    OKX_SECRET_KEY: "secret",
    OKX_PASSPHRASE: "passphrase",
    OPENAI_API_KEY: "sk-test"
  });

  assert.equal(config.security.trustProxy, 1);
  assert.deepEqual(config.security.allowedOrigins, ["https://vouch.example", "https://web3.okx.com"]);
  assert.deepEqual(config.security.frameAncestors, ["'self'", "https://okx.com"]);
  assert.equal(config.security.rateLimit.publicMax, 99);
  assert.equal(config.security.rateLimit.packetMax, 11);
});
