#!/usr/bin/env node
import { spawn } from "node:child_process";
import net from "node:net";

const OKX_HOST = "web3.okx.com";
const OKX_PORT = 443;
const DEFAULT_TARGET = "d1a9ug9i3w9ke0.cloudfront.net";
const targetHost = process.env.OKX_PROXY_TARGET || DEFAULT_TARGET;
const separator = process.argv.indexOf("--");
const command = separator >= 0 ? process.argv.slice(separator + 1) : process.argv.slice(2);

if (command.length === 0) {
  console.error("Usage: node scripts/okx-run.mjs -- <command> [...args]");
  process.exit(64);
}

const server = net.createServer((client) => {
  client.once("data", (chunk) => handleConnect(client, chunk));
});

server.on("error", (error) => {
  console.error("[okx-route] proxy failed:", error.message);
  process.exit(1);
});

server.listen(0, "127.0.0.1", () => {
  const { port } = server.address();
  const proxyUrl = "http://127.0.0.1:" + port;
  const child = spawn(command[0], command.slice(1), {
    stdio: "inherit",
    env: {
      ...process.env,
      HTTPS_PROXY: proxyUrl,
      HTTP_PROXY: proxyUrl,
      ALL_PROXY: proxyUrl,
      NO_PROXY: process.env.NO_PROXY || ""
    }
  });

  child.on("exit", (code, signal) => {
    server.close(() => {
      if (signal) {
        process.kill(process.pid, signal);
        return;
      }
      process.exit(code ?? 1);
    });
  });
});

function handleConnect(client, firstChunk) {
  const headerText = firstChunk.toString("latin1");
  const separator = "\r\n\r\n";
  const headerEnd = headerText.indexOf(separator);
  const firstLine = headerText.split("\r\n")[0] || "";
  const match = firstLine.match(/^CONNECT\s+([^:]+):(\d+)\s+HTTP\//i);

  if (!match) {
    client.end("HTTP/1.1 405 Method Not Allowed\r\n\r\n");
    return;
  }

  const requestedHost = match[1];
  const requestedPort = Number(match[2]);
  const routedHost = requestedHost === OKX_HOST && requestedPort === OKX_PORT ? targetHost : requestedHost;
  const upstream = net.connect(requestedPort, routedHost, () => {
    client.write("HTTP/1.1 200 Connection Established\r\n\r\n");
    if (headerEnd >= 0) {
      const bodyOffset = Buffer.byteLength(headerText.slice(0, headerEnd + separator.length), "latin1");
      const remainder = firstChunk.slice(bodyOffset);
      if (remainder.length > 0) upstream.write(remainder);
    }
    client.pipe(upstream);
    upstream.pipe(client);
  });

  upstream.on("error", () => client.destroy());
  client.on("error", () => upstream.destroy());
}
