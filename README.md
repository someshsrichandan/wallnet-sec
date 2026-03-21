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

## How To Test (End-to-End, Code-Backed)

This walkthrough uses `demo-bank` because it implements the full user journey:

- register user,
- start login,
- redirect to hosted verify page,
- callback finalize,
- open partner dashboard only after signature validation.

### 1. Start Required Apps

Run these three apps in separate terminals:

```bash
cd backend
npm install
npm run dev
```

```bash
cd client
npm install
npm run dev
```

```bash
cd demo-bank
npm install
npm run dev -- --port 3002
```

Open `http://localhost:3002`.

### 2. Configure Demo-Bank Environment

Create `demo-bank/.env.local` from `demo-bank/.env.local.example`.

For local testing, verify these values:

- `DEMO_BANK_PUBLIC_ORIGIN=http://localhost:3002`
- `VISUAL_BACKEND_API_BASE_URL=http://localhost:3000/api`
- `VISUAL_VERIFY_ORIGIN=http://localhost:3001`
- `VISUAL_PARTNER_ID` matches backend partner id (default examples use `hdfc_bank`)
- either Razorpay-style keys (`VISUAL_KEY_ID` + `VISUAL_KEY_SECRET`) or legacy `VISUAL_API_KEY`

Also ensure backend callback policy allows demo-bank callback origin (see backend env for callback allowlist behavior).

### 3. Signup (Demo-Bank)

1. Go to `http://localhost:3002/register`.
2. Submit full name, email, phone, password.

What happens in code:

- page posts to `POST /api/demo-bank/register`
- route creates local bank user
- route tries `initVisualEnroll(...)` and returns `enrollUrl` when successful

If `enrollUrl` is returned, click the "Continue to Set Up Visual Password" button.

### 4. Enrollment (Hosted On Client App)

The register flow redirects to client enrollment route:

- `/enroll/:enrollToken` on `client` app

On that page:

1. Select exactly 4 secret items.
2. Enter 2 different secret letters.
3. Choose formula mode and alphabet mode.
4. Submit.

What happens in code:

- page loads enroll session via `GET /api/visual-password/enroll-session/:enrollToken`
- page submits via `POST /api/visual-password/enroll-session/:enrollToken/submit`
- on success it redirects to partner callback URL from the enroll session

For demo-bank, callback is:

- `GET /api/demo-bank/enroll/callback?result=ENROLLED&enrollToken=...`

That callback redirects to:

- `/login?enrolled=1` (or `/dashboard?enrolled=1` if already logged in)

### 5. Login + Verification

1. Open `http://localhost:3002/login`.
2. Sign in with the registered email/password.

What happens in code:

- login form posts to `POST /api/demo-bank/login/start`
- route verifies local email/password
- route calls `initVisualAuth(...)`
- response returns `verifyUrl` (built from `VISUAL_VERIFY_ORIGIN + verifyPath`)
- browser redirects to hosted verify page (`/verify/:sessionToken` on `client`)

On verify page:

- challenge is loaded via `GET /api/visual-password/v1/challenge/:sessionToken`
- answer is submitted via `POST /api/visual-password/v1/verify`

### 6. Callback Finalize (Partner Backend)

After PASS/FAIL, hosted verify redirects back to demo-bank callback:

- `GET /api/demo-bank/login/finalize?...`

Finalize route behavior (implemented):

- validates pending login context from cookie (`state`, `sessionToken`, partner/user IDs)
- requires callback `result=PASS` and `signature`
- calls `POST /visual-password/v1/partner/consume-result` server-to-server
- creates bank session only after consume-result passes

Success result:

- redirected to `/dashboard?verified=1`

Failure result:

- redirected back to `/login?error=...`

### 7. Quick Negative Checks

Use these to confirm guardrails:

1. Try wrong login password at `/login` -> you get invalid credential error before visual step.
2. Try login for a user without valid visual profile -> route returns `needsEnroll` and redirects to enrollment URL.
3. Complete visual challenge with a non-PASS outcome -> finalize redirects to `/login?error=...` and no bank session is created.

## Detailed Technical Flow

This section maps directly to current backend implementation in `backend/src/routes/visualPassword.routes.js` and `backend/src/controllers/visualPassword.controller.js`.

### 1. Enrollment (Profile Creation)

Enrollment binds a visual secret to a partner identity pair:

- `partnerId`
- `userId` (partner user ID)

What is stored by `POST /api/visual-password/enroll`:

- selected secret catalog items (for example vegetables)
- secret letters used as answer anchor positions
- formula configuration (`SALT_ADD` or `POSITION_SUM`)
- profile metadata like catalog type, alphabet mode, and challenge options

Implementation details:

- the system validates and normalizes enrollment input before persisting it.
- init-auth looks up only by `(partnerId, userId, active: true)`.

### 2. Init Auth (Partner -> WallNet)

Partner server starts auth using:

- `POST /api/visual-password/v1/init-auth`

The backend checks:

- partner credentials using middleware `partnerApiKey`:
  - `Authorization: Basic base64(key_id:key_secret)`
  - or legacy `x-api-key`
- callback URL policy (`https` requirement in production and allowlist check when allowlist is configured)
- existence of an active visual credential for the `(partnerId, userId)`

Then it creates a `VisualSession` with:

- `sessionToken`
- attempt limits and expiry (`maxAttempts`, `expiresAt`)
- partner state/callback context
- generated challenge fields (`vegetables`, `alphabetGrid`, expected digits, formula metadata)

Response includes `verifyPath: /verify/:sessionToken`.

### 3. Challenge Retrieval (Browser -> WallNet)

Challenge endpoint:

- `GET /api/visual-password/v1/challenge/:sessionToken`

Backend behavior:

Backend behavior includes:

- validates session token and expiry
- binds/validates request fingerprint on first load
- regenerates challenge board
- resolves image URLs for catalog items
- generates keypad layout
- generates one-time `csrfNonce` and stores it in session

Returned payload includes session info, `csrfNonce`, board data, keypad layout, and stage fields.

### 4. Verify (Browser -> WallNet)

Verify endpoint:

- `POST /api/visual-password/v1/verify`

Current verify checks include:

1. session status checks (already PASS, LOCKED, expired)
2. request fingerprint match with original challenge request
3. CSRF nonce exact match and one-time invalidation
4. normalized input shape and full-grid requirement
5. expected answer check at the user secret-letter coordinates

In verify, backend also computes risk signals:

- behavioral analysis score
- geo-velocity checks
- device trust scoring
- honeypot detection
- optional AI fraud assessment when AI shadow mode is enabled in config/context

If PASS:

- session status becomes `PASS`
- signed verification token (`verificationSignature`) is minted
- known fingerprint can be added to credential

If FAIL:

- attempts increment
- session status becomes `FAIL` or `LOCKED` depending on attempts
- honeypot and failure events are logged

### 5. Callback + Signature Consumption (Partner Backend)

Consume-result endpoint:

- `POST /api/visual-password/v1/partner/consume-result`

Consume-result performs strict checks:

- verifies signature cryptographically
- verifies session exists and is in `PASS`
- verifies signature matches session-stored verification signature
- marks session consumed (`consumedAt`) idempotently

`consume-result` verifies token signature, checks session status/signature match, and sets `consumedAt` once.

## Session State Lifecycle

Implemented session statuses include:

1. `PENDING` (initial)
2. `PASS` (successful verify)
3. `FAIL` (failed verify)
4. `LOCKED` (exceeded max attempts)
5. `EXPIRED` (expiry handling)

`consumedAt` is a timestamp set after successful consume-result.

Operationally important timestamps:

- `expiresAt`
- `verifiedAt`
- `consumedAt`
- `lastAttemptAt`

## Implemented Guards (Current Code)

- Partner auth middleware for partner endpoints (`Basic` key_id:key_secret or `x-api-key`)
- Callback URL checks in init-auth and init-enroll
- Request fingerprint check between challenge and verify
- One-time CSRF nonce check in verify
- Session expiry and attempt lock handling
- Signed verification signature validation in consume-result

## Auditability And Observability

The backend logs event actions, including:

- challenge load
- verify pass/fail
- session lock
- honeypot detections
- consume-result events
- AI fraud assessment events when AI shadow flow is active

This gives teams a way to reason about both auth outcomes and attack signals over time.

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
