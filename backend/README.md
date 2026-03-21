# Backend API (Express + MongoDB)

Backend service for:
- visual-password session lifecycle
- user registration/login/token auth
- problem statement CRUD (admin via auth)
- solution submissions

## 1. Prerequisites

- Node.js `20+`
- npm `10+`
- MongoDB connection string

## 2. Install

```bash
npm install
```

## 3. Environment Setup

1. Copy env template:
```bash
copy .env.example .env
```
2. Update values in `.env`.

### Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | No | `development` | Runtime mode (`development` or `production`) |
| `PORT` | No | `3000` | Backend port |
| `MONGODB_URI` | Yes | none | MongoDB connection string |
| `TOKEN_SECRET` | Yes | insecure fallback in code | HMAC secret for user tokens + partner PASS tokens |
| `CORS_ORIGIN` | No | `*` | Comma-separated allowlist, example: `http://localhost:3001,https://app.example.com` |
| `PARTNER_CALLBACK_ALLOWLIST` | No | empty | Comma-separated origin allowlist for callback URLs. Example: `https://bank.example.com,http://localhost:3001` |
| `JSON_LIMIT` | No | `20kb` | Express JSON request-body limit |
| `VISUAL_SESSION_TTL_MS` | No | `300000` | Visual-password session expiry (ms) |
| `VISUAL_MAX_ATTEMPTS` | No | `3` | Max verify attempts before lock |

## 4. Run

- Development:
```bash
npm run dev
```
- Production:
```bash
npm start
```

## 5. Health Check

- Endpoint: `GET /health`
- Example:
```json
{
  "status": "ok",
  "uptime": 102.33,
  "timestamp": "2026-02-12T16:48:00.000Z",
  "requestId": "b5f8..."
}
```

## 6. Auth Model

- `POST /api/users/login` returns a bearer token.
- Protected endpoints require `Authorization: Bearer <token>`.
- Token is signed using `TOKEN_SECRET`.

## 7. API Route Guide

### Users

- `POST /api/users` register
- `POST /api/users/login` login
- `GET /api/users/me` auth required
- `GET /api/users?page=1&limit=20` auth required

Register request body:
```json
{
  "name": "Admin User",
  "email": "admin@example.com",
  "password": "StrongPass123!"
}
```

Login response:
```json
{
  "token": "<bearer-token>",
  "user": {
    "id": "67ac...",
    "name": "Admin User",
    "email": "admin@example.com"
  }
}
```

### Problem Statement

- `GET /api/problem-statement` public
- `POST /api/problem-statement` auth required

### Submissions

- `POST /api/submissions` public
- `GET /api/submissions?page=1&limit=20` auth required

### Visual Password

- `POST /api/visual-password/enroll` auth required (register/update user visual pattern)
- `GET /api/visual-password/enroll/:partnerId/:userId` auth required
- `POST /api/visual-password/start`
- `POST /api/visual-password/verify`
- `GET /api/visual-password/:sessionId`
- `POST /api/visual-password/partner/consume-result`

Start request body:
```json
{
  "partnerId": "partner-bank-01",
  "userId": "user-1227",
  "callbackUrl": "http://localhost:3001/partner-live/callback",
  "state": "txn-login-001",
  "demoMode": true
}
```

Verify request body:
```json
{
  "sessionId": "12c7...",
  "pattern": [0, 3, 5, 8]
}
```

Enroll request body:
```json
{
  "partnerId": "partner-bank-01",
  "userId": "user-1227",
  "pattern": [0, 3, 5, 8]
}
```

### Live Integration Sequence

1. Partner site starts visual session (`/start`) with `callbackUrl` and `state`.
2. User completes visual auth on portal and calls `/verify`.
3. Verify response returns `partnerRedirectUrl` on PASS/FAIL.
4. Partner callback receives query params (including `token` on PASS).
5. Partner backend calls `/partner/consume-result` with token to finalize PASS.
6. Visual credential enrollment can be done via backend API or the client `/admin` console.

Note: in `production` mode, non-localhost callback URLs must use `https`.

### Curl Smoke Test (End-to-End)

1. Register and login admin user:
```bash
curl -X POST http://localhost:3000/api/users -H "Content-Type: application/json" -d "{\"name\":\"Admin\",\"email\":\"admin@example.com\",\"password\":\"StrongPass123!\"}"
curl -X POST http://localhost:3000/api/users/login -H "Content-Type: application/json" -d "{\"email\":\"admin@example.com\",\"password\":\"StrongPass123!\"}"
```
2. Enroll visual credential with bearer token from login:
```bash
curl -X POST http://localhost:3000/api/visual-password/enroll -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" -d "{\"partnerId\":\"partner-bank-01\",\"userId\":\"user-1227\",\"pattern\":[0,3,5,8]}"
```
3. Start and verify session:
```bash
curl -X POST http://localhost:3000/api/visual-password/start -H "Content-Type: application/json" -d "{\"partnerId\":\"partner-bank-01\",\"userId\":\"user-1227\",\"callbackUrl\":\"http://localhost:3001/partner-live/callback\",\"state\":\"txn-login-001\"}"
curl -X POST http://localhost:3000/api/visual-password/verify -H "Content-Type: application/json" -d "{\"sessionId\":\"<SESSION_ID>\",\"pattern\":[0,3,5,8]}"
```

## 8. Error Response Shape

All errors return JSON:
```json
{
  "message": "Validation message",
  "requestId": "9cc1..."
}
```

Use `requestId` to trace logs.

## 9. Testing

```bash
npm test
```

Current test suite validates core service and validation logic.

## 10. Production Checklist

- Set strong `TOKEN_SECRET`.
- Set strict `CORS_ORIGIN` allowlist.
- Use managed MongoDB with backups.
- Run behind HTTPS reverse proxy.
- Set `NODE_ENV=production`.
