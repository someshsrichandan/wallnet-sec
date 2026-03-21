"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requestJson } from "@/lib/http";

type AuditLog = {
  _id: string;
  action: string;
  severity: string;
  partnerId: string;
  userId: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
};

type LogsResponse = {
  logs: AuditLog[];
  total: number;
};

const AUTH_ACTIONS = new Set([
  "VERIFY_PASS",
  "VERIFY_FAIL",
  "SESSION_LOCKED",
  "INIT_AUTH",
  "USER_SIGNUP",
  "USER_LOGIN_SUCCESS",
  "USER_LOGIN_FAILURE",
]);

export default function AuthenticationLogsPage() {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("authToken");
    if (stored) {
      setToken(stored);
    }
    setLoading(false);
  }, []);

  const loadLogs = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError("");
      const data = await requestJson<LogsResponse>(
        "/api/dashboard/audit-logs?limit=150",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setLogs((data.logs || []).filter((log) => AUTH_ACTIONS.has(log.action)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [token]);

  const counts = useMemo(() => {
    return logs.reduce(
      (acc, log) => {
        if (log.action === "VERIFY_PASS") acc.pass += 1;
        if (log.action === "VERIFY_FAIL") acc.fail += 1;
        if (log.action === "SESSION_LOCKED") acc.locked += 1;
        if (log.action === "INIT_AUTH") acc.init += 1;
        if (log.action === "USER_LOGIN_SUCCESS") acc.pass += 1;
        if (log.action === "USER_LOGIN_FAILURE") acc.fail += 1;
        return acc;
      },
      { pass: 0, fail: 0, locked: 0, init: 0 },
    );
  }, [logs]);

  return (
    <div className="flex-1 w-full bg-background text-foreground">
      <main className="mx-auto max-w-6xl px-6 py-8 space-y-6">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200/60 pb-4 dark:border-slate-800/60">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Authentication Logs
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Recent verification attempts and session outcomes.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadLogs}
            disabled={!token || loading}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>

        {!token && (
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              Login is required to view logs.
            </CardContent>
          </Card>
        )}
        {error && (
          <Card>
            <CardContent className="pt-6 text-sm text-rose-500">
              {error}
            </CardContent>
          </Card>
        )}

        {token && !error && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Init</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold">
                  {counts.init}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Pass</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold text-emerald-500">
                  {counts.pass}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Fail</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold text-amber-500">
                  {counts.fail}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Locked</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold text-rose-500">
                  {counts.locked}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Latest Authentication Events
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {logs.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No events found.
                  </p>
                )}
                {logs.map((log) => (
                  <div key={log._id} className="rounded-md border px-3 py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">
                          {log.action}
                        </span>
                        <Badge variant="outline">{log.severity}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      partner: {log.partnerId || "-"} | user:{" "}
                      {log.userId || "-"}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
