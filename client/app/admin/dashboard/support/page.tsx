import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TROUBLESHOOTING = [
  {
    issue: "Users always fail verification",
    checks: [
      "Verify the user has a saved visual profile for exact partnerId and userId.",
      "Check if formula mode changed after enrollment.",
      "Inspect Authentication Logs for SESSION_LOCKED events.",
    ],
  },
  {
    issue: "Callback not accepted by partner",
    checks: [
      "Confirm callback state matches init-auth state.",
      "Validate signature on backend before creating user session.",
      "Ensure callback URL matches environment (test vs live).",
    ],
  },
  {
    issue: "No analytics data appears",
    checks: [
      "Confirm requests include Authorization bearer token.",
      "Verify dashboard endpoints return 200 in browser network logs.",
      "Check that sessions exist for the authenticated admin account.",
    ],
  },
];

export default function SupportPage() {
  return (
    <div className="flex-1 w-full bg-background text-foreground">
      <main className="mx-auto max-w-6xl px-6 py-8 space-y-6">
        <div className="border-b border-slate-200/60 pb-4 dark:border-slate-800/60">
          <h2 className="text-2xl font-bold tracking-tight">Support</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Operational support runbook for integration and authentication
            issues.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Support Channel</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-1">
              <p>Email: support@partner.com</p>
              <p>Escalation: security@partner.com</p>
              <p>Hours: Mon-Sat, 9:00-21:00 IST</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">SLA Targets</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-1">
              <p>P1 (production down): 30 min response</p>
              <p>P2 (major degradation): 2 hour response</p>
              <p>P3 (general issue): 1 business day</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Before Raising Ticket</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-1">
              <p>Include partnerId and userId.</p>
              <p>Attach requestId and sessionToken if available.</p>
              <p>Share timestamp and environment (test/live).</p>
            </CardContent>
          </Card>
        </div>

        {TROUBLESHOOTING.map((item) => (
          <Card key={item.issue}>
            <CardHeader>
              <CardTitle className="text-base">{item.issue}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              {item.checks.map((check) => (
                <p key={check}>{check}</p>
              ))}
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
}
