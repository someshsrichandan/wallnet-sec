"use client";

import { useEffect, useState } from "react";
import { Download, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requestJson } from "@/lib/http";

type DashboardStats = {
  auditStats: Array<{ _id: string; count: number; lastOccurrence: string }>;
};

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

export default function AuditReportsPage() {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("authToken");
    if (stored) {
      setToken(stored);
    }
    setLoading(false);
  }, []);

  const loadReportData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError("");
      const [statsData, logsData] = await Promise.all([
        requestJson<DashboardStats>("/api/dashboard/stats", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        requestJson<LogsResponse>("/api/dashboard/audit-logs?limit=100", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      setStats(statsData);
      setLogs(logsData.logs || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load report data",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, [token]);

  const exportReport = () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      stats: stats?.auditStats || [],
      logs,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `audit-report-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const criticalOrWarn = logs.filter(
    (log) => log.severity === "CRITICAL" || log.severity === "WARN",
  );

  return (
    <div className="flex-1 w-full bg-background text-foreground">
      <main className="mx-auto max-w-6xl px-6 py-8 space-y-6">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200/60 pb-4 dark:border-slate-800/60">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Audit Reports</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Compliance-oriented overview of event types and high-risk
              activity.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadReportData}
              disabled={!token || loading}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button size="sm" onClick={exportReport} disabled={!logs.length}>
              <Download className="mr-2 h-4 w-4" />
              Export JSON
            </Button>
          </div>
        </div>

        {!token && (
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              Login is required to view audit reports.
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
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Action Frequency (Last 7 Days)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(stats?.auditStats || []).map((item) => (
                  <div
                    key={item._id}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                  >
                    <span>{item._id}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{item.count}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(item.lastOccurrence).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  High-Priority Events
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {criticalOrWarn.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No WARN/CRITICAL entries found in recent logs.
                  </p>
                )}
                {criticalOrWarn.slice(0, 30).map((log) => (
                  <div key={log._id} className="rounded-md border px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
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
