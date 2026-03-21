# Demo Bank Partner Microservice

This `demo-bank` app is a standalone partner-side Next.js service that integrates with your Visual Password SaaS backend.

## What it demonstrates

1. Bank user registration + local account storage only.
2. Primary login + partner backend call to `/visual-password/v1/init-auth`.
3. Redirect to hosted verify page (`/verify/:sessionToken` on your SaaS frontend).
4. Callback finalize using `/visual-password/v1/partner/consume-result`.
5. Bank session opens only after signature validation.
6. Visual profile setup happens on SaaS Admin (`/admin`) and not in partner UI.

## Environment

Create `demo-bank/.env.local` from `.env.local.example`.

Important values:

- `VISUAL_BACKEND_API_BASE_URL` -> your backend API base (example: `http://localhost:3000/api`)
- `VISUAL_VERIFY_ORIGIN` -> hosted verify frontend origin (example: `http://localhost:3001`)
- `VISUAL_ADMIN_URL` -> SaaS admin URL (example: `http://localhost:3001/admin`)
- `VISUAL_PARTNER_ID` and `VISUAL_API_KEY` -> must match backend `PARTNER_API_KEYS`
- `DEMO_BANK_PUBLIC_ORIGIN` -> this app origin (example: `http://localhost:3002`)
- Backend `PARTNER_CALLBACK_ALLOWLIST` must include `DEMO_BANK_PUBLIC_ORIGIN`

## Run

```bash
cd demo-bank
npm install
npm run dev -- --port 3002
```

Then open `http://localhost:3002`.

## API routes in this microservice

- `POST /api/demo-bank/register`
- `POST /api/demo-bank/login/start`
- `GET|POST /api/demo-bank/login/finalize`
- `GET /api/demo-bank/me`
- `POST /api/demo-bank/logout`

## Razorpay-style integration behavior

- Partner site performs primary login on its own backend.
- Partner backend calls SaaS `init-auth` and gets `verifyPath`.
- User is redirected to SaaS hosted verify UI.
- SaaS redirects back to partner callback with `result`, `signature`, `state`.
- Partner backend calls `consume-result` to verify PASS before creating session.
