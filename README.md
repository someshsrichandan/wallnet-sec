# FraudShield Visual Password Platform

Banking-grade, anti-phishing and anti-RAT visual-password system with:
- `backend`: Express + MongoDB API
- `client`: Next.js app with server-side proxy routes and partner-flow simulator

Key property: the browser never learns the correct answer. It only renders a backend-issued challenge and submits user inputs for verification.

## Repository Structure

- `backend/` API server, auth, visual-password session logic, persistence
- `client/` web UI, partner-flow demo, submission forms, API proxy routes
- `docker-compose.yml` one-command production-like local stack (client + backend + MongoDB)

## Prerequisites

- Node.js `20+` recommended
- npm `10+`
- MongoDB running locally or accessible remotely

## Quick Start (Local)

1. Install backend dependencies:
```bash
cd backend
npm install
```
2. Create backend env file from example:
```bash
copy .env.example .env
```
3. Update backend `.env` values at minimum:
- `MONGODB_URI`
- `TOKEN_SECRET`
- `PARTNER_API_KEYS` (partnerId:key mapping)
4. Start backend:
```bash
npm run dev
```
5. In a second terminal, install client dependencies:
```bash
cd client
npm install
```
6. Create client env file from example:
```bash
copy .env.local.example .env.local
```
7. Ensure client `.env.local` includes a bank-side API key for server-side calls:
- `PARTNER_SERVER_API_KEY` (must match one of the backend `PARTNER_API_KEYS` values)
7. Start client:
```bash
npm run dev
```
8. Open:
- `http://localhost:3001` (client)
- `http://localhost:3000/health` (backend health)

## What Runs Where

- Backend default port: `3000`
- Client default port: `3001` (configured in env example for predictable local setup)
- Client server-side proxy forwards `/api/*` to backend API base URL

## Main App Pages

- `/` problem statement and challenge overview
- `/partner-demo` dummy partner redirect simulation
- `/partner-live` production-style partner integration simulator
- `/verify/:sessionToken` secure visual auth portal page (token issued by backend)
- `/partner-live/callback` callback result page that validates PASS token
- `/admin` admin console for credential enrollment
- `/submit` hackathon submission flow

## Banking-Grade Flow (v1)

1. Bank server calls SaaS init endpoint (server-to-server):
   - `POST /api/visual-password/v1/init-auth` (API key required; sent by the client server route)
2. SaaS returns a `sessionToken` and the bank redirects the user to:
   - `/verify/:sessionToken`
3. User completes the challenge in the browser; browser submits inputs to:
   - `POST /api/visual-password/v1/verify`
4. On PASS, SaaS redirects user back to the bank callback URL with a signed `signature`.
5. Bank backend validates the signature by calling:
   - `POST /api/visual-password/v1/partner/consume-result`

## Docker Run (Full Stack)

From repository root:
```bash
docker compose up --build
```

Services:
- Client: `http://localhost:3001`
- Backend: `http://localhost:3000`
- MongoDB: `mongodb://localhost:27017`

## Development Commands

- Backend tests:
```bash
cd backend
npm test
```
- Client lint:
```bash
cd client
npm run lint
```
- Client production build:
```bash
cd client
npm run build
```

## Environment Setup Guides

- Full backend env guide: `backend/README.md`
- Full client env guide: `client/README.md`

## Security Notes

- Never use default `TOKEN_SECRET` in production.
- Set strict `CORS_ORIGIN` in production (do not keep `*`).
- Keep `.env` and `.env.local` out of git; commit only example env files.

## Troubleshooting

- `MONGODB_URI is missing`: backend `.env` not configured.
- `503 Upstream API is unavailable` in client: backend not running or `BACKEND_API_BASE_URL` wrong.
- CORS errors in browser: `CORS_ORIGIN` does not include client origin.
- `Invalid API key for partner`: client `PARTNER_SERVER_API_KEY` does not match backend `PARTNER_API_KEYS`, or the partnerId is different.
- `No visual profile enrolled ...`: enroll the exact `(partnerId, partnerUserId)` pair you use in `/partner-live`.

## Manual Usage Guide

See `GUIDE.md`.
