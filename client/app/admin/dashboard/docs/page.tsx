import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

const ENDPOINTS = [
  {
    method: "POST",
    path: "/api/visual-password/init-auth",
    purpose: "Create a verification session token",
  },
  {
    method: "POST",
    path: "/api/visual-password/verify/:sessionToken",
    purpose: "Submit challenge answers for verification",
  },
  {
    method: "POST",
    path: "/api/partners/keys",
    purpose: "Create a partner API key",
  },
  {
    method: "GET",
    path: "/api/dashboard/stats",
    purpose: "Load high-level security metrics",
  },
  {
    method: "GET",
    path: "/api/dashboard/audit-logs",
    purpose: "Fetch audit logs with filters",
  },
  {
    method: "POST",
    path: "/api/demo-bank/agent/find-user",
    purpose: "Agent finds caller by account number, partner user id, or email",
  },
  {
    method: "POST",
    path: "/api/demo-bank/agent/send-otp",
    purpose: "Send identity OTP to registered email before reset",
  },
  {
    method: "POST",
    path: "/api/demo-bank/agent/verify-otp",
    purpose: "Verify OTP and auto-send visual reset link to user email",
  },
  {
    method: "POST",
    path: "/api/demo-bank/agent/admin-reset",
    purpose: "Admin-triggered reset link generation and email dispatch",
  },
];

const ADMIN_ONLY_STEPS = [
  "Login to Admin Console with admin account.",
  "Go to Developers and API and create partner key.",
  "Store the key only on backend/agent server, never in browser code.",
  "Use Authorization Bearer token for admin routes and x-api-key for partner routes.",
  "Rotate API keys and revoke old keys from the same admin panel.",
];

const AGENT_FLOW = [
  "Caller provides account number to agent.",
  "Agent system finds user record using account number/partnerUserId/email.",
  "OTP is sent to registered email.",
  "Agent verifies OTP with caller.",
  "System auto-generates visual re-enrollment link.",
  "System auto-sends reset link email to user.",
  "User opens link and sets new visual password.",
];

export default function ApiDocumentationPage() {
  return (
    <div className="flex-1 w-full bg-background text-foreground">
      <main className="mx-auto max-w-6xl px-6 py-8 space-y-6">
        <div className="border-b border-slate-200/60 pb-4 dark:border-slate-800/60">
          <h2 className="text-2xl font-bold tracking-tight">
            API Documentation
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Full setup guide for admin APIs, AI calling-agent support, and
            automatic reset-link email flow.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              AI Calling Agent Support: Full Setup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              This platform supports phone-based recovery via your own AI or
              human-assisted agent. The recommended flow is: identity check,
              OTP verification, then automatic reset-link email delivery.
            </p>
            <p>
              Use this if your bank wants a call-center style recovery journey
              while keeping visual-password reset secure and auditable.
            </p>
            <p>
              Need language-specific examples for Java, Node.js, PHP, Go, and
              ASP.NET: {" "}
              <Link
                href="/admin/dashboard/ai-calling-agent"
                className="text-primary underline"
              >
                Open AI Calling Agent Guide
              </Link>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Admin-Only API Key Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {ADMIN_ONLY_STEPS.map((step, index) => (
              <p key={step}>
                {index + 1}. {step}
              </p>
            ))}
            <pre className="overflow-x-auto rounded-md border bg-muted p-3 text-xs">{`# Admin API call (Bearer token)
curl "http://localhost:3000/api/dashboard/stats" \\
  -H "Authorization: Bearer <ADMIN_JWT>"

# Partner API call (Admin-created partner key)
curl -X POST "http://localhost:3000/api/visual-password/init-auth" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: <PARTNER_KEY>" \\
  -d '{
    "partnerId": "hdfc_bank",
    "userId": "customer-1001",
    "state": "txn-001",
    "callbackUrl": "https://partner.example.com/callback"
  }'`}</pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Auto Reset-Link Email Flow (Agent)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {AGENT_FLOW.map((step, index) => (
              <p key={step}>
                {index + 1}. {step}
              </p>
            ))}
            <p>
              Important: In the standard agent flow, OTP verify endpoint handles
              link generation and email dispatch in one step.
            </p>
            <pre className="overflow-x-auto rounded-md border bg-muted p-3 text-xs">{`# Step 1: Find user
POST /api/demo-bank/agent/find-user

# Step 2: Send OTP to registered email
POST /api/demo-bank/agent/send-otp

# Step 3: Verify OTP -> auto send reset link email
POST /api/demo-bank/agent/verify-otp

# Admin shortcut flow (no OTP, admin initiated)
POST /api/demo-bank/agent/admin-reset`}</pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Custom AI Agent Integration Guide
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              You can connect your own voice/AI stack (Twilio, SIP bot,
              custom LLM voice agent, or contact-center platform) by mapping
              the same backend recovery endpoints.
            </p>
            <p>
              Required inputs from your agent:
            </p>
            <pre className="overflow-x-auto rounded-md border bg-muted p-3 text-xs">{`{
  "agentName": "Bank Agent 102",
  "query": "<accountNumber | partnerUserId | email>",
  "partnerUserId": "customer-bank-...",
  "requestId": "<otp-request-id>",
  "otp": "123456"
}`}</pre>
            <p>
              Callback/input link templates to configure in your agent console:
            </p>
            <pre className="overflow-x-auto rounded-md border bg-muted p-3 text-xs">{`# Local/dev
http://localhost:3002/api/demo-bank/agent/find-user
http://localhost:3002/api/demo-bank/agent/send-otp
http://localhost:3002/api/demo-bank/agent/verify-otp

# Public tunnel/custom domain
https://<your-agent-domain>/api/demo-bank/agent/find-user
https://<your-agent-domain>/api/demo-bank/agent/send-otp
https://<your-agent-domain>/api/demo-bank/agent/verify-otp

# Admin direct reset endpoint
https://<your-agent-domain>/api/demo-bank/agent/admin-reset`}</pre>
            <p>
              Security notes: keep partner key server-side, enforce HTTPS,
              log agentName in audit metadata, and restrict admin-reset to
              authenticated admins only.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Endpoint Reference</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {ENDPOINTS.map((item) => (
              <div
                key={item.path}
                className="rounded-md border px-3 py-2 text-sm"
              >
                <div className="font-semibold">
                  {item.method} {item.path}
                </div>
                <div className="text-xs text-muted-foreground">
                  {item.purpose}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Agent OTP Send Example</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="overflow-x-auto rounded-md border bg-muted p-3 text-xs">
                {`curl -X POST http://localhost:3002/api/demo-bank/agent/send-otp \\
  -H "Content-Type: application/json" \\
  -d '{
    "partnerUserId": "customer-bank-9f5cb9dcf002",
    "agentName": "Agent-Desk-7"
  }'`}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Agent Verify OTP (Auto Email) Example
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="overflow-x-auto rounded-md border bg-muted p-3 text-xs">
                {`curl -X POST http://localhost:3002/api/demo-bank/agent/verify-otp \\
  -H "Content-Type: application/json" \\
  -d '{
    "requestId": "<OTP_REQUEST_ID>",
    "otp": "123456",
    "agentName": "Agent-Desk-7"
  }'

# Success response includes auto email status and (dev mode) enrollUrl.`}
              </pre>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Production Checklist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>1. Keep admin JWT and partner API keys separate.</p>
            <p>2. Allow only admin users to run direct reset endpoints.</p>
            <p>3. Configure SMTP and test auto-email before go-live.</p>
            <p>4. Enforce HTTPS and secure cookie/session policies.</p>
            <p>5. Rotate API keys and audit high-risk events weekly.</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
