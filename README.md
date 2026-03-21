# WallNet-Sec

WallNet-Sec is a visual-authentication platform designed to reduce phishing and remote takeover risk during login.

Instead of asking users to type a reusable password into an untrusted page, the system asks them to solve a short visual challenge tied to their enrolled profile. The browser gets a challenge, not the raw secret.

## Live Deployments

- Main client (platform): https://wallnet-sec.vercel.app/
- Backend API: https://api-wallnet-sec.vercel.app/
- Demo Bank: https://demo-bank-wallnet-sec.vercel.app/
- Demo E-commerce: https://demo-ecommerce-wallnet-sec.vercel.app/
- Demo Wallet: https://demo-wallet-wallnet-sec.vercel.app/
- Test Site (Crypto): https://demo-crypto-wallnet-sec.vercel.app/

## What This Repository Contains

- `backend/`: Express + MongoDB API for auth, visual sessions, partner integration, and risk/audit utilities.
- `client/`: Next.js platform UI (admin, docs, verification flow, partner simulation, dashboard pages).
- `demo-bank/`: Partner-side banking demo app.
- `demo-ecommerce/`: Partner-side e-commerce demo app.
- `demo-wallet/`: Partner-side wallet demo app.
- `test-site/`: Partner-side crypto/test-site demo app.
- `docker-compose.yml`: Local production-like stack for backend + client + MongoDB.

## Why This Approach

Traditional login forms are easy to spoof. This project uses a challenge-response model where:

- the platform issues a short-lived session challenge,
- the user solves it using a pre-enrolled visual secret,
- the partner system receives a signed result and verifies it server-to-server.

That means partner applications avoid handling raw visual secrets in their own frontend.

## High-Level Architecture

1. Partner backend calls WallNet API to initialize verification.
2. WallNet returns a session token and verify URL.
3. User completes challenge on WallNet-hosted verify screen.
4. WallNet redirects back to partner callback with result + signature.
5. Partner backend calls consume-result endpoint to validate and finalize login.

## Main Local Ports

- `backend`: `3000`
- `client`: `3001`
- `demo-bank`: `3002`
- `demo-ecommerce`: `3003`
- `demo-wallet`: `3004`
- `test-site`: defaults to `3004` (change one app port if running both at the same time)

## Quick Start

If you want the shortest path to running the platform locally:

1. Set up and run `backend`.
2. Set up and run `client`.
3. Open `http://localhost:3001`.

For a complete setup across all demo apps, read the full guide:

- `GUIDE.md`

## Core Flows In The Platform

- Enrollment: create/update visual profile for a `(partnerId, partnerUserId)` pair.
- Init Auth: partner requests a new challenge session.
- Verify: user submits challenge response.
- Callback + Consume Result: partner validates signed outcome server-side.

## Local Docker Option (Backend + Client + Mongo)

From repo root:

```bash
docker compose up --build
```

Services:

- API: `http://localhost:3000`
- Client: `http://localhost:3001`
- MongoDB: `mongodb://localhost:27017`

## Useful Development Commands

Backend:

```bash
cd backend
npm install
npm run dev
```

Client:

```bash
cd client
npm install
npm run dev
```

Backend tests:

```bash
cd backend
npm test
```

## Environment and Security Notes

- Do not commit real secrets in `.env`, `.env.local`, or deployment settings.
- Use a strong `TOKEN_SECRET` and `VISUAL_DATA_ENCRYPTION_KEY` in production.
- Keep `CORS_ORIGIN` and callback allowlists strict in production.
- Prefer Razorpay-style partner credentials (`key_id` + `key_secret`) for integrations.

## Documentation Map

- Full setup walkthrough: `GUIDE.md`
- Backend-specific docs: `backend/README.md`
- Client-specific docs: `client/README.md`
- Demo bank docs: `demo-bank/README.md`
- Demo e-commerce docs: `demo-ecommerce/README.md`

## Troubleshooting Snapshot

- `MONGODB_URI environment variable is not set`: add Mongo URI to the app env and restart.
- `503 Upstream API is unavailable`: verify backend is running and client proxy base URL is correct.
- `Invalid API key for partner`: partner key/secret or API key does not match configured backend partner credentials.
- `No visual profile enrolled`: enroll the same `(partnerId, partnerUserId)` used during init-auth.

## Contributing

Small, focused pull requests are preferred. If you are changing auth/session behavior, include:

- a short flow description,
- API contract changes,
- test notes (what you ran, and expected outcome).
