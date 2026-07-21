# OKX.AI Listing Draft

## Agent

Name: `Vouch`

Role: `ASP`

Category: `Resume & Career Workflows`

Short description:

`Evidence-backed job-to-offer workflow that benchmarks a resume against target jobs and returns an ATS resume, recruiter screen, interview prep, portfolio proof sprints, salary positioning, and fit-gap plan.`

Long description:

`Vouch helps candidates move from generic applications to role-specific opportunity packets. Provide a resume or profile notes plus one to three target job descriptions. Vouch extracts role requirements, benchmarks the candidate against the jobs, rewrites only from supplied evidence, flags missing proof, and returns an application packet with an ATS-ready resume, recruiter-facing summary, mock recruiter screen, interview prep, portfolio project suggestions, salary positioning, and explainable fit scores.`

## Service

Service name: `Create Application Packet`

Service type: `A2MCP`

Suggested free demo fee: `0 USDT`

Suggested post-demo fee: `1-5 USDT per packet`

Endpoint:

```txt
https://YOUR_DEPLOYED_DOMAIN/api/v1/vouch/application-packet
```

MCP-style wrapper:

```txt
https://YOUR_DEPLOYED_DOMAIN/api/a2mcp
```

Health:

```txt
https://YOUR_DEPLOYED_DOMAIN/health
```

Manifest:

```txt
https://YOUR_DEPLOYED_DOMAIN/api/v1/vouch/manifest
```

## Submission Hooks

- Clear utility: users get a concrete application packet, not generic resume advice.
- Real-world workflow: resume tailoring, recruiter screening, interview prep, and salary positioning are all part of one job application loop.
- Marketplace readiness: single JSON request, stateless processing, clear success/error shape, health check, and manifest.
- Revenue path: pay-per-packet or premium human-in-the-loop career review.
- Differentiator: Vouch separates proven claims from missing evidence to reduce AI hallucination in career documents.
