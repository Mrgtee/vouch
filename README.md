# Vouch

Vouch is a career workflow ASP for OKX.AI. It turns a candidate resume and one to three target jobs into an evidence-backed application packet:

- ATS-ready resume
- recruiter-facing summary
- mock recruiter screen
- fit-gap benchmark
- interview prep
- portfolio/project suggestions
- salary positioning

The product principle is simple: Vouch may improve positioning, but it must not invent experience. Every strong claim should be grounded in the candidate's supplied resume/profile evidence.

## ASP Shape

Vouch starts as an A2MCP-style HTTP service because the workflow can be expressed as structured inputs and a clear JSON result.

Primary endpoint:

```txt
POST /api/v1/vouch/application-packet
```

Health and discovery:

```txt
GET /health
GET /api/v1/vouch/manifest
POST /api/a2mcp
```

## Local Development

```bash
npm test
npm run dev
```

Open `http://localhost:3000`.

## Privacy Posture

The first version is intentionally stateless. Uploaded resume text and job descriptions are processed in memory for the request and are not persisted by the server.

## Submission Assets

- [ASP contract](docs/asp-contract.md)
- [OKX.AI listing draft](docs/okx-ai-listing.md)
- [Demo script](docs/demo-script.md)

## Hackathon Demo Story

1. Paste a generic resume.
2. Paste up to three target job descriptions.
3. Show the before score and recruiter concerns.
4. Generate the after packet.
5. Show evidence-backed bullets and the mock recruiter screen.
6. Export/copy the packet for application use.
