"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requestJson } from "@/lib/http";

type DistributionRow = { _id: string; count: number };

type AiShadowResponse = {
  window: {
    hours: number;
    since: string;
    generatedAt: string;
  };
  scope?: "all" | "owner";
  source?: "audit" | "session";
  summary: {
    total: number;
    fallbackCount: number;
    disagreementCount: number;
    fallbackRate: number;
    disagreementRate: number;
    avgLatencyMs: number;
    avgRiskScore: number;
  };
  distributions: {
    aiAction: DistributionRow[];
    deterministicAction: DistributionRow[];
  };
  flowHealth?: {
    initAuthCount: number;
    verifyPassCount: number;
    verifyFailCount: number;
    verifyLockedCount: number;
    verifyTotal: number;
  };
  noDataHint?: string;
  recent: Array<{
    _id: string;
    partnerId: string;
    userId: string;
    createdAt: string;
    metadata?: {
      aiAction?: string;
      deterministicAction?: string;
      latencyMs?: number;
      ok?: boolean;
      decision?: {
        riskScore?: number;
        confidence?: number;
      };
      disagreedWithDeterministic?: boolean;
      error?: string;
    };
  }>;
};

const toLabel = (value: string) => (value ? value : "UNKNOWN");

export default function AiShadowPage() {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hours, setHours] = useState("24");
  const [data, setData] = useState<AiShadowResponse | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("authToken");
    if (stored) {
      setToken(stored);
    }
    setLoading(false);
  }, []);

  const loadData = async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError("");
      const response = await requestJson<AiShadowResponse>(
        `/api/dashboard/ai-shadow?hours=${encodeURIComponent(hours)}&limit=60&scope=all`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setData(response);
    } catch (err) {
      setError(
        err instanceof Error ?
          err.message
        : "Failed to load AI shadow metrics.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token, hours]);

  return (
    <div className="flex-1 w-full bg-background text-foreground">
      <main className="mx-auto max-w-6xl px-6 py-8 space-y-6">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200/60 pb-4 dark:border-slate-800/60">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              AI Shadow Monitor
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Evaluate AI fraud scoring quality against deterministic outcomes
              before enforcement.
            </p>
            {data?.scope && (
              <p className="mt-1 text-xs text-muted-foreground">
                Data scope:{" "}
                <span className="font-medium uppercase">{data.scope}</span>
                {data.source && (
                  <span>
                    {" "}
                    | Source:{" "}
                    <span className="font-medium uppercase">{data.source}</span>
                  </span>
                )}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={hours}
              onChange={(event) => setHours(event.target.value)}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="1">Last 1h</option>
              <option value="24">Last 24h</option>
              <option value="168">Last 7d</option>
              <option value="720">Last 30d</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={!token || loading}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </div>

        {!token && (
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              Login is required to view AI shadow metrics.
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

        {token && data && !error && (
          <>
            {data.noDataHint && (
              <Card>
                <CardContent className="pt-6 text-sm text-amber-600 dark:text-amber-400">
                  {data.noDataHint}
                </CardContent>
              </Card>
            )}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Assessments</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold">
                  {data.summary.total}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Fallback Rate</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold">
                  {data.summary.fallbackRate}%
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Disagreement Rate</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold">
                  {data.summary.disagreementRate}%
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Fallback Count</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold">
                  {data.summary.fallbackCount}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Avg Latency</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold">
                  {data.summary.avgLatencyMs}ms
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Avg Risk</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold">
                  {data.summary.avgRiskScore}
                </CardContent>
              </Card>
            </div>

            {data.flowHealth && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Verification Flow Health
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5 text-sm">
                  <div className="rounded-md border px-3 py-2 flex items-center justify-between">
                    <span>Init Auth</span>
                    <Badge variant="secondary">
                      {data.flowHealth.initAuthCount}
                    </Badge>
                  </div>
                  <div className="rounded-md border px-3 py-2 flex items-center justify-between">
                    <span>Verify Pass</span>
                    <Badge variant="secondary">
                      {data.flowHealth.verifyPassCount}
                    </Badge>
                  </div>
                  <div className="rounded-md border px-3 py-2 flex items-center justify-between">
                    <span>Verify Fail</span>
                    <Badge variant="secondary">
                      {data.flowHealth.verifyFailCount}
                    </Badge>
                  </div>
                  <div className="rounded-md border px-3 py-2 flex items-center justify-between">
                    <span>Session Locked</span>
                    <Badge variant="secondary">
                      {data.flowHealth.verifyLockedCount}
                    </Badge>
                  </div>
                  <div className="rounded-md border px-3 py-2 flex items-center justify-between">
                    <span>Verify Total</span>
                    <Badge variant="secondary">
                      {data.flowHealth.verifyTotal}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    AI Action Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {data.distributions.aiAction.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No data in selected window.
                    </p>
                  )}
                  {data.distributions.aiAction.map((row) => (
                    <div
                      key={`ai-${row._id}`}
                      className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                    >
                      <span>{toLabel(row._id)}</span>
                      <Badge variant="secondary">{row.count}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Deterministic Action Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {data.distributions.deterministicAction.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No data in selected window.
                    </p>
                  )}
                  {data.distributions.deterministicAction.map((row) => (
                    <div
                      key={`det-${row._id}`}
                      className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                    >
                      <span>{toLabel(row._id)}</span>
                      <Badge variant="secondary">{row.count}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Recent AI Assessments
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.recent.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No assessments found for selected window.
                  </p>
                )}
                {data.recent.map((entry) => {
                  const disagreed = Boolean(
                    entry.metadata?.disagreedWithDeterministic,
                  );
                  const fallback = entry.metadata?.ok === false;
                  return (
                    <div
                      key={entry._id}
                      className="rounded-md border px-3 py-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">
                            AI:{" "}
                            {toLabel(String(entry.metadata?.aiAction || ""))}
                          </span>
                          <Badge variant="outline">
                            Deterministic:{" "}
                            {toLabel(
                              String(entry.metadata?.deterministicAction || ""),
                            )}
                          </Badge>
                          {disagreed && (
                            <Badge variant="destructive">Mismatch</Badge>
                          )}
                          {fallback && (
                            <Badge variant="secondary">Fallback</Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(entry.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        partner: {entry.partnerId || "-"} | user:{" "}
                        {entry.userId || "-"} | risk:{" "}
                        {entry.metadata?.decision?.riskScore ?? "-"} | latency:{" "}
                        {entry.metadata?.latencyMs ?? "-"}ms
                      </div>
                      {entry.metadata?.error && (
                        <div className="mt-1 text-xs text-rose-500">
                          {entry.metadata.error}
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
