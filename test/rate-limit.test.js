import test from "node:test";
import assert from "node:assert/strict";
import { createRateLimiter } from "../src/lib/rateLimit.js";

function runLimiter(limiter, request) {
  const response = {
    headers: {},
    statusCode: 200,
    body: null,
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(value) {
      this.body = value;
      return this;
    }
  };
  let nextCalled = false;
  limiter({ method: "POST", ip: "203.0.113.10", socket: {}, ...request }, response, () => {
    nextCalled = true;
  });
  return { response, nextCalled };
}

test("limits packet and public routes independently", () => {
  let now = 0;
  const limiter = createRateLimiter({
    windowMs: 1000,
    publicMax: 2,
    packetMax: 1,
    packetPaths: ["/api/v1/vouch/application-packet"],
    now: () => now
  });

  assert.equal(runLimiter(limiter, { path: "/api/v1/vouch/manifest" }).nextCalled, true);
  assert.equal(runLimiter(limiter, { path: "/api/v1/vouch/manifest" }).nextCalled, true);
  const publicBlocked = runLimiter(limiter, { path: "/api/v1/vouch/manifest" });
  assert.equal(publicBlocked.nextCalled, false);
  assert.equal(publicBlocked.response.statusCode, 429);

  assert.equal(runLimiter(limiter, { path: "/api/v1/vouch/application-packet" }).nextCalled, true);
  const packetBlocked = runLimiter(limiter, { path: "/api/v1/vouch/application-packet" });
  assert.equal(packetBlocked.nextCalled, false);
  assert.equal(packetBlocked.response.statusCode, 429);

  now = 1001;
  assert.equal(runLimiter(limiter, { path: "/api/v1/vouch/application-packet" }).nextCalled, true);
});

test("skips health and options requests", () => {
  const limiter = createRateLimiter({ publicMax: 1, packetMax: 1, packetPaths: ["/paid"] });

  assert.equal(runLimiter(limiter, { path: "/health" }).nextCalled, true);
  assert.equal(runLimiter(limiter, { method: "OPTIONS", path: "/paid" }).nextCalled, true);
});
