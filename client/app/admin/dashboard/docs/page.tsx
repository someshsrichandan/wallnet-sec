import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
            Integration quick start, endpoint map, and production checklist.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Start</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              1. Create an admin user and login to get access to the console.
            </p>
            <p>2. Generate a partner API key from Developers and API.</p>
            <p>3. Start auth with your partnerId and userId.</p>
            <p>4. Redirect or popup the visual challenge screen.</p>
            <p>
              5. Validate PASS callback signatures on your backend before
              creating a user session.
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
              <CardTitle className="text-base">Init Auth Example</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="overflow-x-auto rounded-md border bg-muted p-3 text-xs">
                {`curl -X POST http://localhost:3000/api/visual-password/init-auth \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: <PARTNER_KEY>" \\
  -d '{
    "partnerId": "hdfc_bank",
    "userId": "customer-1001",
    "state": "txn-001",
    "callbackUrl": "https://partner.example.com/callback"
  }'`}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Audit Logs Example</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="overflow-x-auto rounded-md border bg-muted p-3 text-xs">
                {`curl "http://localhost:3000/api/dashboard/audit-logs?limit=50&severity=WARN" \\
  -H "Authorization: Bearer <ADMIN_JWT>"`}
              </pre>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Production Checklist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>1. Validate callback signatures and state values server-side.</p>
            <p>2. Enforce HTTPS and secure cookie/session policies.</p>
            <p>3. Rotate API keys on a schedule and revoke old keys.</p>
            <p>4. Monitor threat and audit logs daily.</p>
            <p>
              5. Keep demo keys and production keys in separate environments.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
