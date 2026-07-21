# Vouch

Vouch is a paid OKX.AI-ready career workflow ASP. It turns a candidate resume and one to three target jobs into an evidence-backed application packet:

- ATS-ready resume
- recruiter-facing summary
- mock recruiter screen
- fit-gap benchmark
- interview prep
- portfolio proof sprints
- salary positioning

The product principle is simple: Vouch may improve positioning, but it must not invent experience. Every strong claim should be grounded in the candidate's supplied resume/profile evidence.

## Production Shape

Vouch is a paid A2MCP-style HTTP service. Production defaults to x402 paid mode and refuses to boot unless the receiving wallet and OKX facilitator credentials are configured.

Paid endpoint:

```txt
POST /api/v1/vouch/application-packet
```

Public endpoints:

```txt
GET /health
GET /api/v1/vouch/manifest
POST /api/a2mcp
```

The `/api/a2mcp` helper exposes tool metadata, but in paid mode it does not execute the packet generator directly. Packet generation must go through the x402-protected endpoint.

## Required Production Env

```bash
VOUCH_PAYMENT_MODE=paid
VOUCH_PRICE_USD=0.25
PAY_TO_ADDRESS=0xYourXLayerReceivingWallet
OKX_API_KEY=your_okx_developer_api_key
OKX_SECRET_KEY=your_okx_developer_secret_key
OKX_PASSPHRASE=your_okx_developer_passphrase
OKX_BASE_URL=https://web3.okx.com
VOUCH_PUBLIC_BASE_URL=https://YOUR_DEPLOYED_DOMAIN
```

For local development only:

```bash
VOUCH_PAYMENT_MODE=free npm run dev
```

## Local Verification

```bash
npm test
VOUCH_PAYMENT_MODE=free npm run dev
```

Open `http://localhost:3000` when using local free mode.

## Real Job Inputs

Each target job can include either a pasted `description` or a public `url`. If the description is missing and `VOUCH_ENABLE_URL_FETCH=true`, Vouch fetches the job page, extracts readable text, and benchmarks against that text. Candidate data is still processed in memory and is not persisted by default.

## Submission Assets

- [ASP contract](docs/asp-contract.md)
- [OKX.AI listing draft](docs/okx-ai-listing.md)
- [Demo script](docs/demo-script.md)
- [Production checklist](docs/production-checklist.md)

## Hackathon Demo Story

1. Paste a generic resume.
2. Paste up to three target job descriptions or public job URLs.
3. Show that the production endpoint is x402 protected.
4. Generate the paid packet after payment.
5. Show the before score, after score, recruiter concerns, evidence-backed resume bullets, interview prep, and proof-gap plan.
