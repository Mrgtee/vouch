# OKX.AI Listing Draft

## Agent

Name: `Vouch`

Role: `ASP`

Category: `Resume & Career Workflows`

Short description:

`Paid evidence-backed job-to-offer workflow that benchmarks a resume against target jobs and returns an ATS resume, recruiter screen, interview prep, portfolio proof sprints, salary positioning, and fit-gap plan.`

Long description:

`Vouch helps candidates move from generic applications to role-specific opportunity packets. Provide a resume or profile notes plus one to three target job descriptions or public job URLs. Vouch extracts role requirements, benchmarks the candidate against the jobs, rewrites only from supplied evidence, flags missing proof, and returns an application packet with an ATS-ready resume, recruiter-facing summary, mock recruiter screen, interview prep, portfolio project suggestions, salary positioning, and explainable fit scores.`

## Service

Service name: `Create Application Packet`

Service type: `A2MCP`

Fee: `$0.25 per packet` to start. Raise later if reviews prove willingness to pay.

Paid endpoint:

```txt
https://YOUR_DEPLOYED_DOMAIN/api/v1/vouch/application-packet
```

Manifest:

```txt
https://YOUR_DEPLOYED_DOMAIN/api/v1/vouch/manifest
```

Health:

```txt
https://YOUR_DEPLOYED_DOMAIN/health
```

## Submission Hooks

- Clear utility: users get a concrete application packet, not generic resume advice.
- Real-world workflow: resume tailoring, recruiter screening, interview prep, proof sprints, and salary positioning are one job application loop.
- Marketplace readiness: paid x402 endpoint, stateless processing, health check, manifest, and explicit schema.
- Revenue path: pay-per-packet first, premium human-in-the-loop career review later.
- Differentiator: Vouch separates proven claims from missing evidence to reduce AI hallucination in career documents.
