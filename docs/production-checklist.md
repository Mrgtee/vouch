# Production Checklist

## Required Secrets

- `PAY_TO_ADDRESS`: EVM-compatible wallet on X Layer that receives Vouch payments.
- `OKX_API_KEY`: OKX Developer Portal API key.
- `OKX_SECRET_KEY`: OKX Developer Portal secret key.
- `OKX_PASSPHRASE`: OKX Developer Portal passphrase.
- `OPENAI_API_KEY`: OpenAI API key used to generate the paid career packet.

Do not commit these values.

## Required Public Env

- `VOUCH_PAYMENT_MODE=paid`
- `VOUCH_PRICE_USD=0.20`
- `VOUCH_PUBLIC_BASE_URL=https://YOUR_DEPLOYED_DOMAIN`
- `OKX_BASE_URL=https://web3.okx.com`
- `VOUCH_ENABLE_URL_FETCH=true`
- `VOUCH_AI_PROVIDER=openai`
- `VOUCH_OPENAI_MODEL=gpt-5`

## Self-Checks

Before registering the service:

```bash
npm test
curl -i https://YOUR_DEPLOYED_DOMAIN/health
curl -i https://YOUR_DEPLOYED_DOMAIN/api/v1/vouch/manifest
curl -i https://YOUR_DEPLOYED_DOMAIN/api/v1/vouch/application-packet
curl -i -X POST https://YOUR_DEPLOYED_DOMAIN/api/v1/vouch/application-packet \
  -H 'content-type: application/json' \
  --data '{"resumeText":"...","targetJobs":[{"url":"https://example.com/job"}]}'
```

Expected paid endpoint result without payment for both the registered `GET` check route and the business `POST` route:

```txt
HTTP 402
PAYMENT-REQUIRED: <x402 challenge>
```

Expected result after verified payment replay:

```txt
HTTP 200
PAYMENT-RESPONSE: <settlement proof>
```

## Hard Rules

- Do not run production with `VOUCH_PAYMENT_MODE=free`.
- Do not run paid production with `VOUCH_AI_PROVIDER=local` unless explicitly doing an emergency fallback test.
- Do not use a placeholder `PAY_TO_ADDRESS`.
- Do not register the ASP until the deployed endpoint returns `HTTP 402` without payment.
- Do not claim PDF/DOCX upload support until parser support is implemented.
- Do not store resumes or job inputs unless a privacy policy and deletion flow exist.
