import express from "express";
import {
  paymentMiddleware,
  x402ResourceServer
} from "@okxweb3/x402-express";
import { OKXFacilitatorClient } from "@okxweb3/x402-core";
import { ExactEvmScheme } from "@okxweb3/x402-evm/exact/server";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { prepareApplicationPacketPayload } from "./lib/enrichment.js";
import { createApplicationPacketWithAi } from "./lib/aiPacket.js";
import { getPublicAiConfig, getPublicPaymentConfig, getRuntimeConfig } from "./lib/config.js";
import { formatApplicationPacketResult } from "./lib/deliverable.js";
import {
  getApplicationPacketInputFields,
  getApplicationPacketInputRequiredResponse,
  getApplicationPacketInputSchema
} from "./lib/schema.js";
import { ValidationError, normalizeApplicationPacketRequestPayload } from "./lib/validation.js";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PUBLIC_DIR = join(ROOT, "public");
const JSON_LIMIT = "1mb";
const APPLICATION_PACKET_ROUTE = "/api/v1/vouch/application-packet";
const X_LAYER_USDT0_ASSET = "0x779ded0c9e1022225f8e0630b35a9b54be713736";
const X_LAYER_USDT0_DECIMALS = 6;

const config = getRuntimeConfig();
const app = express();

app.set("trust proxy", true);
app.disable("x-powered-by");
app.use(setSecurityHeaders);
app.use(express.json({ limit: JSON_LIMIT }));


app.get("/health", (_request, response) => {
  response.json({
    ok: true,
    service: "Vouch",
    version: "0.3.3",
    paymentMode: config.payment.mode,
    ai: getPublicAiConfig(config)
  });
});

app.get("/api/v1/vouch/manifest", (_request, response) => {
  response.json(buildManifest());
});

if (config.payment.isPaid) {
  app.use(createPaymentMiddleware());
}

app.get(APPLICATION_PACKET_ROUTE, async (request, response, next) => {
  try {
    await sendApplicationPacket(request.query, response);
  } catch (error) {
    next(error);
  }
});

app.post(APPLICATION_PACKET_ROUTE, async (request, response, next) => {
  try {
    await sendApplicationPacket(request.body, response);
  } catch (error) {
    next(error);
  }
});

app.post("/api/a2mcp", async (request, response, next) => {
  try {
    response.json(await handleA2Mcp(request.body));
  } catch (error) {
    next(error);
  }
});

app.use(express.static(PUBLIC_DIR, { etag: false, maxAge: 0 }));

app.use((request, response) => {
  if (request.method === "GET") {
    return response.sendFile(join(PUBLIC_DIR, "index.html"));
  }

  return response.status(404).json({
    error: "not_found",
    message: "Route not found."
  });
});

app.use((error, _request, response, _next) => {
  if (error instanceof ValidationError) {
    return response.status(error.statusCode).json({
      error: "validation_error",
      message: error.message,
      details: error.details
    });
  }

  const statusCode = error.statusCode && Number.isInteger(error.statusCode) ? error.statusCode : 500;
  return response.status(statusCode).json({
    error: statusCode >= 500 ? "internal_error" : "request_error",
    message: statusCode >= 500 ? "Vouch could not complete the request." : error.message
  });
});

app.listen(config.port, () => {
  const paymentLabel = config.payment.isPaid
    ? "paid " + config.payment.price + " to " + config.payment.payToAddress
    : "free development mode";
  console.log("Vouch ASP listening on " + config.publicBaseUrl + " (" + paymentLabel + ")");
});

async function sendApplicationPacket(rawPayload, response) {
  const normalizedPayload = normalizeApplicationPacketRequestPayload(rawPayload);

  if (!hasApplicationPacketInput(normalizedPayload)) {
    return response.status(422).json(getInputRequiredResponse());
  }

  const payload = await prepareApplicationPacketPayload(normalizedPayload, {
    fetchJobUrls: config.features.fetchJobUrls
  });
  const packet = await createApplicationPacketWithAi(payload, config.ai);
  return response.json(formatApplicationPacketResult(packet));
}

function hasApplicationPacketInput(payload) {
  return Boolean(
    payload &&
      typeof payload === "object" &&
      (payload.resumeText || payload.resume_text) &&
      (payload.targetJobs || payload.target_jobs)
  );
}

function getInputRequiredResponse() {
  return getApplicationPacketInputRequiredResponse();
}

function createPaymentMiddleware() {
  const facilitatorClient = new OKXFacilitatorClient({
    apiKey: config.payment.okxApiKey,
    secretKey: config.payment.okxSecretKey,
    passphrase: config.payment.okxPassphrase,
    baseUrl: config.payment.facilitatorBaseUrl || undefined,
    syncSettle: config.payment.syncSettle
  });
  const resourceServer = new x402ResourceServer(facilitatorClient).register(
    config.payment.network,
    new ExactEvmScheme()
  );

  return paymentMiddleware(
    {
      ["GET " + APPLICATION_PACKET_ROUTE]: createApplicationPacketRouteConfig(
        "Vouch application packet endpoint. Provide resumeText and targetJobs as query parameters or serviceParams JSON to generate the paid packet."
      ),
      ["POST " + APPLICATION_PACKET_ROUTE]: createApplicationPacketRouteConfig(
        "Vouch application packet: evidence-backed resume-to-job benchmark, ATS resume, recruiter screen, interview prep, and fit-gap plan."
      )
    },
    resourceServer,
    {
      appName: "Vouch",
      currentUrl: config.publicBaseUrl + APPLICATION_PACKET_ROUTE,
      testnet: false
    }
  );
}

function createApplicationPacketRouteConfig(description) {
  return {
    accepts: {
      scheme: "exact",
      network: config.payment.network,
      payTo: config.payment.payToAddress,
      price: getPaymentAssetAmount(),
      maxTimeoutSeconds: 300
    },
    description,
    mimeType: "application/json",
    unpaidResponseBody: () => ({
      contentType: "application/json",
      body: getInputRequiredResponse()
    }),
    extensions: {
      inputRequired: true,
      requiredArgs: ["resumeText", "targetJobs"],
      fields: getApplicationPacketInputFields(),
      outputSchema: {
        input: {
          type: "http",
          method: "POST",
          bodyType: "json",
          body: getApplicationPacketInputSchema()
        }
      }
    }
  };
}

function getPaymentAssetAmount() {
  return {
    amount: parseUsdPriceToAtomic(config.payment.price),
    asset: X_LAYER_USDT0_ASSET,
    extra: {
      name: "USD₮0",
      version: "1",
      symbol: "USDT",
      decimals: X_LAYER_USDT0_DECIMALS
    }
  };
}

function parseUsdPriceToAtomic(price) {
  const [wholePart, fractionPart = ""] = String(price).replace(/^\$/, "").split(".");
  const whole = BigInt(wholePart || "0");
  const fraction = BigInt(fractionPart.padEnd(X_LAYER_USDT0_DECIMALS, "0").slice(0, X_LAYER_USDT0_DECIMALS));
  return (whole * 10n ** BigInt(X_LAYER_USDT0_DECIMALS) + fraction).toString();
}

function buildManifest() {
  const payment = getPublicPaymentConfig(config);

  return {
    name: "Vouch",
    version: "0.3.3",
    description:
      "Paid evidence-backed job-to-offer workflow for resumes and target roles.",
    publicBaseUrl: config.publicBaseUrl,
    payment,
    ai: getPublicAiConfig(config),
    endpoints: {
      applicationPacket: config.publicBaseUrl + APPLICATION_PACKET_ROUTE,
      a2mcp: config.publicBaseUrl + "/api/a2mcp",
      health: config.publicBaseUrl + "/health"
    },
    tools: [
      {
        name: "vouch_create_application_packet",
        description:
          "Benchmark a resume against one to three jobs and return an ATS resume, recruiter screen, interview prep, salary positioning, and fit-gap plan.",
        inputSchema: getApplicationPacketInputSchema()
      }
    ],
    privacy:
      "Vouch processes request data in memory and does not persist candidate documents by default."
  };
}

async function handleA2Mcp(body) {
  if (body?.method === "tools/list") {
    return {
      jsonrpc: "2.0",
      id: body.id ?? null,
      result: {
        tools: buildManifest().tools
      }
    };
  }

  if (body?.method === "tools/call") {
    const name = body?.params?.name;
    if (name !== "vouch_create_application_packet") {
      return {
        jsonrpc: "2.0",
        id: body.id ?? null,
        error: {
          code: -32601,
          message: "Unknown tool: " + (name || "missing")
        }
      };
    }

    if (config.payment.isPaid) {
      return {
        jsonrpc: "2.0",
        id: body.id ?? null,
        error: {
          code: 402,
          message: "This Vouch call is paid. Use the x402-protected applicationPacket endpoint from the manifest.",
          data: {
            endpoint: buildManifest().endpoints.applicationPacket,
            payment: buildManifest().payment
          }
        }
      };
    }

    const payload = await prepareApplicationPacketPayload(body.params?.arguments ?? {}, {
      fetchJobUrls: config.features.fetchJobUrls
    });
    const packet = await createApplicationPacketWithAi(payload, config.ai);
    return {
      jsonrpc: "2.0",
      id: body.id ?? null,
      result: {
        content: [
          {
            type: "json",
            json: packet
          }
        ],
        structuredContent: packet
      }
    };
  }

  return {
    jsonrpc: "2.0",
    id: body?.id ?? null,
    error: {
      code: -32600,
      message: "Use method tools/list or tools/call."
    }
  };
}

function setSecurityHeaders(request, response, next) {
  response.setHeader("access-control-allow-origin", "*");
  response.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
  response.setHeader(
    "access-control-allow-headers",
    "content-type, payment, x-payment, payment-signature"
  );
  response.setHeader(
    "access-control-expose-headers",
    "payment-required, payment-response, x-payment, payment-signature"
  );
  response.setHeader("x-content-type-options", "nosniff");
  response.setHeader("referrer-policy", "no-referrer");
  response.setHeader("cache-control", "no-store");

  if (request.method === "OPTIONS") {
    response.status(204).end();
    return;
  }

  next();
}
