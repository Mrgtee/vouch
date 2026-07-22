# Vouch

Vouch is an evidence-backed career workflow ASP for turning a candidate resume and one to three target jobs into a structured application packet. It is built as a Node.js/Express service with an x402-protected production endpoint for OKX Agent Payments Protocol payments.

Vouch is not a generic resume writer. Its core behavior is job-to-resume benchmarking: it compares the evidence provided by the candidate against each role, rewrites only what can be supported, and keeps missing requirements visible as gaps.

## Features

- ATS-oriented resume rewrite grounded in the experience provided by the candidate
- Fit-gap benchmark for each target role
- Recruiter-facing summary and mock recruiter screen
- Interview preparation prompts based on the target roles
- Portfolio proof-sprint suggestions for missing evidence
- Salary-positioning guidance from candidate goals and role context
- Optional job-description fetching from public job URLs
- Paid production access through x402 on X Layer

## Architecture

- Runtime: Node.js 20+ with Express
- Payments: OKX x402 middleware with the exact EVM scheme
- AI generation: OpenAI when configured, with a deterministic local fallback
- Public client: static files in `public/`
- Core packet logic: `src/lib/`
- Tests: Node.js built-in test runner under `test/`

Production mode protects the packet endpoint before generation. Unpaid calls receive `HTTP 402`; paid calls are settled through the configured OKX facilitator before the service creates a packet.

## API

### Public Endpoints

```txt
GET  /health
GET  /api/v1/vouch/manifest
POST /api/a2mcp
```

`/api/a2mcp` exposes tool metadata. In paid mode, tool execution is intentionally redirected to the protected packet endpoint.

### Paid Endpoint

```txt
POST /api/v1/vouch/application-packet
```

Example request body:

```json
{
  "resumeText": "Candidate resume, LinkedIn export, or profile notes...",
  "targetJobs": [
    {
      "title": "Product Engineer",
      "company": "Example Co",
      "description": "Pasted job description..."
    }
  ],
  "candidatePreferences": {
    "location": "Remote",
    "salaryGoal": "$120k",
    "tone": "concise"
  }
}
```

Each target job may include a pasted `description` or a public `url`. When `VOUCH_ENABLE_URL_FETCH=true`, Vouch fetches missing job descriptions from public URLs and blocks private-network targets.

## Setup

```bash
npm install
cp .env.example .env
npm test
```

Run locally without payments:

```bash
VOUCH_PAYMENT_MODE=free VOUCH_AI_PROVIDER=local npm run dev
```

Open `http://localhost:3000` for the local UI.

## Environment

Production defaults to paid mode and requires payment and AI credentials.

```bash
PORT=3000
VOUCH_PUBLIC_BASE_URL=https://your-domain.example

VOUCH_PAYMENT_MODE=paid
VOUCH_PRICE_USD=0.20
VOUCH_ENABLE_URL_FETCH=true

PAY_TO_ADDRESS=0xYourXLayerReceivingWallet
OKX_API_KEY=your_okx_developer_api_key
OKX_SECRET_KEY=your_okx_developer_secret_key
OKX_PASSPHRASE=your_okx_developer_passphrase
OKX_BASE_URL=https://web3.okx.com
VOUCH_SYNC_SETTLE=true

VOUCH_AI_PROVIDER=openai
VOUCH_OPENAI_MODEL=gpt-5
OPENAI_API_KEY=sk-your_openai_api_key
VOUCH_OPENAI_TIMEOUT_MS=45000
VOUCH_OPENAI_MAX_OUTPUT_TOKENS=7000
```

Use `VOUCH_PAYMENT_MODE=free` only for local development and tests. Use `VOUCH_AI_PROVIDER=local` when you want deterministic local packet generation without an AI API key.

## Payment Verification

The repository includes a small wrapper for environments where direct connections to `https://web3.okx.com` time out:

```bash
npm run okx:chains
npm run okx:agents
npm run okx:run -- onchainos payment quote https://your-domain.example/api/v1/vouch/application-packet --method POST
```

The wrapper only routes `web3.okx.com:443` through a working OKX edge while preserving the real `web3.okx.com` TLS host. It does not sign payments, skip payment challenges, or bypass OKX confirmations.

## Development

```bash
npm test
npm run dev
```

Useful files:

- `src/server.js` - HTTP server, routes, x402 middleware, and A2MCP helper
- `src/lib/config.js` - runtime configuration and production boot checks
- `src/lib/packet.js` - packet assembly
- `src/lib/benchmark.js` - role matching and evidence scoring
- `src/lib/aiPacket.js` - AI generation and local fallback
- `src/lib/enrichment.js` - request preparation and optional job URL fetching
- `scripts/okx-run.mjs` - OKX CLI routing helper

## Data Handling

Vouch processes request data in memory and does not persist candidate resumes or job descriptions by default. If you add persistence, logging, analytics, or third-party storage, document the data flow and avoid storing raw candidate documents unless the user explicitly opts in.

## Additional Docs

- [ASP contract](docs/asp-contract.md)
- [OKX.AI listing draft](docs/okx-ai-listing.md)
- [Production checklist](docs/production-checklist.md)
