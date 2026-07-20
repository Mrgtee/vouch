# Vouch ASP Contract

## Service

Name: `Vouch`

One-line description: `Evidence-backed job-to-offer workflow for resumes and target roles.`

Recommended listing category: `Resume & Career Workflows` or `Lifestyle Companion`

Recommended launch mode: `A2MCP free endpoint first, x402 pay-per-call after public demo validation.`

## Endpoint

`POST /api/v1/vouch/application-packet`

### Request

```json
{
  "resumeText": "Candidate resume, LinkedIn text, or profile notes.",
  "targetJobs": [
    {
      "title": "Senior Product Analyst",
      "company": "ExampleCo",
      "description": "Job description text...",
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

### Response

```json
{
  "service": "Vouch",
  "version": "0.1.0",
  "packet": {
    "fitScoreBefore": 54,
    "fitScoreAfter": 83,
    "atsResume": "...",
    "recruiterSummary": "...",
    "mockRecruiterScreen": {},
    "interviewPrep": [],
    "portfolioProjects": [],
    "salaryPositioning": {},
    "gapBenchmark": []
  }
}
```

## Quality Bar

- The service should work with one resume and one to three jobs.
- Output should separate proven claims from suggested gaps.
- Scoring must be explainable.
- The response should be useful even without external model credentials.
- No sensitive candidate data should be stored by default.
