# Vouch ASP Contract

## Service

Name: `Vouch`

One-line description: `Paid OpenAI-powered, evidence-backed job-to-offer workflow for resumes and target roles.`

Recommended listing category: `Resume & Career Workflows`

Launch mode: `Paid A2MCP x402 endpoint on X Layer.`

## Endpoint

`POST /api/v1/vouch/application-packet`

This endpoint is x402-protected in production. Without a valid payment signature, it should return `HTTP 402`. After verified payment, it returns the packet JSON.

## Payment

- Scheme: `exact`
- Network: `eip155:196` X Layer
- Price: configured by `VOUCH_PRICE_USD`, default `$0.20`
- Receiving wallet: configured by `PAY_TO_ADDRESS`
- Facilitator: OKX x402 SDK via `OKX_API_KEY`, `OKX_SECRET_KEY`, and `OKX_PASSPHRASE`
- AI provider: OpenAI Responses API via `OPENAI_API_KEY` and `VOUCH_OPENAI_MODEL`

## Request

```json
{
  "resumeText": "Candidate resume, LinkedIn text, or profile notes.",
  "targetJobs": [
    {
      "title": "Senior Product Analyst",
      "company": "ExampleCo",
      "description": "Job description text, optional if url is provided.",
      "url": "https://example.com/jobs/123"
    }
  ],
  "candidatePreferences": {
    "location": "Remote",
    "salaryGoal": "120000 USD",
    "tone": "confident"
  }
}
```

## Response

```json
{
  "service": "Vouch",
  "version": "0.3.0",
  "packet": {
    "fitScoreBefore": 54,
    "fitScoreAfter": 83,
    "atsResume": "...",
    "recruiterSummary": "...",
    "mockRecruiterScreen": {},
    "interviewPrep": [],
    "portfolioProjects": [],
    "salaryPositioning": {},
    "gapBenchmark": [],
    "jobBreakdown": [],
    "beforeAfterBulletImprovements": [],
    "applicationStrategy": {}
  },
  "generation": {
    "provider": "openai",
    "model": "gpt-5",
    "fallbackUsed": false
  }
}
```

## Quality Bar

- The service works with one resume and one to three target jobs.
- Target jobs can be pasted descriptions or public URLs.
- Output separates proven claims from suggested gaps.
- Scoring is explainable and anchored by the local benchmark engine even when OpenAI drafts the packet.
- The endpoint is paid in production and cannot be bypassed through the metadata helper.
- No sensitive candidate data is stored by default.
