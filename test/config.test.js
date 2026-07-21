import test from "node:test";
import assert from "node:assert/strict";
import { getPublicPaymentConfig, getRuntimeConfig } from "../src/lib/config.js";

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
    VOUCH_PRICE_USD: "$0.25",
    PAY_TO_ADDRESS: "0x000000000000000000000000000000000000dEaD",
    OKX_API_KEY: "key",
    OKX_SECRET_KEY: "secret",
    OKX_PASSPHRASE: "passphrase"
  });
  const publicPayment = getPublicPaymentConfig(config);

  assert.equal(config.payment.isPaid, true);
  assert.equal(config.payment.facilitatorBaseUrl, "https://web3.okx.com");
  assert.equal(publicPayment.mode, "paid");
  assert.equal(publicPayment.network, "eip155:196");
  assert.equal(publicPayment.price, "$0.25");
  assert.deepEqual(publicPayment.protectedRoutes, ["POST /api/v1/vouch/application-packet"]);
});


test("normalizes unprefixed dollar prices", () => {
  const config = getRuntimeConfig({
    PORT: "3000",
    VOUCH_PAYMENT_MODE: "paid",
    VOUCH_PUBLIC_BASE_URL: "https://vouch.example",
    VOUCH_PRICE_USD: "0.25",
    PAY_TO_ADDRESS: "0x000000000000000000000000000000000000dEaD",
    OKX_API_KEY: "key",
    OKX_SECRET_KEY: "secret",
    OKX_PASSPHRASE: "passphrase"
  });

  assert.equal(config.payment.price, "$0.25");
});
