"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requestJson } from "@/lib/http";

type AiRuntimeResponse = {
  ai: {
    enabled: boolean;
    readyForCalls: boolean;
    provider: string;
    model: string;
    timeoutMs: number;
    maxRetries: number;
    features: {
      fraudShadowMode: boolean;
      fraudEnforcementMode: boolean;
      threatSummaryEnabled: boolean;
      partnerAssistantEnabled: boolean;
    };
    checks: {
      providerSupported: boolean;
      modelConfigured: boolean;
      apiKeyConfigured: boolean;
      timeoutConfigured: boolean;
      retriesConfigured: boolean;
    };
    diagnostics: {
      apiKeyPresent: boolean;
      callbackCount: number;
      callbackAllowlistConfigured: boolean;
    };
  };
  generatedAt: string;
};

const boolBadge = (value: boolean) =>
  value ?
    <Badge className="bg-emerald-600 text-white">Yes</Badge>
  : <Badge variant="destructive">No</Badge>;

export default function AiRuntimePage() {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [runtime, setRuntime] = useState<AiRuntimeResponse | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("authToken");
    if (stored) {
      setToken(stored);
    }
    setLoading(false);
  }, []);

  const loadRuntime = async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError("");

      const data = await requestJson<AiRuntimeResponse>(
        "/api/dashboard/ai-runtime",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setRuntime(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load AI runtime.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRuntime();
  }, [token]);

  return (
    <div className="flex-1 w-full bg-background text-foreground">
      <main className="mx-auto max-w-6xl px-6 py-8 space-y-6">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200/60 pb-4 dark:border-slate-800/60">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">AI Runtime</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Foundation diagnostics for provider config, feature flags, and
              runtime readiness.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadRuntime}
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
              Login is required to view AI runtime diagnostics.
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

        {token && runtime && !error && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">AI Enabled</CardTitle>
                </CardHeader>
                <CardContent>{boolBadge(runtime.ai.enabled)}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Ready For Calls</CardTitle>
                </CardHeader>
                <CardContent>{boolBadge(runtime.ai.readyForCalls)}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Provider</CardTitle>
                </CardHeader>
                <CardContent className="text-lg font-semibold uppercase">
                  {runtime.ai.provider}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Model</CardTitle>
                </CardHeader>
                <CardContent className="text-sm font-medium">
                  {runtime.ai.model}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Feature Flags</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <span>Fraud Shadow Mode</span>
                    {boolBadge(runtime.ai.features.fraudShadowMode)}
                  </div>
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <span>Fraud Enforcement Mode</span>
                    {boolBadge(runtime.ai.features.fraudEnforcementMode)}
                  </div>
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <span>Threat Summary Enabled</span>
                    {boolBadge(runtime.ai.features.threatSummaryEnabled)}
                  </div>
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <span>Partner Assistant Enabled</span>
                    {boolBadge(runtime.ai.features.partnerAssistantEnabled)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Configuration Checks
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <span>Provider Supported</span>
                    {boolBadge(runtime.ai.checks.providerSupported)}
                  </div>
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <span>Model Configured</span>
                    {boolBadge(runtime.ai.checks.modelConfigured)}
                  </div>
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <span>API Key Configured</span>
                    {boolBadge(runtime.ai.checks.apiKeyConfigured)}
                  </div>
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <span>Timeout Configured</span>
                    {boolBadge(runtime.ai.checks.timeoutConfigured)}
                  </div>
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <span>Retries Configured</span>
                    {boolBadge(runtime.ai.checks.retriesConfigured)}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Runtime Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between rounded-md border px-3 py-2">
                  <span>Timeout (ms)</span>
                  <Badge variant="secondary">{runtime.ai.timeoutMs}</Badge>
                </div>
                <div className="flex items-center justify-between rounded-md border px-3 py-2">
                  <span>Max Retries</span>
                  <Badge variant="secondary">{runtime.ai.maxRetries}</Badge>
                </div>
                <div className="flex items-center justify-between rounded-md border px-3 py-2">
                  <span>Partner Keys In Scope</span>
                  <Badge variant="secondary">
                    {runtime.ai.diagnostics.callbackCount}
                  </Badge>
                </div>
                <div className="flex items-center justify-between rounded-md border px-3 py-2">
                  <span>Callback Allowlist Configured</span>
                  {boolBadge(
                    runtime.ai.diagnostics.callbackAllowlistConfigured,
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Generated at {new Date(runtime.generatedAt).toLocaleString()}.
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
