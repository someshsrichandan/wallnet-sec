# WallNet-Sec Setup Guide

This guide is written for developers who want to run the full project locally, understand what each app does, and avoid the usual setup traps.

If you only need a fast start, run `backend` + `client` first. Then add demo apps one by one.

## 1. Prerequisites

- Node.js `20+`
- npm `10+`
- MongoDB running locally or remotely
- Git

Optional but useful:

- Docker Desktop (for `docker compose` workflow)

## 2. Clone And Install

From your workspace root:

```bash
git clone <your-repo-url>
cd wallnet-sec
```

Install dependencies per app:

```bash
cd backend && npm install
cd ../client && npm install
cd ../demo-bank && npm install
cd ../demo-ecommerce && npm install
cd ../demo-wallet && npm install
cd ../test-site && npm install
```

## 3. Environment Setup

### 3.1 Backend

Create `backend/.env`:

Windows:

```bash
cd backend
copy .env.example .env
```

macOS/Linux:

```bash
cd backend
cp .env.example .env
```

Minimum values to set in `backend/.env`:

```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/wallnet-sec
VISUAL_DATA_ENCRYPTION_KEY=replace-with-a-long-random-secret-min-32-chars
TOKEN_SECRET=replace-with-a-long-random-secret-min-32-chars
CORS_ORIGIN=http://localhost:3001,http://localhost:3002,http://localhost:3003,http://localhost:3004
PARTNER_CALLBACK_ALLOWLIST=http://localhost:3001,http://localhost:3002,http://localhost:3003,http://localhost:3004
PARTNER_API_KEYS=hdfc_bank:dev-partner-key-change-me
```

Notes:

- Keep `PARTNER_API_KEYS` aligned with whichever partner app you are testing.
- For newer partner integrations, prefer key_id + key_secret generated through partner key APIs.

### 3.2 Client (Main Platform)

Create `client/.env.local` (this file is not currently provided as an example file):

```env
BACKEND_API_BASE_URL=http://localhost:3000/api
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api

# Partner proxy keys used by server-side routes
PARTNER_SERVER_API_KEY=dev-partner-key-change-me
PARTNER_SERVER_SANDBOX_API_KEY=dev-partner-key-change-me

# Optional
BACKEND_SANDBOX_API_BASE_URL=http://localhost:3000/api
DEMO_BANK_URL=http://localhost:3002
NEXT_PUBLIC_DEMO_BANK_URL=http://localhost:3002

# Optional docs/examples rendering values
WALLNET_SEC_URL=http://localhost:3000
WALLNET_SEC_BASE_URL=http://localhost:3000
WALLNET_SEC_API_KEY=dev-partner-key-change-me
WALLNET_SEC_PARTNER_ID=hdfc_bank
APP_BASE_URL=http://localhost:3001
```

### 3.3 Demo Bank

Create `demo-bank/.env.local` from example:

Windows:

```bash
cd demo-bank
copy .env.local.example .env.local
```

macOS/Linux:

```bash
cd demo-bank
cp .env.local.example .env.local
```

Required keys in `demo-bank/.env.local`:

```env
DEMO_BANK_PUBLIC_ORIGIN=http://localhost:3002
VISUAL_BACKEND_API_BASE_URL=http://localhost:3000/api
VISUAL_VERIFY_ORIGIN=http://localhost:3001
VISUAL_ADMIN_URL=http://localhost:3001/admin
VISUAL_PARTNER_ID=hdfc_bank
VISUAL_KEY_ID=key_test_vps_xxxxxxxxxxxx
VISUAL_KEY_SECRET=secret_test_vps_xxxxxxxxxxxx
DEMO_BANK_COOKIE_SECRET=change-demo-bank-cookie-secret
DEMO_BANK_SESSION_HOURS=12
DEMO_BANK_PENDING_MINUTES=10
MONGODB_URI=mongodb://127.0.0.1:27017/wallnet-sec
```

Optional (agent OTP email):

```env
GMAIL_USER=you@gmail.com
GMAIL_APP_PASSWORD=your-app-password
BANK_NAME=HDFC
```

### 3.4 Demo E-commerce

Create `demo-ecommerce/.env.local` from example:

Windows:

```bash
cd demo-ecommerce
copy .env.local.example .env.local
```

macOS/Linux:

```bash
cd demo-ecommerce
cp .env.local.example .env.local
```

Typical values:

```env
VISUAL_BACKEND_API_BASE_URL=http://localhost:3000/api
VISUAL_VERIFY_ORIGIN=http://localhost:3001
DEMO_SHOP_PUBLIC_ORIGIN=http://localhost:3003
VISUAL_PARTNER_ID=shopmart
VISUAL_KEY_ID=key_test_vps_xxxxxxxxxxxx
VISUAL_KEY_SECRET=secret_test_vps_xxxxxxxxxxxx
DEMO_SHOP_COOKIE_SECRET=change-demo-shop-cookie-secret-min-32-chars
DEMO_SHOP_SESSION_HOURS=12
DEMO_SHOP_PENDING_MINUTES=10
MONGODB_URI=mongodb://127.0.0.1:27017/wallnet-sec
```

### 3.5 Demo Wallet

Create `demo-wallet/.env.local` manually (no example file currently present):

```env
VISUAL_BACKEND_API_BASE_URL=http://localhost:3000/api
VISUAL_VERIFY_ORIGIN=http://localhost:3001
VISUAL_ADMIN_URL=http://localhost:3001/admin

DEMO_WALLET_PUBLIC_ORIGIN=http://localhost:3004
VISUAL_PARTNER_ID=nexus_wallet

VISUAL_KEY_ID=key_test_vps_xxxxxxxxxxxx
VISUAL_KEY_SECRET=secret_test_vps_xxxxxxxxxxxx
# Legacy fallback
VISUAL_API_KEY=dev-partner-key-change-me

DEMO_WALLET_COOKIE_SECRET=change-demo-wallet-cookie-secret
DEMO_WALLET_SESSION_HOURS=12
DEMO_WALLET_PENDING_MINUTES=10
MONGODB_URI=mongodb://127.0.0.1:27017/wallnet-sec
```

### 3.6 Test Site (Crypto)

Create `test-site/.env.local` manually (no example file currently present):

```env
SITE_PUBLIC_ORIGIN=http://localhost:3004
VISUAL_BACKEND_API_BASE_URL=http://localhost:3000/api
VISUAL_VERIFY_ORIGIN=http://localhost:3001

VISUAL_PARTNER_ID=hdfc_bank

VISUAL_KEY_ID=key_test_vps_xxxxxxxxxxxx
VISUAL_KEY_SECRET=secret_test_vps_xxxxxxxxxxxx
# Legacy fallback
VISUAL_API_KEY=dev-partner-key-change-me

COOKIE_SECRET=test-site-cookie-secret-change-me
MONGODB_URI=mongodb://127.0.0.1:27017/wallnet-sec
```

Important:

- `demo-wallet` and `test-site` both default to port `3004`.
- Run only one at a time, or change one app's `dev` script port.

## 4. Start Services (Recommended Order)

Open separate terminals.

1. Start backend:

```bash
cd backend
npm run dev
```

2. Start main client:

```bash
cd client
npm run dev
```

3. Start demo apps as needed:

```bash
cd demo-bank && npm run dev
cd demo-ecommerce && npm run dev
cd demo-wallet && npm run dev
# or test-site
cd test-site && npm run dev
```

## 5. Smoke Test Checklist

After startup, verify these first:

- Backend health: `http://localhost:3000/health`
- Main client: `http://localhost:3001`
- Demo bank: `http://localhost:3002`
- Demo e-commerce: `http://localhost:3003`
- Demo wallet: `http://localhost:3004`

Then run the core auth path:

1. Open `http://localhost:3001/admin`.
2. Register/login and enroll a profile with a specific `partnerId` + `partnerUserId`.
3. Open `http://localhost:3001/partner-live` and use the same pair.
4. Continue to verify flow and submit challenge.
5. Confirm callback validation succeeds.

## 6. One-Command Docker Stack (Backend + Client + Mongo)

From project root:

```bash
docker compose up --build
```

This is useful for quick backend/client validation, but not for running all demo partner apps.

## 7. Common Issues And Fixes

- `MONGODB_URI environment variable is not set`
  - Add `MONGODB_URI` in that app's env file and restart.

- `503 Upstream API is unavailable`
  - Backend is down or `BACKEND_API_BASE_URL` / `VISUAL_BACKEND_API_BASE_URL` is wrong.

- `Invalid API key for partner`
  - Partner credentials do not match backend configuration.
  - Check `PARTNER_API_KEYS` (legacy mode) or key_id/key_secret setup.

- `No visual profile enrolled`
  - Enrolled `(partnerId, partnerUserId)` does not match the one sent in init-auth.

- CORS/callback issues
  - Add all local origins to `CORS_ORIGIN` and `PARTNER_CALLBACK_ALLOWLIST`.

- Port conflict on `3004`
  - `demo-wallet` and `test-site` use same default port; change one.

## 8. Recommended Production Hardening

- Use strong random values for `TOKEN_SECRET`, encryption keys, and cookie secrets.
- Keep allowlists strict and HTTPS-only in production.
- Rotate partner credentials regularly.
- Never commit real keys/secrets into the repository.
- Keep API verification and callback consumption server-to-server only.
