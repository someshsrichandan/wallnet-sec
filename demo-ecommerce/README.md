# Visual Security – Demo Ecommerce

Standalone Next.js service that demonstrates a **retail / e-commerce** partner integrating the Visual Password SaaS for secure account login and high-value checkout protection.

## Ports

| Service            | Port     |
| ------------------ | -------- |
| Backend API        | 3000     |
| Client (SaaS UI)   | 3001     |
| Demo Bank          | 3002     |
| **Demo Ecommerce** | **3003** |

## Quick Start

```bash
cp .env.local.example .env.local
# Edit .env.local – set VISUAL_BACKEND_API_BASE_URL, VISUAL_PARTNER_ID, VISUAL_API_KEY
npm install
npm run dev
```

Open `http://localhost:3003`

## Flow

1. Shopper registers → immediately redirected to SaaS visual password enrollment.
2. On login, demo-ecommerce calls `POST /visual-password/v1/init-auth` (server-to-server).
3. Shopper completes visual challenge on hosted SaaS verify UI.
4. SaaS redirects to `/api/demo-shop/login/finalize?result=PASS&...`.
5. Demo-ecommerce calls `POST /visual-password/v1/partner/consume-result` to validate server-side.
6. Sets its own session cookie — shopper lands on account dashboard.
