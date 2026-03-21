# Client App (Next.js)

Frontend app for:
- problem statement dashboard
- visual-password demo and partner flow simulation
- submission form
- server-side API proxy routes (`/api/*`) to backend

## 1. Prerequisites

- Node.js `20+`
- npm `10+`
- Running backend API (`http://localhost:3000` by default)

## 2. Install

```bash
npm install
```

## 3. Environment Setup

1. Copy env template:
```bash
copy .env.local.example .env.local
```
2. Update values in `.env.local`.

### Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `BACKEND_API_BASE_URL` | Recommended | `http://localhost:3000/api` | Server-side proxy target used by Next route handlers |
| `NEXT_PUBLIC_API_BASE_URL` | Optional fallback | `http://localhost:3000/api` | Fallback for proxy base resolution |
| `PORT` | Optional | `3001` in example | Client dev/prod port |

## 4. Run

- Development:
```bash
npm run dev
```
- Production build:
```bash
npm run build
npm start
```

## 5. App Routes

- `/` main dashboard
- `/demo` visual password challenge test
- `/partner-demo` partner-side login simulation
- `/partner-live` production-style partner redirect simulator
- `/visual-auth` visual authentication portal route (redirect target)
- `/partner-live/callback` partner callback verification route
- `/admin` admin console for user login + visual credential enrollment
- `/submit` proposal submission page

## 6. Proxy API Routes

These Next.js route handlers forward to backend:

- `GET /api/problem-statement`
- `POST /api/problem-statement`
- `GET /api/submissions`
- `POST /api/submissions`
- `POST /api/users/login`
- `POST /api/users`
- `GET /api/users`
- `GET /api/users/me`
- `POST /api/visual-password/start`
- `POST /api/visual-password/verify`
- `GET /api/visual-password/:sessionId`
- `POST /api/visual-password/partner/consume-result`
- `POST /api/visual-password/enroll` (auth required)
- `GET /api/visual-password/enroll/:partnerId/:userId` (auth required)

## 7. Why Proxy is Used

- Keeps browser calls on same origin (`/api/*`), reducing direct CORS coupling.
- Central place for forwarding auth headers and request IDs.
- Easier environment switching (local/stage/prod) via one backend base URL.

## 8. Validation

- Lint:
```bash
npm run lint
```

## 9. Common Setup Errors

- `503 Upstream API is unavailable`: backend is down or `BACKEND_API_BASE_URL` is incorrect.
- Login works in Postman but not UI: verify client is calling `/api/*` (proxy), not direct backend URL.
- Missing data on pages: check backend `/health` and MongoDB connectivity first.
- `No enrolled visual credential found for this user`: run enrollment API first or use sandbox mode from `/partner-live`.
