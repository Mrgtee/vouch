import dns from "node:dns/promises";
import net from "node:net";
import { cleanText } from "./text.js";

const MAX_FETCH_CHARS = 120_000;
const MAX_CONTENT_LENGTH = 600_000;
const FETCH_TIMEOUT_MS = 8_000;
const MAX_REDIRECTS = 3;
const BLOCKED_HOSTS = new Set(["localhost", "metadata.google.internal"]);

export async function prepareApplicationPacketPayload(rawPayload, options = {}) {
  const payload = clonePlainObject(rawPayload);
  const targetKey = Array.isArray(payload.targetJobs) ? "targetJobs" : "target_jobs";
  const jobs = Array.isArray(payload[targetKey]) ? payload[targetKey] : [];

  if (!options.fetchJobUrls || jobs.length === 0) {
    return payload;
  }

  const fetcher = options.fetcher ?? fetchJobUrlText;
  payload[targetKey] = await Promise.all(
    jobs.map(async (job) => enrichJob(job, fetcher))
  );

  return payload;
}

export function extractReadablePageText(html) {
  return cleanText(
    String(html ?? "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<\/(p|div|li|section|article|h[1-6]|br)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, "\"")
      .replace(/&#039;/gi, "'")
  ).slice(0, MAX_FETCH_CHARS);
}

async function enrichJob(job, fetcher) {
  const source = job && typeof job === "object" ? { ...job } : {};
  const description = cleanText(source.description ?? source.jobDescription);
  const url = cleanText(source.url);

  if (description.length >= 80 || !url) {
    return source;
  }

  try {
    const fetchedDescription = await fetcher(url);
    if (fetchedDescription) {
      return {
        ...source,
        description: [description, fetchedDescription].filter(Boolean).join("\n\n"),
        source: {
          ...(source.source && typeof source.source === "object" ? source.source : {}),
          fetchedJobUrl: url
        }
      };
    }
  } catch (error) {
    return {
      ...source,
      source: {
        ...(source.source && typeof source.source === "object" ? source.source : {}),
        fetchError: error.message
      }
    };
  }

  return source;
}

export async function fetchJobUrlText(url, options = {}) {
  const fetcher = options.fetcher ?? fetch;
  const lookup = options.lookup ?? dns.lookup;
  let parsed = parseAllowedFetchUrl(url);

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    await assertHostResolvesPublicly(parsed.hostname, lookup);
    const response = await fetcher(parsed, {
      redirect: "manual",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        accept: "text/html,text/plain,application/xhtml+xml",
        "user-agent": "VouchCareerASP/0.2 (+https://vouch.ai)"
      }
    });

    if (isRedirectStatus(response.status)) {
      if (redirectCount === MAX_REDIRECTS) {
        throw new Error("Job URL redirected too many times.");
      }

      parsed = parseRedirectUrl(response, parsed);
      continue;
    }

    return readTextResponse(response);
  }

  throw new Error("Job URL redirected too many times.");
}

async function readTextResponse(response) {
  if (!response.ok) {
    throw new Error("Job URL returned HTTP " + response.status + ".");
  }

  const length = Number(response.headers.get("content-length") ?? 0);
  if (length > MAX_CONTENT_LENGTH) {
    throw new Error("Job URL response is too large.");
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType && !/(text\/html|text\/plain|application\/xhtml\+xml)/i.test(contentType)) {
    throw new Error("Job URL did not return readable text.");
  }

  return extractReadablePageText(await response.text());
}

async function assertHostResolvesPublicly(hostname, lookup) {
  if (net.isIP(hostname)) {
    return;
  }

  let records;
  try {
    records = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new Error("Job URL host could not be resolved.");
  }

  if (!records.length) {
    throw new Error("Job URL host could not be resolved.");
  }

  if (records.some((record) => isPrivateIp(record.address))) {
    throw new Error("Job URL host is not allowed.");
  }
}

function parseRedirectUrl(response, currentUrl) {
  const location = response.headers.get("location");
  if (!location) {
    throw new Error("Job URL redirect is missing a location.");
  }

  return parseAllowedFetchUrl(new URL(location, currentUrl).toString());
}

function isRedirectStatus(status) {
  return [301, 302, 303, 307, 308].includes(status);
}

function parseAllowedFetchUrl(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("Job URL is invalid.");
  }

  if (!["https:", "http:"].includes(parsed.protocol)) {
    throw new Error("Job URL must use HTTP or HTTPS.");
  }

  const hostname = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(hostname) || hostname.endsWith(".local")) {
    throw new Error("Job URL host is not allowed.");
  }

  const ipVersion = net.isIP(hostname);
  if (ipVersion && isPrivateIp(hostname)) {
    throw new Error("Job URL host is not allowed.");
  }

  return parsed;
}

function isPrivateIp(hostname) {
  const normalized = hostname.toLowerCase();
  if (normalized.startsWith("::ffff:")) {
    return isPrivateIp(normalized.slice(7));
  }

  if (normalized === "::" || normalized === "::1") {
    return true;
  }

  if (normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:")) {
    return true;
  }

  if (normalized === "127.0.0.1" || normalized === "0.0.0.0") {
    return true;
  }

  if (normalized.startsWith("10.") || normalized.startsWith("192.168.")) {
    return true;
  }

  const parts = normalized.split(".").map(Number);
  if (parts.length === 4 && parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) {
    return true;
  }

  if (parts.length === 4 && parts[0] === 169 && parts[1] === 254) {
    return true;
  }

  if (parts.length === 4 && parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) {
    return true;
  }

  return false;
}

function clonePlainObject(value) {
  if (!value || typeof value !== "object") {
    return {};
  }

  return structuredClone(value);
}
