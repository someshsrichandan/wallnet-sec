"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requestJson } from "@/lib/http";

type AuditLog = {
  _id: string;
  action: string;
  severity: string;
  partnerId: string;
  userId: string;
  createdAt: string;
};

type LogsResponse = {
  logs: AuditLog[];
  total: number;
};

export default function SearchLogsPage() {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);

  const [partnerId, setPartnerId] = useState("");
  const [action, setAction] = useState("");
  const [severity, setSeverity] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("authToken");
    if (stored) {
      setToken(stored);
    }
    setLoading(false);
  }, []);

  const runSearch = async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({ limit: "100" });
      if (partnerId.trim()) params.set("partnerId", partnerId.trim());
      if (action.trim()) params.set("action", action.trim());
      if (severity.trim())
        params.set("severity", severity.trim().toUpperCase());

      const data = await requestJson<LogsResponse>(
        `/api/dashboard/audit-logs?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to search logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runSearch();
  }, [token]);

  return (
    <div className="flex-1 w-full bg-background text-foreground">
      <main className="mx-auto max-w-6xl px-6 py-8 space-y-6">
        <div className="border-b border-slate-200/60 pb-4 dark:border-slate-800/60">
          <h2 className="text-2xl font-bold tracking-tight">Search Logs</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Filter audit events by partner, action, and severity.
          </p>
        </div>

        {!token && (
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              Login is required to search logs.
            </CardContent>
          </Card>
        )}

        {token && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Filters</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-4">
              <Input
                value={partnerId}
                onChange={(e) => setPartnerId(e.target.value)}
                placeholder="partnerId"
              />
              <Input
                value={action}
                onChange={(e) => setAction(e.target.value)}
                placeholder="action (e.g. VERIFY_FAIL)"
              />
              <Input
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                placeholder="severity (INFO, WARN, CRITICAL)"
              />
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={runSearch}
                  disabled={loading}
                >
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setPartnerId("");
                    setAction("");
                    setSeverity("");
                  }}
                >
                  Clear
                </Button>
              </div>
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
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Results{" "}
                <Badge variant="secondary" className="ml-2">
                  {total}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {logs.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No logs match the current filters.
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
                    partner: {log.partnerId || "-"} | user: {log.userId || "-"}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
