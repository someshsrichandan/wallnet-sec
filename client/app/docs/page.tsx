"use client";

import Link from "next/link";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/* ─────────────── data ─────────────── */

const apiEndpoints = [
  {
    id: "init-auth",
    method: "POST",
    path: "/api/product/v1/init-auth",
    badge: "Partner Backend → FraudShield",
    purpose:
      "Start a visual verification session after the user has logged in on the partner site.",
    headers: `Content-Type: application/json
x-api-key: YOUR_API_KEY`,
    requestBody: `{
  "partnerId":   "hdfc_bank",          // Your partner ID (assigned during onboarding)
  "userId":      "customer-001",       // The user's ID in YOUR system
  "callbackUrl": "https://yoursite.com/auth/visual/callback",  // Where we redirect after verification
  "state":       "random-nonce-abc123" // CSRF nonce (you generate, we echo back)
}`,
    responseBody: `{
  "sessionToken": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "verifyPath":   "/verify/a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "expiresAt":    "2026-02-16T12:05:00.000Z"
}`,
    notes: [
      "callbackUrl must be in the partner callback allowlist (configured server-side).",
      "callbackUrl must use HTTPS in production.",
      "state must be a unique random value per request — used for CSRF protection.",
      "Response status: 201 Created.",
    ],
  },
  {
    id: "challenge",
    method: "GET",
    path: "/api/product/v1/challenge/:sessionToken",
    badge: "FraudShield Hosted UI (internal)",
    purpose:
      "Fetch the visual challenge data. Used by our hosted verification page — partners do NOT call this.",
    headers: `— (no API key required, session-bound)`,
    requestBody: `— (no request body, sessionToken is a path parameter)`,
    responseBody: `{
  "sessionToken": "a1b2c3d4-...",
  "expiresAt":    "2026-02-16T12:05:00.000Z",
  "maxAttempts":  3,
  "attempts":     0,
  "vegetables":   [{ "name": "Carrot", "number": 42, "imageUrl": "..." }, ...],
  "alphabetGrid": ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"],
  "keypadLayout": ["3", "7", "1", "9", "0", "5", "8", "2", "6", "4"],
  "saltHint":     5,
  "formulaMode":  "SALT_ADD",
  "catalogType":  "VEGETABLE",
  "formulaHint":  {}
}`,
    notes: [
      "Device fingerprint is captured on first access — same device must complete verification.",
      "Partners do NOT call this endpoint; it's used by our hosted /verify page.",
    ],
  },
  {
    id: "verify",
    method: "POST",
    path: "/api/product/v1/verify",
    badge: "FraudShield Hosted UI (internal)",
    purpose:
      "Submit user answers. Used by our hosted verification page — partners do NOT call this.",
    headers: `Content-Type: application/json`,
    requestBody: `{
  "sessionToken": "a1b2c3d4-...",
  "inputs": {
    "A": "3", "B": "7", "C": "1", "D": "4", "E": "2",
    "F": "8", "G": "5", "H": "9", "I": "0", "J": "6"
  }
}`,
    responseBody: `{
  "result":                "PASS",        // or "FAIL"
  "status":                "PASS",        // PASS | FAIL | LOCKED | EXPIRED
  "honeypotDetected":       false,
  "attempts":               1,
  "maxAttempts":            3,
  "remainingAttempts":      2,
  "verificationSignature": "eyJhbG...",   // Only present on PASS
  "partnerRedirectUrl":    "https://yoursite.com/auth/visual/callback?result=PASS&signature=eyJhbG...&state=random-nonce-abc123",
  "expiresAt":             "2026-02-16T12:05:00.000Z"
}`,
    notes: [
      "All alphabet boxes must be filled — partial submissions are rejected.",
      "After PASS, user is redirected to the partner's callbackUrl with result, signature, and state.",
      "Partners do NOT call this endpoint; it's used by our hosted /verify page.",
    ],
  },
  {
    id: "consume-result",
    method: "POST",
    path: "/api/product/v1/partner/consume-result",
    badge: "Partner Backend → FraudShield (MANDATORY)",
    purpose:
      "Validate the signed verification result. This is the ONLY way to confirm a PASS.",
    headers: `Content-Type: application/json
x-api-key: YOUR_API_KEY`,
    requestBody: `{
  "signature": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}`,
    responseBody: `{
  "result":      "PASS",
  "sessionToken": "a1b2c3d4-...",
  "partnerId":   "hdfc_bank",
  "userId":      "customer-001",
  "state":       "random-nonce-abc123",
  "consumedAt":  "2026-02-16T12:03:45.000Z"
}`,
    notes: [
      "This MUST be called from your backend, never from client-side code.",
      "The signature is a signed JWT-like token — it cannot be forged.",
      "The state field should match what you sent in init-auth.",
      "Response status: 200 OK.",
      "If the signature is invalid or expired, you'll get 401.",
    ],
  },
  {
    id: "session-status",
    method: "GET",
    path: "/api/product/v1/session/:sessionToken",
    badge: "Partner Backend → FraudShield (optional)",
    purpose:
      "Check session status for polling, audit trails, or troubleshooting.",
    headers: `x-api-key: YOUR_API_KEY`,
    requestBody: `— (no request body, sessionToken is a path parameter)`,
    responseBody: `{
  "sessionToken":   "a1b2c3d4-...",
  "partnerId":      "hdfc_bank",
  "userId":         "customer-001",
  "status":         "PASS",          // PENDING | PASS | FAIL | LOCKED | EXPIRED
  "attemptCount":   1,
  "maxAttempts":    3,
  "honeypotDetected": false,
  "expiresAt":      "2026-02-16T12:05:00.000Z",
  "verifiedAt":     "2026-02-16T12:03:30.000Z",
  "consumedAt":     "2026-02-16T12:03:45.000Z"
}`,
    notes: [
      "Useful for polling the session status if using popup flow.",
      "Also useful for admin audit trails and debugging.",
    ],
  },
  {
    id: "meta",
    method: "GET",
    path: "/api/product/v1/meta",
    badge: "Health Check",
    purpose: "Check API availability, routing metadata, and current mode.",
    headers: `— (no authentication required)`,
    requestBody: `— (no request body)`,
    responseBody: `{
  "product":   "Visual Password Security Layer",
  "version":   "v1",
  "mode":      "live",
  "hasApiKey":           true,
  "hasSandboxApiKey":    false,
  "docsPath":            "/docs",
  "developerPortalPath": "/developers",
  "endpoints": {
    "initAuth":       "/api/product/v1/init-auth",
    "challenge":      "/api/product/v1/challenge/:sessionToken",
    "verify":         "/api/product/v1/verify",
    "consumeResult":  "/api/product/v1/partner/consume-result",
    "session":        "/api/product/v1/session/:sessionToken"
  }
}`,
    notes: [
      "Use this for connectivity tests during integration setup.",
      "Supports ?mode=test|live query parameter.",
    ],
  },
];

const quickStartSteps = [
  {
    num: "1",
    title: "Get Your Credentials",
    detail:
      "Contact the FraudShield team to receive your partnerId and API key. You'll get separate keys for test and live environments.",
  },
  {
    num: "2",
    title: "Enroll Users in Admin Panel",
    detail:
      "Open /admin, register/login, and create visual profiles for each user: choose 4 secret images, 2 secret letters, formula mode, and salt value.",
  },
  {
    num: "3",
    title: "Integrate init-auth in Your Backend",
    detail:
      "After your existing username/password login succeeds, call POST /api/product/v1/init-auth with partnerId, userId, callbackUrl, and a random state nonce.",
  },
  {
    num: "4",
    title: "Redirect User to Verification",
    detail:
      "Use the verifyPath from the init-auth response. Either redirect the user or open it in a popup window.",
  },
  {
    num: "5",
    title: "Handle the Callback",
    detail:
      "When the user completes (or fails) verification, we redirect to your callbackUrl with result, signature, and state parameters.",
  },
  {
    num: "6",
    title: "Validate with consume-result",
    detail:
      "Your backend calls POST /api/product/v1/partner/consume-result with the signature. If result is PASS, create your app session. Otherwise, deny login.",
  },
];

const securityControls = [
  {
    title: "State Nonce (CSRF Protection)",
    detail:
      "Generate a unique random state for every init-auth call. On callback, verify it matches. This prevents cross-site request forgery.",
  },
  {
    title: "Server-Side Validation",
    detail:
      "Never trust callback query parameters alone. Always call consume-result from your backend to cryptographically verify the signature.",
  },
  {
    title: "API Key Security",
    detail:
      "Your API key must only exist in your backend environment variables. Never expose it in frontend code, mobile apps, or public repositories.",
  },
  {
    title: "HTTPS Only",
    detail:
      "In production, callbackUrl must use HTTPS. Our API enforces this automatically.",
  },
  {
    title: "Device Fingerprinting",
    detail:
      "The challenge must be solved on the same device/browser that loaded it. This prevents session hijacking and proxy attacks.",
  },
  {
    title: "Session Expiry",
    detail:
      "Sessions expire after 5 minutes by default. Expired sessions cannot be verified.",
  },
  {
    title: "Anti-Screenshot",
    detail:
      "Our verification page blocks screenshots, screen recording, and screen sharing. Visual secrets never appear in captured images.",
  },
  {
    title: "Honeypot Detection",
    detail:
      "If a user enters the original (unmodified) number instead of the salted result, we flag it as a potential phishing relay.",
  },
];

const errorCodes = [
  { code: "201", type: "success", meaning: "Session created (init-auth)" },
  { code: "200", type: "success", meaning: "Request successful" },
  { code: "400", type: "error", meaning: "Bad request — missing or invalid parameters" },
  { code: "401", type: "error", meaning: "Unauthorized — invalid API key or expired token" },
  { code: "403", type: "error", meaning: "Forbidden — callback URL not in allowlist or wrong API key" },
  { code: "404", type: "error", meaning: "Not found — user not enrolled or session not found" },
  { code: "409", type: "error", meaning: "Conflict — session already verified" },
  { code: "410", type: "error", meaning: "Gone — session expired" },
  { code: "423", type: "error", meaning: "Locked — too many failed attempts" },
  { code: "429", type: "error", meaning: "Rate limited — too many requests" },
];

const flowModes = [
  {
    mode: "Redirect Flow",
    steps: [
      "User clicks login on partner site → partner validates username/password.",
      "Partner backend calls init-auth → gets verifyPath.",
      "Partner redirects user to FraudShield: 302 → /verify/:sessionToken.",
      "User solves visual challenge on FraudShield hosted page.",
      "FraudShield redirects back to callbackUrl with result + signature + state.",
      "Partner backend calls consume-result to validate → creates session on PASS.",
    ],
    pros: "Simple, works everywhere. No popup blocking issues.",
    cons: "User leaves partner site briefly.",
  },
  {
    mode: "Popup Flow",
    steps: [
      "User clicks login on partner site → partner validates username/password.",
      "Partner backend calls init-auth → gets verifyPath.",
      "Partner frontend opens popup: window.open(verifyPath, ...).",
      "User solves visual challenge in popup.",
      "Popup sends postMessage to opener with result + signature.",
      "Partner frontend receives message, calls backend to consume-result.",
    ],
    pros: "User stays on partner site. Seamless UX.",
    cons: "Popup may be blocked by browser. Need fallback to redirect.",
  },
];

const codeSnippetsByLang: Record<string, { label: string; initAuth: string; consumeResult: string }> = {
  nodejs: {
    label: "Node.js",
    initAuth: `// Node.js — Start visual verification
const res = await fetch(
  \`\${process.env.FRAUDSHIELD_URL}/api/product/v1/init-auth?mode=live\`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.FRAUDSHIELD_API_KEY,
    },
    body: JSON.stringify({
      partnerId: "your_company",
      userId: "user@example.com",
      callbackUrl: "https://yoursite.com/callback",
      state: crypto.randomUUID(),
    }),
  }
);
const { sessionToken, verifyPath } = await res.json();
res.redirect(verifyPath);`,
    consumeResult: `// Node.js — Validate result
const res = await fetch(
  \`\${process.env.FRAUDSHIELD_URL}/api/product/v1/partner/consume-result?mode=live\`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.FRAUDSHIELD_API_KEY,
    },
    body: JSON.stringify({ signature }),
  }
);
const { result, userId } = await res.json();
if (result === "PASS") createSession(userId);`,
  },
  python: {
    label: "Python",
    initAuth: `# Python — Start visual verification
response = requests.post(
    f"{FRAUDSHIELD_URL}/api/product/v1/init-auth?mode=live",
    headers={
        "Content-Type": "application/json",
        "x-api-key": FRAUDSHIELD_API_KEY,
    },
    json={
        "partnerId": "your_company",
        "userId": "user@example.com",
        "callbackUrl": "https://yoursite.com/callback",
        "state": str(uuid.uuid4()),
    },
)
data = response.json()
return redirect(data["verifyPath"])`,
    consumeResult: `# Python — Validate result
response = requests.post(
    f"{FRAUDSHIELD_URL}/api/product/v1/partner/consume-result?mode=live",
    headers={
        "Content-Type": "application/json",
        "x-api-key": FRAUDSHIELD_API_KEY,
    },
    json={"signature": signature},
)
data = response.json()
if data["result"] == "PASS":
    create_session(data["userId"])`,
  },
  java: {
    label: "Java",
    initAuth: `// Java (Spring) — Start visual verification
Map<String, Object> body = Map.of(
    "partnerId", "your_company",
    "userId", userId,
    "callbackUrl", "https://yoursite.com/callback",
    "state", UUID.randomUUID().toString()
);

Map<String, Object> data = webClient.post()
    .uri(fraudshieldUrl + "/api/product/v1/init-auth?mode=live")
    .header("x-api-key", apiKey)
    .bodyValue(body)
    .retrieve()
    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
    .block();

return "redirect:" + data.get("verifyPath");`,
    consumeResult: `// Java — Validate result
Map<String, Object> data = webClient.post()
    .uri(fraudshieldUrl + "/api/product/v1/partner/consume-result?mode=live")
    .header("x-api-key", apiKey)
    .bodyValue(Map.of("signature", signature))
    .retrieve()
    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
    .block();

if ("PASS".equals(data.get("result"))) {
    createSession((String) data.get("userId"));
}`,
  },
  php: {
    label: "PHP",
    initAuth: `<?php // PHP — Start visual verification
$ch = curl_init("$fraudshieldUrl/api/product/v1/init-auth?mode=live");
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        "Content-Type: application/json",
        "x-api-key: $apiKey",
    ],
    CURLOPT_POSTFIELDS => json_encode([
        "partnerId"   => "your_company",
        "userId"      => $userId,
        "callbackUrl" => "https://yoursite.com/callback",
        "state"       => bin2hex(random_bytes(16)),
    ]),
    CURLOPT_RETURNTRANSFER => true,
]);
$data = json_decode(curl_exec($ch), true);
header("Location: " . $data["verifyPath"]);`,
    consumeResult: `<?php // PHP — Validate result
$ch = curl_init("$fraudshieldUrl/api/product/v1/partner/consume-result?mode=live");
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        "Content-Type: application/json",
        "x-api-key: $apiKey",
    ],
    CURLOPT_POSTFIELDS => json_encode(["signature" => $signature]),
    CURLOPT_RETURNTRANSFER => true,
]);
$data = json_decode(curl_exec($ch), true);
if ($data["result"] === "PASS") {
    createSession($data["userId"]);
}`,
  },
  dotnet: {
    label: "ASP.NET",
    initAuth: `// ASP.NET (C#) — Start visual verification
var response = await httpClient.PostAsJsonAsync(
    $"{fraudshieldUrl}/api/product/v1/init-auth?mode=live",
    new {
        partnerId = "your_company",
        userId,
        callbackUrl = "https://yoursite.com/callback",
        state = Guid.NewGuid().ToString()
    }
);
var data = await response.Content.ReadFromJsonAsync<InitAuthResponse>();
return Redirect(data.VerifyPath);`,
    consumeResult: `// ASP.NET (C#) — Validate result
var response = await httpClient.PostAsJsonAsync(
    $"{fraudshieldUrl}/api/product/v1/partner/consume-result?mode=live",
    new { signature }
);
var data = await response.Content.ReadFromJsonAsync<ConsumeResponse>();
if (data.Result == "PASS") {
    CreateSession(data.UserId);
}`,
  },
  go: {
    label: "Go",
    initAuth: `// Go — Start visual verification
payload, _ := json.Marshal(map[string]string{
    "partnerId":   "your_company",
    "userId":      userId,
    "callbackUrl": "https://yoursite.com/callback",
    "state":       uuid.New().String(),
})

req, _ := http.NewRequest("POST",
    fraudshieldURL+"/api/product/v1/init-auth?mode=live",
    bytes.NewBuffer(payload),
)
req.Header.Set("Content-Type", "application/json")
req.Header.Set("x-api-key", apiKey)

resp, _ := http.DefaultClient.Do(req)
var data InitAuthResponse
json.NewDecoder(resp.Body).Decode(&data)

http.Redirect(w, r, data.VerifyPath, http.StatusFound)`,
    consumeResult: `// Go — Validate result
payload, _ := json.Marshal(map[string]string{"signature": signature})
req, _ := http.NewRequest("POST",
    fraudshieldURL+"/api/product/v1/partner/consume-result?mode=live",
    bytes.NewBuffer(payload),
)
req.Header.Set("Content-Type", "application/json")
req.Header.Set("x-api-key", apiKey)

resp, _ := http.DefaultClient.Do(req)
var data ConsumeResponse
json.NewDecoder(resp.Body).Decode(&data)

if data.Result == "PASS" {
    createSession(data.UserID)
}`,
  },
};

/* ─────────────── component ─────────────── */

export default function DocsPage() {
  const [activeEndpoint, setActiveEndpoint] = useState("init-auth");
  const [activeLang, setActiveLang] = useState("nodejs");

  const selectedEndpoint = apiEndpoints.find((item) => item.id === activeEndpoint) || apiEndpoints[0];
  const selectedLang = codeSnippetsByLang[activeLang] || codeSnippetsByLang.nodejs;

  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#f4f8ff] text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[26rem] bg-[radial-gradient(circle_at_20%_0%,rgba(59,130,246,0.18),transparent_40%),radial-gradient(circle_at_85%_12%,rgba(14,165,233,0.18),transparent_35%)] dark:opacity-30" />

      <main className="relative mx-auto flex w-full max-w-7xl flex-col gap-16 px-6 py-24 sm:py-32">
        <section className="relative overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white/50 p-10 shadow-2xl backdrop-blur-xl dark:bg-slate-900/50 dark:border-slate-800">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-emerald-50/50 dark:from-slate-900 dark:to-slate-800 -z-10" />

          <div className="flex flex-wrap items-center gap-3 mb-8">
            <Badge className="rounded-full bg-slate-900 px-4 py-1.5 text-xs font-bold tracking-widest text-white shadow-lg shadow-indigo-500/20 dark:bg-white dark:text-slate-900">
              API DOCUMENTATION
            </Badge>
            <Badge variant="secondary" className="rounded-full px-4 py-1.5 text-xs font-semibold tracking-widest text-slate-600 bg-white border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">
              VERSION 1.0
            </Badge>
            <Badge variant="outline" className="rounded-full border-slate-300 px-4 py-1.5 text-xs font-semibold tracking-widest bg-white/50 dark:bg-slate-800/50 dark:border-slate-700">
              REST
            </Badge>
          </div>
          
          <h1 className="max-w-4xl text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-6xl mb-6">
            Integration reference <br className="hidden lg:block"/> for partner teams
          </h1>
          
          <p className="max-w-3xl text-lg leading-relaxed text-slate-600 dark:text-slate-400 mb-10">
            End-to-end reference for init-auth, hosted verification, callback handling, and signature consumption. Designed for security-first integration.
          </p>

          <div className="flex flex-wrap gap-4">
            <Button asChild size="lg" className="rounded-full h-14 px-8 text-base font-semibold shadow-xl shadow-indigo-600/20 hover:scale-105 transition-transform bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900">
              <Link href="/developers">Developer Portal</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full h-14 px-8 text-base border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
              <Link href="/partner-live?flow=popup&mode=test">Run Test Flow</Link>
            </Button>
            <Button asChild variant="ghost" className="rounded-full h-14 px-6 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
              <Link href="/">Home</Link>
            </Button>
          </div>
        </section>

        <Alert className="border-l-4 border-l-emerald-500 border-t border-r border-b border-emerald-100 bg-emerald-50/80 p-6 dark:bg-emerald-900/10 dark:border-emerald-900/50">
          <AlertTitle className="text-lg font-bold text-emerald-900 dark:text-emerald-400 mb-2">Base URL</AlertTitle>
          <AlertDescription className="text-base font-mono text-emerald-800 dark:text-emerald-400/90 break-all">
            https://fraudshield.example.com/api/product/v1/
            <span className="block mt-2 font-sans text-sm text-emerald-700 dark:text-emerald-500">
              append <code className="rounded bg-emerald-200/50 px-1.5 py-0.5 font-bold mx-1 dark:bg-emerald-900/50">?mode=test</code> for sandbox
            </span>
          </AlertDescription>
        </Alert>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className="border-slate-300/70 bg-white/90 dark:bg-slate-800/90 dark:border-slate-700/70">
            <CardHeader>
              <CardTitle>Quick Start Guide</CardTitle>
              <CardDescription>Six implementation milestones from setup to production.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {quickStartSteps.map((step) => (
                <div key={step.num} className="flex gap-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 dark:bg-slate-700/60 dark:border-slate-600">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                    {step.num}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{step.title}</p>
                    <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">{step.detail}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-4">
            {flowModes.map((mode, index) => (
              <article
                key={mode.mode}
                className={`rounded-2xl border border-slate-300/70 dark:border-slate-700/70 p-5 ${
                  index === 0 ? "bg-white dark:bg-slate-800" : "bg-gradient-to-br from-white to-sky-50 dark:from-slate-800 dark:to-slate-800/70"
                }`}
              >
                <h3 className="text-lg font-semibold">{mode.mode}</h3>
                <div className="mt-3 space-y-2">
                  {mode.steps.map((step, idx) => (
                    <div key={idx} className="flex gap-3 text-xs text-slate-700 dark:text-slate-300">
                      <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-slate-500" />
                      <p>{step}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid gap-2 text-xs md:grid-cols-2">
                  <div className="rounded-lg bg-emerald-50 px-2 py-2 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                    <strong>Pros:</strong> {mode.pros}
                  </div>
                  <div className="rounded-lg bg-amber-50 px-2 py-2 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                    <strong>Cons:</strong> {mode.cons}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[0.8fr_1.5fr] items-start">
          <div className="sticky top-10 space-y-4">
             <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
                <h3 className="text-xl font-bold mb-4 px-2">Endpoints</h3>
                <div className="space-y-2">
                  {apiEndpoints.map((ep) => (
                    <button
                      key={ep.id}
                      type="button"
                      onClick={() => setActiveEndpoint(ep.id)}
                      className={`group w-full rounded-2xl border px-4 py-3 text-left transition-all ${
                        activeEndpoint === ep.id
                          ? "border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/20 dark:bg-white dark:text-slate-900 dark:border-white"
                          : "border-transparent bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:bg-slate-800/50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                         <span className={`text-[10px] font-bold uppercase tracking-wider ${
                            activeEndpoint === ep.id ? "text-white/70 dark:text-slate-500" : ep.method === "POST" ? "text-emerald-600 dark:text-emerald-400" : "text-sky-600 dark:text-sky-400"
                         }`}>
                            {ep.method}
                         </span>
                         {activeEndpoint === ep.id && <span className="h-1.5 w-1.5 rounded-full bg-white dark:bg-slate-900 animate-pulse"/>}
                      </div>
                      <p className={`font-mono text-xs truncate ${activeEndpoint === ep.id ? "text-white dark:text-slate-900" : "text-slate-500 dark:text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white"}`}>
                         {ep.path}
                      </p>
                    </button>
                  ))}
                </div>
             </div>
          </div>

          <Card className="overflow-hidden rounded-[2rem] border-0 shadow-2xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800">
            <div className="border-b border-slate-100 bg-slate-50/50 p-8 dark:bg-slate-800/50 dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <Badge className={`rounded-lg px-3 py-1 text-xs font-bold shadow-sm ${
                    selectedEndpoint.method === "POST" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-sky-500 hover:bg-sky-600"
                  }`}>
                  {selectedEndpoint.method}
                </Badge>
                <code className="font-mono text-base font-medium text-slate-900 dark:text-white px-2 py-1 rounded bg-white border border-slate-200 shadow-sm dark:bg-slate-800 dark:border-slate-700">
                   {selectedEndpoint.path}
                </code>
              </div>
              <Badge variant="outline" className="mb-4 rounded-full border-slate-200 bg-white px-4 py-1 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400">
                {selectedEndpoint.badge}
              </Badge>
              <p className="text-lg leading-relaxed text-slate-600 dark:text-slate-300">
                 {selectedEndpoint.purpose}
              </p>
            </div>
            
            <CardContent className="space-y-8 p-8">
              <div>
                <h4 className="mb-3 text-sm font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Headers
                </h4>
                <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:bg-slate-950 dark:border-slate-800">
                   <pre className="overflow-x-auto p-5 text-sm font-mono text-slate-700 dark:text-slate-300 leading-loose">
                     {selectedEndpoint.headers}
                   </pre>
                </div>
              </div>

              <div className="grid gap-8 xl:grid-cols-2">
                <div>
                  <h4 className="mb-3 text-sm font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Request Body
                  </h4>
                  <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 shadow-lg dark:border-slate-800">
                     <div className="absolute top-0 left-0 right-0 h-8 bg-slate-800/50 border-b border-white/5 flex items-center px-4 space-x-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500/20"/>
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20"/>
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20"/>
                     </div>
                     <pre className="overflow-x-auto pt-12 pb-5 px-5 text-xs font-mono text-slate-300 leading-loose">
                       {selectedEndpoint.requestBody}
                     </pre>
                  </div>
                </div>
                <div>
                  <h4 className="mb-3 text-sm font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Response Body
                  </h4>
                  <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 shadow-lg dark:border-slate-800">
                     <div className="absolute top-0 left-0 right-0 h-8 bg-slate-800/50 border-b border-white/5 flex items-center px-4 space-x-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500/20"/>
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20"/>
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20"/>
                     </div>
                     <pre className="overflow-x-auto pt-12 pb-5 px-5 text-xs font-mono text-emerald-400 leading-loose">
                       {selectedEndpoint.responseBody}
                     </pre>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-6 border border-slate-100 dark:bg-slate-800/50 dark:border-slate-800">
                <h4 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Important Notes</h4>
                <ul className="grid gap-3">
                  {selectedEndpoint.notes.map((note, idx) => (
                    <li key={idx} className="flex gap-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      <span className="mt-1.5 h-2 w-2 rounded-full bg-indigo-500 shrink-0 shadow-sm shadow-indigo-500/50" />
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4 rounded-3xl border border-slate-300/70 bg-white/90 p-6 dark:bg-slate-800/90 dark:border-slate-700/70">
          <div>
            <h2 className="text-2xl font-semibold">Code Examples</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              init-auth and consume-result snippets by backend language.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(codeSnippetsByLang).map(([key, snippet]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveLang(key)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  activeLang === key
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                }`}
              >
                {snippet.label}
              </button>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                init-auth
              </p>
              <pre className="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-950 p-4 text-xs leading-relaxed text-slate-100">
                {selectedLang.initAuth}
              </pre>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                consume-result
              </p>
              <pre className="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-950 p-4 text-xs leading-relaxed text-slate-100">
                {selectedLang.consumeResult}
              </pre>
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <Card className="border-slate-300/70 bg-white/90 dark:bg-slate-800/90 dark:border-slate-700/70">
            <CardHeader>
              <CardTitle>HTTP Status Codes</CardTitle>
              <CardDescription>Response mapping for integration and retry logic.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {errorCodes.map((code) => (
                <div key={code.code} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:bg-slate-700/60 dark:border-slate-600">
                  <span
                    className={`rounded px-2 py-0.5 font-mono text-xs font-semibold text-white ${
                      code.type === "success" ? "bg-emerald-600" : "bg-rose-600"
                    }`}
                  >
                    {code.code}
                  </span>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{code.meaning}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-slate-300/70 bg-white/90 dark:bg-slate-800/90 dark:border-slate-700/70">
            <CardHeader>
              <CardTitle>Security Controls</CardTitle>
              <CardDescription>Built-in protections and partner-side best practices.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              {securityControls.map((control) => (
                <div key={control.title} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:bg-slate-700/60 dark:border-slate-600">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{control.title}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">{control.detail}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <Card className="border-slate-300/70 bg-white/90 dark:bg-slate-800/90 dark:border-slate-700/70">
          <CardHeader>
            <CardTitle>Environment Configuration</CardTitle>
            <CardDescription>Use separate keys for test and live environments.</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-950 p-4 text-xs leading-relaxed text-slate-100">
              {`# FraudShield integration
FRAUDSHIELD_BASE_URL=https://fraudshield.example.com
FRAUDSHIELD_API_KEY=pk_live_your-api-key-here
FRAUDSHIELD_PARTNER_ID=your_company_id
APP_BASE_URL=https://your-app.example.com

# Sandbox (optional, for ?mode=test)
FRAUDSHIELD_SANDBOX_URL=https://sandbox.fraudshield.example.com
FRAUDSHIELD_SANDBOX_API_KEY=pk_test_your-sandbox-key

# Next.js frontend proxy (if using our starter template)
BACKEND_API_BASE_URL=http://localhost:3000/api
PARTNER_SERVER_API_KEY=dev-partner-key-change-me`}
            </pre>
          </CardContent>
        </Card>

        <Alert className="border-indigo-300 bg-indigo-50/90 dark:bg-indigo-900/20 dark:border-indigo-700/50">
          <AlertTitle className="text-indigo-900 dark:text-indigo-300">Need help integrating?</AlertTitle>
          <AlertDescription className="text-indigo-800 dark:text-indigo-400">
            Use the{" "}
            <Link href="/developers" className="font-semibold underline">
              Developer Portal
            </Link>{" "}
            for stack-specific callback handlers, or open{" "}
            <Link href="/partner-live" className="font-semibold underline">
              Live Demo
            </Link>{" "}
            for end-to-end flow testing.
          </AlertDescription>
        </Alert>
      </main>
    </div>
  );
}
