# Manual Guide (Admin -> Partner -> Verify -> Callback)

This repo simulates a SaaS "visual password" provider (like a bank redirect flow).

The system has two identities:
- **Owner user**: the authenticated user who can manage a visual profile (via `/admin` and bearer auth).
- **Partner user**: the bank's user identifier used for login (`partnerUserId` / `userId` in requests).

The visual profile is stored against `(partnerId, partnerUserId)`, and owned by the authenticated user.

## 1. Setup Checklist

Backend (`backend/.env`):
- `MONGODB_URI=...`
- `TOKEN_SECRET=...` (long random, min 32 chars in production)
- `PARTNER_API_KEYS=hdfc_bank:sk_live_vps_99218844`
- `CORS_ORIGIN=http://localhost:3001`
- `PARTNER_CALLBACK_ALLOWLIST=http://localhost:3001`
- `TRUST_PROXY=1` (recommended behind reverse proxy)
- Optional tuning:
  - `VISUAL_SALT_VALUE=7`
  - `VISUAL_ALPHABET_GRID_SIZE=10` (backend clamps to 9..12 for display)
  - `VISUAL_SESSION_TTL_MS=300000`
  - `VISUAL_MAX_ATTEMPTS=3`

Client (`client/.env.local`):
- `BACKEND_API_BASE_URL=http://localhost:3000/api`
- `BACKEND_SANDBOX_API_BASE_URL=http://localhost:3000/api` (optional)
- `PARTNER_SERVER_API_KEY=sk_live_vps_99218844`
- `PARTNER_SERVER_SANDBOX_API_KEY=sk_test_vps_99218844` (optional)

Start servers:
```bash
cd backend
npm run dev
```
```bash
cd client
npm run dev
```

## 2. Enroll A Visual Profile (Enrollment Phase)

Open:
- `http://localhost:3001/admin`

Steps:
1. Register or login (creates an **owner user** and gives you a bearer token in the UI).
2. Set:
   - `Partner ID` (example: `hdfc_bank`)
   - `Partner User ID` (example: `customer-bank-001`)
3. Select exactly **4 vegetables** from the gallery.
4. Enter exactly **2 secret letters** (example: `X` and `R`).
5. Click **Save Visual Profile**.

What this writes:
- A `VisualCredential` row keyed by `(partnerId, partnerUserId)` and owned by your logged-in user.

Important:
- The **Partner User ID** you enroll must match the **Partner User ID** you use in `/partner-live`.

## 3. Start The Bank Handshake (Partner Phase)

Open:
- `http://localhost:3001/partner-live`

Recommended:
- Click **Open Partner Live** from `/admin`. It will carry the exact enrolled `(partnerId, partnerUserId)` in the URL.

Inputs:
- `Partner ID` must match what you enrolled.
- `Partner User ID` must match what you enrolled.
- `Partner State` is an opaque string passed through the callback (example: `txn-login-001`).

Click:
- **Continue to SaaS Verify** (redirect mode) or **Launch Secure Popup** (popup mode)

What happens:
1. Client server route calls SaaS Product API:
   - `POST /api/product/v1/init-auth?mode=test|live` with `x-api-key` (server-side)
2. Backend creates a short-lived `VisualSession`.
3. Browser is redirected to:
   - `/verify/:sessionToken`

## 4. Complete The Challenge (Verify Phase)

Open:
- `http://localhost:3001/verify/<sessionToken>`

Screen rules:
- The visual board shows 18 cards (3 rows x 6 columns) with numbers.
- The alphabet grid is a smaller grid (9-12 letters), and **all boxes must be filled**.
- Use the on-screen virtual keypad to enter digits.

Mental step:
1. Find your secret vegetable (one of your enrolled 4).
2. Read its assigned number.
3. Add the salt (shown as "mentally add N").
4. Put the first digit under your first secret letter, second digit under your second secret letter.
5. Fill all remaining letters with any digits (noise).

Submit:
- **Submit Verification**

Outcomes:
- PASS: SaaS returns a signed `signature` and redirects to the partner callback URL.
- FAIL/LOCKED: attempts increment; after max attempts session locks.

Honey-pot:
- If the user enters the original unsalted two digits at the secret letters, the backend flags it as suspicious.

## 5. Validate Callback (Partner Callback Phase)

After PASS, the browser lands on:
- `/partner-live/callback?...&signature=...`

This page simulates a bank backend validation by calling:
- `POST /api/product/v1/partner/consume-result?mode=test|live`

If it shows PASS validated, the signature was verified server-side and the session was consumed.

## 6. Changing Inputs And Behavior

### Change partner identifiers (most common)
- `Partner ID`: edit in `/admin` and `/partner-live` input fields
- `Partner User ID`: edit in `/admin` and `/partner-live` input fields

Remember: enrollment and handshake must use the same `(partnerId, partnerUserId)` pair.

### Change the API key
Backend: `backend/.env`
- `PARTNER_API_KEYS=hdfc_bank:<your-key>`

Client: `client/.env.local`
- `PARTNER_SERVER_API_KEY=<your-key>`
- `PARTNER_SERVER_SANDBOX_API_KEY=<your-test-key>` (if using mode=test)

Restart both servers after env changes.

### Change salt value
Backend:
- Global default: `VISUAL_SALT_VALUE`
- Per-credential: send `saltValue` in enroll (UI currently uses backend default)

### Change alphabet grid size
Backend:
- `VISUAL_ALPHABET_GRID_SIZE`

Note: backend clamps to 9..12 for the actual grid.

### Change max attempts / TTL
Backend:
- `VISUAL_MAX_ATTEMPTS`
- `VISUAL_SESSION_TTL_MS`

## 7. Debugging

Run backend with trace warnings:
```bash
cd backend
node --trace-warnings src/server.js
```

Common errors:
- `No visual profile enrolled ...`
  - You enrolled `Partner User ID=A` but `/partner-live` is sending `Partner User ID=B`.
- `Invalid API key for partner`
  - `x-api-key` (or `PARTNER_SERVER_API_KEY`) does not match backend `PARTNER_API_KEYS`.
- Duplicate key errors in `visualsessions`
  - Old DB indexes. This repo keeps `sessionId` populated for compatibility.

## 8. Visual Image + Screen Protection Notes

- Challenge produce cards now use a public ingredient image API (`themealdb`) and auto-fallback to a second public image source, then local SVG fallback if remote images fail.
- Verify page runs in protected mode with:
  - watermark overlay
  - blocked context menu / copy / cut / drag
  - blocked common capture shortcuts
  - auto pause when tab/window focus changes
- Important browser limitation:
  - No web app can fully block OS-level screenshots or external camera recording. Use these controls as hardening, not absolute DRM.

