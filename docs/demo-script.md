# Demo Script

Target length: 90 seconds

## Setup

Open the deployed Vouch URL and keep the manifest endpoint ready in another tab:

```txt
/api/v1/vouch/manifest
```

## Walkthrough

1. Show the manifest payment block.
   - Mode: paid
   - Network: X Layer
   - Price: configured per packet
   - Protected route: `POST /api/v1/vouch/application-packet`
2. Send one unpaid request to the application packet endpoint.
   - Show the expected `HTTP 402` challenge.
3. Complete the paid request through OKX.AI / OKX Agent Payments Protocol.
4. Show the returned packet.
5. Point out that the input can include pasted job descriptions or public job URLs.
6. Show the before and after fit scores.
7. Open the recruiter summary.
8. Open the ATS resume.
9. Open the interview prep and proof sprint sections.
10. Close by showing the integrity notes: Vouch rewrites from supplied evidence and marks missing proof as gaps.

## Closing Line

`Vouch turns a generic resume and target jobs into a paid, evidence-backed job-to-offer packet. It helps candidates improve positioning without inventing experience.`
