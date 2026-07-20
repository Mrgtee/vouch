import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { createApplicationPacket } from "./lib/packet.js";
import { ValidationError } from "./lib/validation.js";

const PORT = Number(process.env.PORT ?? 3000);
const BASE_URL = process.env.VOUCH_PUBLIC_BASE_URL ?? `http://localhost:${PORT}`;
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PUBLIC_DIR = join(ROOT, "public");
const MAX_BODY_BYTES = 1_000_000;

const server = createServer(async (request, response) => {
  try {
    setCorsHeaders(response);

    if (request.method === "OPTIONS") {
      return sendJson(response, 204, null);
    }

    const url = new URL(request.url ?? "/", BASE_URL);

    if (request.method === "GET" && url.pathname === "/health") {
      return sendJson(response, 200, {
        ok: true,
        service: "Vouch",
        version: "0.1.0"
      });
    }

    if (request.method === "GET" && url.pathname === "/api/v1/vouch/manifest") {
      return sendJson(response, 200, buildManifest());
    }

    if (request.method === "POST" && url.pathname === "/api/v1/vouch/application-packet") {
      const body = await readJsonBody(request);
      return sendJson(response, 200, createApplicationPacket(body));
    }

    if (request.method === "POST" && url.pathname === "/api/a2mcp") {
      const body = await readJsonBody(request);
      return sendJson(response, 200, handleA2Mcp(body));
    }

    if (request.method === "GET") {
      return serveStatic(url.pathname, response);
    }

    return sendJson(response, 404, {
      error: "not_found",
      message: "Route not found."
    });
  } catch (error) {
    return handleError(response, error);
  }
});

server.listen(PORT, () => {
  console.log(`Vouch ASP listening on ${BASE_URL}`);
});

function buildManifest() {
  return {
    name: "Vouch",
    version: "0.1.0",
    description:
      "Evidence-backed job-to-offer workflow for resumes and target roles.",
    publicBaseUrl: BASE_URL,
    endpoints: {
      applicationPacket: `${BASE_URL}/api/v1/vouch/application-packet`,
      a2mcp: `${BASE_URL}/api/a2mcp`,
      health: `${BASE_URL}/health`
    },
    tools: [
      {
        name: "vouch_create_application_packet",
        description:
          "Benchmark a resume against one to three jobs and return an ATS resume, recruiter screen, interview prep, and fit-gap plan.",
        inputSchema: {
          type: "object",
          required: ["resumeText", "targetJobs"],
          properties: {
            resumeText: {
              type: "string",
              description: "Candidate resume, LinkedIn text, or profile notes."
            },
            targetJobs: {
              type: "array",
              minItems: 1,
              maxItems: 3,
              items: {
                type: "object",
                required: ["description"],
                properties: {
                  title: { type: "string" },
                  company: { type: "string" },
                  url: { type: "string" },
                  description: { type: "string" }
                }
              }
            },
            candidatePreferences: {
              type: "object",
              properties: {
                location: { type: "string" },
                salaryGoal: { type: "string" },
                tone: {
                  type: "string",
                  enum: ["confident", "concise", "executive", "warm"]
                }
              }
            }
          }
        }
      }
    ],
    privacy:
      "Vouch processes request data in memory and does not persist candidate documents by default."
  };
}

function handleA2Mcp(body) {
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
          message: `Unknown tool: ${name || "missing"}`
        }
      };
    }

    const packet = createApplicationPacket(body.params?.arguments ?? {});
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

async function readJsonBody(request) {
  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      const error = new Error("Request body is too large.");
      error.statusCode = 413;
      throw error;
    }

    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch {
    const error = new Error("Request body must be valid JSON.");
    error.statusCode = 400;
    throw error;
  }
}

async function serveStatic(pathname, response) {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const resolved = normalize(join(PUBLIC_DIR, safePath));

  if (!resolved.startsWith(PUBLIC_DIR)) {
    return sendJson(response, 403, {
      error: "forbidden",
      message: "Invalid path."
    });
  }

  try {
    const file = await readFile(resolved);
    response.writeHead(200, {
      "content-type": contentType(resolved),
      "cache-control": "no-store"
    });
    response.end(file);
  } catch {
    sendJson(response, 404, {
      error: "not_found",
      message: "Static asset not found."
    });
  }
}

function handleError(response, error) {
  if (error instanceof ValidationError) {
    return sendJson(response, error.statusCode, {
      error: "validation_error",
      message: error.message,
      details: error.details
    });
  }

  const statusCode = error.statusCode && Number.isInteger(error.statusCode) ? error.statusCode : 500;
  return sendJson(response, statusCode, {
    error: statusCode >= 500 ? "internal_error" : "request_error",
    message: statusCode >= 500 ? "Vouch could not complete the request." : error.message
  });
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });

  response.end(payload === null ? "" : JSON.stringify(payload, null, 2));
}

function setCorsHeaders(response) {
  response.setHeader("access-control-allow-origin", "*");
  response.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
  response.setHeader("access-control-allow-headers", "content-type, payment, x-payment");
}

function contentType(pathname) {
  const extension = extname(pathname);
  switch (extension) {
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    default:
      return "text/html; charset=utf-8";
  }
}
