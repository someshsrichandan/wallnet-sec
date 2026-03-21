"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requestJson } from "@/lib/http";

type AnalyticsResponse = {
  days: number;
  byFormulaMode: Array<{ _id: string; count: number; passed: number }>;
  byCatalogType: Array<{ _id: string; count: number }>;
  byDay: Array<{
    _id: string;
    total: number;
    passed: number;
    failed: number;
    locked: number;
  }>;
  topPartners: Array<{ _id: string; count: number }>;
};

export default function UserAnalyticsPage() {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("authToken");
    if (stored) {
      setToken(stored);
    }
    setLoading(false);
  }, []);

  const loadAnalytics = async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError("");
      const data = await requestJson<AnalyticsResponse>(
        "/api/dashboard/analytics?days=7",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setAnalytics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [token]);

  const summary = useMemo(() => {
    if (!analytics) {
      return { total: 0, passed: 0, failed: 0, locked: 0 };
    }

    return analytics.byDay.reduce(
      (acc, item) => {
        acc.total += item.total;
        acc.passed += item.passed;
        acc.failed += item.failed;
        acc.locked += item.locked;
        return acc;
      },
      { total: 0, passed: 0, failed: 0, locked: 0 },
    );
  }, [analytics]);

  return (
    <div className="flex-1 w-full bg-background text-foreground">
      <main className="mx-auto max-w-6xl px-6 py-8 space-y-6">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200/60 pb-4 dark:border-slate-800/60">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              User Analytics
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              7-day authentication trends by mode, catalog, and partner.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadAnalytics}
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
              Login is required to view analytics data.
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
                  <CardTitle className="text-sm">
                    Sessions ({analytics?.days || 7}d)
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold">
                  {summary.total}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Passed</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold text-emerald-500">
                  {summary.passed}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Failed</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold text-amber-500">
                  {summary.failed}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Locked</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold text-rose-500">
                  {summary.locked}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">By Formula Mode</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(analytics?.byFormulaMode || []).map((entry) => {
                    const passRate =
                      entry.count > 0 ?
                        Math.round((entry.passed / entry.count) * 100)
                      : 0;
                    return (
                      <div
                        key={entry._id}
                        className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                      >
                        <span>{entry._id || "UNKNOWN"}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {entry.count} sessions
                          </Badge>
                          <Badge variant="outline">{passRate}% pass</Badge>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">By Catalog Type</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(analytics?.byCatalogType || []).map((entry) => (
                    <div
                      key={entry._id}
                      className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                    >
                      <span>{entry._id || "UNKNOWN"}</span>
                      <Badge variant="secondary">{entry.count}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Daily Trend</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(analytics?.byDay || []).map((day) => (
                    <div
                      key={day._id}
                      className="rounded-md border px-3 py-2 text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{day._id}</span>
                        <span>{day.total} total</span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        PASS {day.passed} | FAIL {day.failed} | LOCKED{" "}
                        {day.locked}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Top Partners</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(analytics?.topPartners || []).map((partner) => (
                    <div
                      key={partner._id || "unknown"}
                      className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                    >
                      <span className="truncate">
                        {partner._id || "UNKNOWN_PARTNER"}
                      </span>
                      <Badge variant="secondary">{partner.count}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
