"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const FLOW = [
  "Find caller by account number, partner user id, or email.",
  "Send OTP to registered email from agent backend.",
  "Verify OTP in agent backend.",
  "Auto-generate visual reset link and auto-email it to user.",
  "Track each step in audit logs.",
];

const SETTINGS_FIELDS = [
  "partnerId",
  "providerName",
  "agentBaseUrl",
  "findUserPath",
  "sendOtpPath",
  "verifyOtpPath",
  "adminResetPath",
  "webhookUrl",
  "callbackBaseUrl",
  "inputSchemaUrl",
  "authType",
  "outboundSecret",
  "customHeaders",
  "supportedLanguages",
  "enableAutoResetEmail",
  "enableAdminReset",
  "enabled",
];

const ENV_KEYS = [
  "BACKEND_API_BASE_URL",
  "NEXT_PUBLIC_API_BASE_URL",
  "VISUAL_BACKEND_API_BASE_URL",
  "DEMO_BANK_URL",
  "NEXT_PUBLIC_DEMO_BANK_URL",
  "VISUAL_VERIFY_ORIGIN",
  "DEMO_BANK_PUBLIC_ORIGIN",
  "VISUAL_PARTNER_ID",
  "VISUAL_API_KEY",
];

const PROVIDERS = ["twilio", "amazon-connect", "genesys"] as const;
type ProviderId = (typeof PROVIDERS)[number];

const PROVIDER_LABELS = {
  twilio: "Twilio Voice",
  "amazon-connect": "Amazon Connect",
  genesys: "Genesys Cloud",
} as const;

const PROVIDER_GUIDES: Record<
  ProviderId,
  {
    summary: string;
    config: string;
    requestSchema: string;
    responseSchema: string;
  }
> = {
  twilio: {
    summary:
      "Use Twilio Studio/Functions to collect caller inputs, then call your backend endpoints for lookup, OTP, and verify.",
    config: `{
  "providerName": "twilio",
  "partnerId": "hdfc_bank",
  "agentBaseUrl": "https://voice.yourbank.com",
  "findUserPath": "/api/demo-bank/agent/find-user",
  "sendOtpPath": "/api/demo-bank/agent/send-otp",
  "verifyOtpPath": "/api/demo-bank/agent/verify-otp",
  "adminResetPath": "/api/demo-bank/agent/admin-reset",
  "webhookUrl": "https://voice.yourbank.com/twilio/events",
  "callbackBaseUrl": "https://voice.yourbank.com/twilio/callbacks",
  "inputSchemaUrl": "https://voice.yourbank.com/schemas/recovery-input.json",
  "authType": "API_KEY",
  "customHeaders": ["x-call-provider: twilio", "x-workflow: visual-recovery"],
  "supportedLanguages": ["nodejs", "java", "php", "golang", "aspnet"],
  "enableAutoResetEmail": true,
  "enableAdminReset": true,
  "enabled": true
}`,
    requestSchema: `POST /api/demo-bank/agent/verify-otp
{
  "requestId": "9f67d267-b0f1-4f74-9a77-bf59c9b1ec11",
  "otp": "123456",
  "agentName": "Twilio-Agent-01"
}`,
    responseSchema: `200 OK
{
  "ok": true,
  "message": "Identity verified! Reset link sent to registered email.",
  "emailSent": true,
  "emailMasked": "su***@mail.com",
  "linkExpiresInMinutes": 15,
  "enrollUrl": "https://..." 
}`,
  },
  "amazon-connect": {
    summary:
      "Use Contact Flows + Lambda to forward caller inputs to your agent APIs. Store auth tokens in AWS Secrets Manager.",
    config: `{
  "providerName": "amazon-connect",
  "partnerId": "hdfc_bank",
  "agentBaseUrl": "https://connect.yourbank.com",
  "findUserPath": "/api/demo-bank/agent/find-user",
  "sendOtpPath": "/api/demo-bank/agent/send-otp",
  "verifyOtpPath": "/api/demo-bank/agent/verify-otp",
  "adminResetPath": "/api/demo-bank/agent/admin-reset",
  "webhookUrl": "https://connect.yourbank.com/events",
  "callbackBaseUrl": "https://connect.yourbank.com/callback",
  "inputSchemaUrl": "https://connect.yourbank.com/schemas/recovery-input.json",
  "authType": "BEARER",
  "customHeaders": ["x-call-provider: amazon-connect", "x-channel: voice"],
  "supportedLanguages": ["nodejs", "java", "php", "golang", "aspnet"],
  "enableAutoResetEmail": true,
  "enableAdminReset": false,
  "enabled": true
}`,
    requestSchema: `POST /api/demo-bank/agent/send-otp
{
  "partnerUserId": "customer-bank-82baf01391d1",
  "agentName": "Connect-Agent-Desk-7"
}`,
    responseSchema: `200 OK
{
  "ok": true,
  "requestId": "abf2718f-7ef0-45a5-8d56-6eaef94d306d",
  "emailMasked": "su***@mail.com",
  "expiresInSeconds": 300
}`,
  },
  genesys: {
    summary:
      "Use Architect Data Actions to call your backend. Map caller DTMF and speech fields to query/requestId/otp inputs.",
    config: `{
  "providerName": "genesys",
  "partnerId": "hdfc_bank",
  "agentBaseUrl": "https://genesys.yourbank.com",
  "findUserPath": "/api/demo-bank/agent/find-user",
  "sendOtpPath": "/api/demo-bank/agent/send-otp",
  "verifyOtpPath": "/api/demo-bank/agent/verify-otp",
  "adminResetPath": "/api/demo-bank/agent/admin-reset",
  "webhookUrl": "https://genesys.yourbank.com/events",
  "callbackBaseUrl": "https://genesys.yourbank.com/callback",
  "inputSchemaUrl": "https://genesys.yourbank.com/schemas/recovery-input.json",
  "authType": "API_KEY",
  "customHeaders": ["x-call-provider: genesys", "x-tenant: bank-prod"],
  "supportedLanguages": ["nodejs", "java", "php", "golang", "aspnet"],
  "enableAutoResetEmail": true,
  "enableAdminReset": true,
  "enabled": true
}`,
    requestSchema: `POST /api/demo-bank/agent/find-user
{
  "query": "123456"
}`,
    responseSchema: `200 OK
{
  "found": true,
  "user": {
    "partnerUserId": "customer-bank-82baf01391d1",
    "fullName": "Sample User",
    "emailMasked": "su***@mail.com",
    "phoneMasked": "XXXXXX5678",
    "accountNumber": "123456",
    "visualEnabled": true
  }
}`,
  },
};

export default function AiCallingAgentPage() {
  const [selectedProvider, setSelectedProvider] = useState<ProviderId>("twilio");
  const providerGuide = useMemo(
    () => PROVIDER_GUIDES[selectedProvider],
    [selectedProvider],
  );

  return (
    <div className="flex-1 w-full bg-background text-foreground">
      <main className="mx-auto max-w-6xl px-6 py-8 space-y-6">
        <div className="border-b border-slate-200/60 pb-4 dark:border-slate-800/60">
          <h2 className="text-2xl font-bold tracking-tight">
            AI Calling Agent Guide
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Backend integration guide for admin-controlled recovery agents with
            language-specific examples.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recovery Flow</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {FLOW.map((step, index) => (
              <p key={step}>
                {index + 1}. {step}
              </p>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Backend Settings API (No UI Required)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Configure AI calling agent from backend only using admin-auth APIs.
            </p>
            <pre className="overflow-x-auto rounded-md border bg-muted p-3 text-xs">{`GET  /api/settings/ai-agent?partnerId=<partnerId>
PUT  /api/settings/ai-agent
GET  /api/settings/ai-agent/public?partnerId=<partnerId>  # partner-key scoped`}</pre>
            <p>Config input fields:</p>
            <pre className="overflow-x-auto rounded-md border bg-muted p-3 text-xs">{JSON.stringify(
              SETTINGS_FIELDS,
              null,
              2,
            )}</pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Connect to Backend API with Environment URLs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Always build full API URLs from environment variables so production
              URL changes do not require code changes.
            </p>
            <p>Environment keys used in this project:</p>
            <pre className="overflow-x-auto rounded-md border bg-muted p-3 text-xs">
              {JSON.stringify(ENV_KEYS, null, 2)}
            </pre>

            <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
              Example .env (Production Only)
            </p>
            <pre className="overflow-x-auto rounded-md border bg-muted p-3 text-xs">{`BACKEND_API_BASE_URL=https://api.yourbank.com/api
NEXT_PUBLIC_API_BASE_URL=https://api.yourbank.com/api
VISUAL_BACKEND_API_BASE_URL=https://api.yourbank.com/api
DEMO_BANK_URL=https://agent.yourbank.com
NEXT_PUBLIC_DEMO_BANK_URL=https://agent.yourbank.com
VISUAL_VERIFY_ORIGIN=https://console.yourbank.com
DEMO_BANK_PUBLIC_ORIGIN=https://agent.yourbank.com
VISUAL_PARTNER_ID=hdfc_bank
VISUAL_API_KEY=<secure-partner-api-key>`}</pre>

            <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
              Full URL Build Pattern (Provider Agnostic, No Localhost Fallback)
            </p>
            <pre className="overflow-x-auto rounded-md border bg-muted p-3 text-xs">{`// Node.js
const requireEnv = (name) => {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(name + " is required in production");
  }
  return value.trim();
};

const apiBase = requireEnv("VISUAL_BACKEND_API_BASE_URL");
const agentBase = requireEnv("DEMO_BANK_URL");

const fullUrls = {
  dashboardStats: apiBase + "/dashboard/stats",
  aiSettings: apiBase + "/settings/ai-agent",
  findUser: agentBase + "/api/demo-bank/agent/find-user",
  sendOtp: agentBase + "/api/demo-bank/agent/send-otp",
  verifyOtp: agentBase + "/api/demo-bank/agent/verify-otp",
  adminReset: agentBase + "/api/demo-bank/agent/admin-reset",
};`}</pre>

            <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
              Runtime Guard (Reject Localhost in Production)
            </p>
            <pre className="overflow-x-auto rounded-md border bg-muted p-3 text-xs">{`if (process.env.NODE_ENV === "production") {
  const blocked = ["localhost", "127.0.0.1"];
  const values = [process.env.BACKEND_API_BASE_URL, process.env.DEMO_BANK_URL];
  for (const value of values) {
    if (value && blocked.some((item) => value.includes(item))) {
      throw new Error("Production URL cannot use localhost/127.0.0.1");
    }
  }
}`}</pre>

            <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
              cURL with env values
            </p>
            <pre className="overflow-x-auto rounded-md border bg-muted p-3 text-xs">{`# Linux/macOS
export API_BASE="https://api.yourbank.com/api"
export AGENT_BASE="https://agent.yourbank.com"

curl "$API_BASE/settings/ai-agent?partnerId=hdfc_bank" \\
  -H "Authorization: Bearer <ADMIN_JWT>"

curl -X POST "$AGENT_BASE/api/demo-bank/agent/send-otp" \\
  -H "Content-Type: application/json" \\
  -d '{"partnerUserId":"customer-bank-001","agentName":"Agent-01"}'`}</pre>

            <p>
              Recommendation: store only base URLs in env and compose endpoint
              paths in backend config. Never hardcode production hostnames in app
              source, and never keep localhost fallback in production builds.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Production Integrations (Click Provider)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="flex flex-wrap gap-2">
              {PROVIDERS.map((provider) => (
                <Button
                  key={provider}
                  type="button"
                  variant={selectedProvider === provider ? "default" : "outline"}
                  onClick={() => setSelectedProvider(provider)}
                >
                  {PROVIDER_LABELS[provider]}
                </Button>
              ))}
            </div>

            <p>{providerGuide.summary}</p>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="space-y-2 lg:col-span-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
                  Setup Template
                </p>
                <pre className="overflow-x-auto rounded-md border bg-muted p-3 text-xs">
                  {providerGuide.config}
                </pre>
              </div>
              <div className="space-y-2 lg:col-span-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
                  Request Schema
                </p>
                <pre className="overflow-x-auto rounded-md border bg-muted p-3 text-xs">
                  {providerGuide.requestSchema}
                </pre>
              </div>
              <div className="space-y-2 lg:col-span-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
                  Response Schema
                </p>
                <pre className="overflow-x-auto rounded-md border bg-muted p-3 text-xs">
                  {providerGuide.responseSchema}
                </pre>
              </div>
            </div>

            <div className="rounded-md border bg-muted/40 p-3 text-xs">
              More software connections coming soon: Five9, NICE CXone,
              Vonage Contact Center, Cisco Webex Contact Center, and custom SIP
              bridges.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Node.js Example</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-md border bg-muted p-3 text-xs">{`const res = await fetch("https://api.example.com/api/demo-bank/agent/verify-otp", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ requestId, otp, agentName: "Agent-01" })
});
const data = await res.json();`}</pre>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Java Example</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="overflow-x-auto rounded-md border bg-muted p-3 text-xs">{`HttpRequest req = HttpRequest.newBuilder()
  .uri(URI.create(baseUrl + "/api/demo-bank/agent/send-otp"))
  .header("Content-Type", "application/json")
  .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
  .build();
HttpResponse<String> resp = client.send(req, HttpResponse.BodyHandlers.ofString());`}</pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">PHP Example</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="overflow-x-auto rounded-md border bg-muted p-3 text-xs">{`$ch = curl_init($baseUrl . '/api/demo-bank/agent/find-user');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['query' => $query]));
$response = curl_exec($ch);`}</pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Go Example</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="overflow-x-auto rounded-md border bg-muted p-3 text-xs">{`payload := []byte('{"requestId":"' + requestId + '","otp":"' + otp + '"}')
req, _ := http.NewRequest("POST", baseURL+"/api/demo-bank/agent/verify-otp", bytes.NewBuffer(payload))
req.Header.Set("Content-Type", "application/json")
resp, err := http.DefaultClient.Do(req)`}</pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">ASP.NET Example</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="overflow-x-auto rounded-md border bg-muted p-3 text-xs">{`var payload = new { requestId, otp, agentName = "Agent-01" };
var response = await httpClient.PostAsJsonAsync(
  "/api/demo-bank/agent/verify-otp",
  payload
);
var result = await response.Content.ReadFromJsonAsync<object>();`}</pre>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Required Security Rules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>1. Keep admin token and partner key only in backend services.</p>
            <p>2. Never expose outboundSecret to browser clients.</p>
            <p>3. Enforce HTTPS for all callback and webhook URLs.</p>
            <p>4. Keep admin-reset endpoint disabled unless needed.</p>
            <p>5. Log agent name, request id, and timestamp for audits.</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
