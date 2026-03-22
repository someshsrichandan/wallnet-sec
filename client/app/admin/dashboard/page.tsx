"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle,
  Clock,
  Eye,
  Key,
  Lock,
  Mail,
  RefreshCw,
  RotateCcw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  Users,
  XCircle,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requestJson } from "@/lib/http";

// ─── Types ──────────────────────────────────────────────────────────────────

type DashboardStats = {
  overview: {
    totalSessions: number;
    activeSessions: number;
    totalCredentials: number;
    honeypotDetections: number;
    avgVerificationTimeMs: number;
  };
  last24h: {
    passed: number;
    failed: number;
    locked: number;
    total: number;
    passRate: number;
  };
  byStatus: Record<string, number>;
  auditStats: Array<{ _id: string; count: number; lastOccurrence: string }>;
};

type ThreatEvent = {
  _id: string;
  action: string;
  severity: string;
  partnerId: string;
  userId: string;
  ip: string;
  createdAt: string;
  metadata: Record<string, unknown>;
};

type TrackedUser = {
  id: string;
  partnerId: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  sourceHost: string;
  authMethod: string;
  totalSessions: number;
  passCount: number;
  failCount: number;
  lockedCount: number;
  pendingCount: number;
  passRate: number;
  lastStatus: string;
  firstSeenAt: string;
  lastSeenAt: string;
  lastVerifiedAt?: string;
  lastConsumedAt?: string;
};

const DASHBOARD_TABS = [
  "overview",
  "threats",
  "analytics",
  "audit",
  "recovery",
  "users",
] as const;
type DashboardTab = (typeof DASHBOARD_TABS)[number];

const resolveTabFromHash = (hash: string): DashboardTab => {
  const key = hash.replace(/^#/, "").toLowerCase();
  if (key === "analytics") return "analytics";
  if (key === "audit" || key === "logs") return "audit";
  if (key === "threats" || key === "security") return "threats";
  if (key === "recovery") return "recovery";
  if (key === "users") return "users";
  return "overview";
};

type AnalyticsData = {
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

type AuditLog = {
  _id: string;
  action: string;
  severity: string;
  partnerId: string;
  userId: string;
  ip: string;
  sessionToken: string;
  createdAt: string;
  metadata: Record<string, unknown>;
};

// ─── Severity Styling ───────────────────────────────────────────────────────

const severityColor: Record<string, string> = {
  CRITICAL: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
  WARN: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  INFO: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
};

const actionIcon: Record<string, typeof Shield> = {
  HONEYPOT_DETECTED: ShieldAlert,
  GEO_VELOCITY_FLAG: AlertTriangle,
  BEHAVIORAL_ANOMALY: Zap,
  SESSION_LOCKED: Lock,
  VERIFY_FAIL: XCircle,
  VERIFY_PASS: CheckCircle,
  DEVICE_TRUST_LOW: Eye,
  INIT_AUTH: Activity,
};

const formatTimeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60_000) return `${Math.round(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
  return `${Math.round(diff / 86_400_000)}d ago`;
};

// ─── Main Dashboard ─────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [token, setToken] = useState("");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [threats, setThreats] = useState<ThreatEvent[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");

  // Recovery panel state
  const [recoveryQuery, setRecoveryQuery] = useState("");
  const [recoverySending, setRecoverySending] = useState(false);
  const [recoveryResult, setRecoveryResult] = useState<{
    ok: boolean;
    message: string;
    enrollUrl?: string;
    user?: { fullName: string; emailMasked: string; accountNumber: string };
    emailSent?: boolean;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Users tab state
  const [bankUsers, setBankUsers] = useState<TrackedUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("authToken");
    if (stored) setToken(stored);
  }, []);

  const fetchData = useCallback(
    async (showToast = false) => {
      if (!token) return;
      try {
        setRefreshing(true);
        const headers = { Authorization: `Bearer ${token}` };

        const [statsRes, threatsRes, analyticsRes, auditRes] =
          await Promise.all([
            requestJson<DashboardStats>("/api/dashboard/stats", { headers }),
            requestJson<{ threats: ThreatEvent[] }>(
              "/api/dashboard/threats?limit=50",
              { headers },
            ),
            requestJson<AnalyticsData>("/api/dashboard/analytics?days=7", {
              headers,
            }),
            requestJson<{ logs: AuditLog[]; total: number }>(
              "/api/dashboard/audit-logs?limit=100",
              {
                headers,
              },
            ),
          ]);

        setStats(statsRes);
        setThreats(threatsRes.threats || []);
        setAnalytics(analyticsRes);
        setAuditLogs(auditRes.logs || []);

        if (showToast) toast.success("Dashboard refreshed");
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to load dashboard data";
        toast.error(msg);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token],
  );

  // Fetch tracked users by partner/user activity scope.
  const fetchBankUsers = useCallback(async () => {
    if (!token) return;
    setUsersLoading(true);
    try {
      const data = await requestJson<{ users?: TrackedUser[] }>(
        "/api/dashboard/users?days=30",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setBankUsers(data.users || []);
    } catch {
      // non-fatal
    } finally {
      setUsersLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
    fetchBankUsers();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => fetchData(), 30_000);
    return () => clearInterval(interval);
  }, [fetchData, fetchBankUsers]);

  useEffect(() => {
    const syncFromHash = () => {
      const tabFromHash = resolveTabFromHash(window.location.hash);
      setActiveTab((current) =>
        current === tabFromHash ? current : tabFromHash,
      );
    };

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  const handleTabChange = (tab: string) => {
    const nextTab = (
      DASHBOARD_TABS.includes(tab as DashboardTab) ? tab : (
        "overview"
      )) as DashboardTab;
    setActiveTab(nextTab);

    const path = `${window.location.pathname}${window.location.search}`;
    if (nextTab === "overview") {
      window.history.replaceState(null, "", path);
      return;
    }

    window.history.replaceState(null, "", `${path}#${nextTab}`);
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Dashboard
            </CardTitle>
            <CardDescription>
              Log in at the{" "}
              <Link href="/admin" className="text-primary underline">
                Admin Console
              </Link>{" "}
              first, then return here to view the dashboard.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full bg-background text-foreground relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[30rem] bg-[radial-gradient(circle_at_50%_0%,rgba(120,119,198,0.1),transparent_50%)] dark:opacity-20" />

      <main className="relative mx-auto max-w-7xl px-6 py-8 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200/60 dark:border-slate-800/60">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Platform Analytics
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Monitor your users' visual authentication sessions and security
              threats.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {stats && threats.length > 0 && (
              <Badge className="relative flex overflow-hidden border-rose-300 bg-rose-100 text-[10px] uppercase tracking-wide text-rose-800 dark:border-rose-900/50 dark:bg-rose-900/30 dark:text-rose-200">
                <div className="absolute inset-0 bg-rose-500/10 animate-pulse" />
                {threats.length} Active Threats
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={refreshing}
              onClick={() => fetchData(true)}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 mr-2 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh Data
            </Button>
          </div>
        </div>
        {loading ?
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-3">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">Loading security data...</p>
            </div>
          </div>
        : <>
            {/* ── KPI Cards ── */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <StatCard
                  label="Total Sessions"
                  value={stats.overview.totalSessions}
                  icon={Activity}
                />
                <StatCard
                  label="Active Now"
                  value={stats.overview.activeSessions}
                  icon={Zap}
                  highlight={stats.overview.activeSessions > 0}
                />
                <StatCard
                  label="Pass Rate (24h)"
                  value={`${stats.last24h.passRate}%`}
                  icon={TrendingUp}
                  highlight
                />
                <StatCard
                  label="Enrolled Consumers"
                  value={stats.overview.totalCredentials}
                  icon={Users}
                />
                <StatCard
                  label="Threats Stopped"
                  value={stats.overview.honeypotDetections}
                  icon={ShieldAlert}
                  danger={stats.overview.honeypotDetections > 0}
                />
                <StatCard
                  label="Avg Time"
                  value={`${(stats.overview.avgVerificationTimeMs / 1000).toFixed(1)}s`}
                  icon={Clock}
                />
              </div>
            )}

            {/* ── Tabs ── */}
            <Tabs
              value={activeTab}
              onValueChange={handleTabChange}
              className="space-y-6"
            >
              <TabsList className="grid w-full grid-cols-6 max-w-3xl rounded-full bg-slate-100 p-1 dark:bg-slate-800">
                <TabsTrigger
                  value="overview"
                  className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-950"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="threats"
                  className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-950"
                >
                  Threats
                  {threats.length > 0 && (
                    <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] text-white">
                      {threats.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="analytics"
                  className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-950"
                >
                  Analytics
                </TabsTrigger>
                <TabsTrigger
                  value="audit"
                  className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-950"
                >
                  Audit Log
                </TabsTrigger>
                <TabsTrigger
                  value="recovery"
                  className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-950"
                >
                  <RotateCcw className="h-3 w-3 mr-1" /> Recovery
                </TabsTrigger>
                <TabsTrigger
                  value="users"
                  className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-950"
                >
                  <Users className="h-3 w-3 mr-1" /> Users
                  {bankUsers.length > 0 && (
                    <span className="ml-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-[9px] text-white font-bold">
                      {bankUsers.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* ── Overview Tab ── */}
              <TabsContent value="overview" className="space-y-4 mt-4">
                {stats && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <BarChart3 className="h-4 w-4" />
                          Last 24 Hours
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <StatusBar
                          label="Passed"
                          count={stats.last24h.passed}
                          total={stats.last24h.total}
                          color="bg-green-500"
                        />
                        <StatusBar
                          label="Failed"
                          count={stats.last24h.failed}
                          total={stats.last24h.total}
                          color="bg-amber-500"
                        />
                        <StatusBar
                          label="Locked"
                          count={stats.last24h.locked}
                          total={stats.last24h.total}
                          color="bg-red-500"
                        />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Session Status Distribution
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-3">
                          {Object.entries(stats.byStatus).map(
                            ([status, count]) => (
                              <div
                                key={status}
                                className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                              >
                                <span className="text-sm text-muted-foreground">
                                  {status}
                                </span>
                                <span className="font-mono font-bold">
                                  {count}
                                </span>
                              </div>
                            ),
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {stats?.auditStats && stats.auditStats.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Event Breakdown (7 days)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {stats.auditStats
                          .sort((a, b) => b.count - a.count)
                          .map((stat) => (
                            <div
                              key={stat._id}
                              className="p-2 rounded-md border bg-card flex flex-col"
                            >
                              <span className="text-xs text-muted-foreground truncate">
                                {stat._id}
                              </span>
                              <span className="font-mono font-bold text-lg">
                                {stat.count}
                              </span>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* ── Threats Tab ── */}
              <TabsContent value="threats" className="space-y-3 mt-4">
                {threats.length === 0 ?
                  <Card>
                    <CardContent className="py-12 text-center">
                      <ShieldCheck className="h-12 w-12 mx-auto text-green-500 mb-3" />
                      <p className="text-lg font-semibold">All Clear</p>
                      <p className="text-sm text-muted-foreground">
                        No security threats detected recently.
                      </p>
                    </CardContent>
                  </Card>
                : <div className="space-y-2">
                    {threats.map((threat) => {
                      const Icon = actionIcon[threat.action] || AlertTriangle;
                      return (
                        <Card
                          key={threat._id}
                          className={`border ${
                            severityColor[threat.severity] || severityColor.INFO
                          }`}
                        >
                          <CardContent className="py-3 px-4">
                            <div className="flex items-start gap-3">
                              <Icon className="h-5 w-5 mt-0.5 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-sm">
                                    {threat.action}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {threat.severity}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground ml-auto">
                                    {formatTimeAgo(threat.createdAt)}
                                  </span>
                                </div>
                                <div className="text-xs text-muted-foreground mt-1 space-x-3">
                                  {threat.partnerId && (
                                    <span>App: {threat.partnerId}</span>
                                  )}
                                  {threat.userId && (
                                    <span>User ID: {threat.userId}</span>
                                  )}
                                  {threat.ip && <span>IP: {threat.ip}</span>}
                                </div>
                                {threat.metadata &&
                                  Object.keys(threat.metadata).length > 0 && (
                                    <pre className="text-xs mt-1.5 p-2 rounded bg-muted/50 overflow-x-auto font-mono">
                                      {JSON.stringify(threat.metadata, null, 2)}
                                    </pre>
                                  )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                }
              </TabsContent>

              {/* ── Analytics Tab ── */}
              <TabsContent value="analytics" className="space-y-4 mt-4">
                {analytics && (
                  <>
                    {/* Daily Chart (text-based) */}
                    {analytics.byDay.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base text-foreground">
                            Authentication Volume by Day
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {analytics.byDay.map((day) => (
                              <div
                                key={day._id}
                                className="flex items-center gap-3"
                              >
                                <span className="text-xs font-mono w-24 shrink-0 text-muted-foreground">
                                  {day._id}
                                </span>
                                <div className="flex-1 flex items-center gap-1 h-6">
                                  <div
                                    className="h-full bg-green-500 rounded-l"
                                    style={{
                                      width: `${day.total > 0 ? (day.passed / day.total) * 100 : 0}%`,
                                    }}
                                  />
                                  <div
                                    className="h-full bg-amber-500"
                                    style={{
                                      width: `${day.total > 0 ? (day.failed / day.total) * 100 : 0}%`,
                                    }}
                                  />
                                  <div
                                    className="h-full bg-red-500 rounded-r"
                                    style={{
                                      width: `${day.total > 0 ? (day.locked / day.total) * 100 : 0}%`,
                                    }}
                                  />
                                </div>
                                <span className="text-xs font-mono w-10 text-right">
                                  {day.total}
                                </span>
                              </div>
                            ))}
                            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <span className="w-3 h-3 rounded bg-green-500" />{" "}
                                Pass
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="w-3 h-3 rounded bg-amber-500" />{" "}
                                Fail
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="w-3 h-3 rounded bg-red-500" />{" "}
                                Locked
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <div className="grid md:grid-cols-2 gap-4">
                      <Card className="border-border/60 shadow-sm">
                        <CardHeader className="border-b border-border/60 bg-muted/40">
                          <CardTitle className="text-sm font-semibold text-foreground">
                            User Preferences: Formula Mode
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {analytics.byFormulaMode.map((mode) => (
                              <div
                                key={mode._id}
                                className="flex items-center justify-between p-2 rounded bg-muted/50"
                              >
                                <span className="text-sm font-medium">
                                  {mode._id}
                                </span>
                                <div className="text-right">
                                  <span className="font-mono font-bold">
                                    {mode.count}
                                  </span>
                                  <span className="text-xs text-muted-foreground ml-2">
                                    (
                                    {mode.count > 0 ?
                                      Math.round(
                                        (mode.passed / mode.count) * 100,
                                      )
                                    : 0}
                                    % pass)
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-border/60 shadow-sm">
                        <CardHeader className="border-b border-border/60 bg-muted/40">
                          <CardTitle className="text-sm font-semibold text-foreground">
                            User Preferences: Graphic Theme
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {analytics.byCatalogType.map((cat) => (
                              <div
                                key={cat._id}
                                className="flex items-center justify-between p-2 rounded bg-muted/50"
                              >
                                <span className="text-sm font-medium">
                                  {cat._id}
                                </span>
                                <span className="font-mono font-bold">
                                  {cat.count}
                                </span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Hide Global Partner List from Tenant Dashboards */}
                  </>
                )}
              </TabsContent>
              {/* ── Audit Log Tab ── */}
              <TabsContent value="audit" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      Recent Audit Events
                    </CardTitle>
                    <CardDescription>
                      Complete security event trail. Auto-purged after 90 days.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {auditLogs.length === 0 ?
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No audit events recorded yet. Events appear as users
                        interact with the platform.
                      </p>
                    : <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-muted-foreground text-left">
                              <th className="py-2 pr-3 font-medium">
                                Time (Local)
                              </th>
                              <th className="py-2 pr-3 font-medium">
                                Event Code
                              </th>
                              <th className="py-2 pr-3 font-medium">
                                Action Threat Level
                              </th>
                              <th className="py-2 pr-3 font-medium">
                                App Credential
                              </th>
                              <th className="py-2 pr-3 font-medium">
                                Customer User ID
                              </th>
                              <th className="py-2 pr-3 font-medium">
                                Source IP
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {auditLogs.map((log) => (
                              <tr
                                key={log._id}
                                className="border-b border-border/50 hover:bg-muted/30"
                              >
                                <td className="py-2 pr-3 text-xs text-muted-foreground whitespace-nowrap">
                                  {formatTimeAgo(log.createdAt)}
                                </td>
                                <td className="py-2 pr-3 font-mono text-xs">
                                  {log.action}
                                </td>
                                <td className="py-2 pr-3">
                                  <Badge
                                    variant="outline"
                                    className={`text-xs ${
                                      severityColor[log.severity] || ""
                                    }`}
                                  >
                                    {log.severity}
                                  </Badge>
                                </td>
                                <td className="py-2 pr-3 text-xs truncate max-w-30">
                                  {log.partnerId || "-"}
                                </td>
                                <td className="py-2 pr-3 text-xs truncate max-w-30">
                                  {log.userId || "-"}
                                </td>
                                <td className="py-2 pr-3 text-xs font-mono">
                                  {log.ip || "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    }
                  </CardContent>
                </Card>
              </TabsContent>
              {/* ── Recovery Tab ── */}
              <TabsContent value="recovery" className="mt-4 space-y-4">
                {/* Search card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-indigo-500" />
                      Visual Password Recovery — Admin Reset
                    </CardTitle>
                    <CardDescription>
                      Enter bank account number, Customer ID, or email. The
                      system finds the user, generates a 15-min enroll link,
                      emails it automatically, and shows it here to copy.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-3">
                      <input
                        className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono placeholder:font-sans"
                        placeholder="6-digit account no., customer-bank-xxx, or email"
                        value={recoveryQuery}
                        onChange={(e) => {
                          setRecoveryQuery(e.target.value);
                          setRecoveryResult(null);
                          setCopied(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && recoveryQuery.trim()) {
                            /* trigger via button ref */
                            (
                              document.getElementById(
                                "admin-reset-btn",
                              ) as HTMLButtonElement
                            )?.click();
                          }
                        }}
                      />
                      <Button
                        id="admin-reset-btn"
                        disabled={recoverySending || !recoveryQuery.trim()}
                        onClick={async () => {
                          setRecoverySending(true);
                          setRecoveryResult(null);
                          setCopied(false);
                          try {
                            const res = await fetch(
                              "/api/proxy/demo-bank/admin-reset",
                              {
                                method: "POST",
                                headers: {
                                  "content-type": "application/json",
                                  Authorization: `Bearer ${token}`,
                                },
                                body: JSON.stringify({
                                  query: recoveryQuery.trim(),
                                  triggeredBy: "Admin Console",
                                }),
                              },
                            );
                            const data = (await res.json()) as {
                              ok?: boolean;
                              message?: string;
                              enrollUrl?: string;
                              user?: {
                                fullName: string;
                                emailMasked: string;
                                accountNumber: string;
                              };
                              emailSent?: boolean;
                            };
                            if (!res.ok || !data.ok)
                              throw new Error(data.message || "Failed.");
                            setRecoveryResult({
                              ok: true,
                              message: data.message || "Done.",
                              enrollUrl: data.enrollUrl,
                              user: data.user,
                              emailSent: data.emailSent,
                            });
                          } catch (err) {
                            setRecoveryResult({
                              ok: false,
                              message:
                                err instanceof Error ? err.message : "Failed.",
                            });
                          } finally {
                            setRecoverySending(false);
                          }
                        }}
                      >
                        {recoverySending ?
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />{" "}
                            Finding…
                          </>
                        : <>
                            <Search className="h-4 w-4 mr-2" /> Generate & Send
                          </>
                        }
                      </Button>
                    </div>

                    {/* Result */}
                    {recoveryResult && (
                      <div
                        className={`rounded-xl border p-4 space-y-3 ${
                          recoveryResult.ok ?
                            "border-green-200 bg-green-50 dark:border-green-900/40 dark:bg-green-900/10"
                          : "border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-900/10"
                        }`}
                      >
                        {recoveryResult.ok && recoveryResult.user && (
                          <div className="flex items-start gap-3">
                            <div className="flex-1">
                              <p className="font-bold text-sm text-green-800 dark:text-green-300">
                                ✅ {recoveryResult.user.fullName}
                              </p>
                              <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
                                Account #{recoveryResult.user.accountNumber} ·{" "}
                                {recoveryResult.user.emailMasked}
                              </p>
                              <p className="text-xs mt-1 text-green-600 dark:text-green-500">
                                {recoveryResult.emailSent ?
                                  "📧 Email sent automatically"
                                : "📋 Email skipped (dev mode) — copy link below"
                                }
                              </p>
                            </div>
                          </div>
                        )}

                        {!recoveryResult.ok && (
                          <p className="text-sm text-red-700 dark:text-red-400">
                            ⚠ {recoveryResult.message}
                          </p>
                        )}

                        {/* Copyable link */}
                        {recoveryResult.ok && recoveryResult.enrollUrl && (
                          <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-green-700 dark:text-green-400">
                              Re-Enrollment Link (expires in 15 min)
                            </p>
                            <div className="flex items-center gap-2">
                              <code className="flex-1 text-xs bg-white dark:bg-slate-900 border border-green-200 dark:border-green-800 rounded-md px-3 py-2 font-mono break-all text-green-900 dark:text-green-200">
                                {recoveryResult.enrollUrl}
                              </code>
                              <Button
                                size="sm"
                                variant="outline"
                                className="shrink-0 border-green-300"
                                onClick={() => {
                                  navigator.clipboard.writeText(
                                    recoveryResult.enrollUrl!,
                                  );
                                  setCopied(true);
                                  setTimeout(() => setCopied(false), 2000);
                                }}
                              >
                                {copied ? "✓ Copied!" : "Copy"}
                              </Button>
                            </div>
                            <p className="text-xs text-green-600 dark:text-green-500">
                              Share this link directly, or the user will receive
                              it by email above.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Free Call System info + agent portal link */}
                <div className="grid md:grid-cols-2 gap-4">
                  <Card className="border-blue-100 bg-blue-50/40 dark:border-blue-900/30 dark:bg-blue-900/10">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2 text-blue-700 dark:text-blue-300">
                        🎧 Calling Agent Portal
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-blue-800 dark:text-blue-200 space-y-2">
                      <p>
                        For phone-based recovery with DTMF account verification
                        + OTP:
                      </p>
                      <a
                        href="http://localhost:3002/agent"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700"
                      >
                        Open Agent Portal →
                      </a>
                    </CardContent>
                  </Card>

                  <Card className="border-amber-100 bg-amber-50/40 dark:border-amber-900/30 dark:bg-amber-900/10">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2 text-amber-700 dark:text-amber-300">
                        📞 Free Call Integration
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-amber-800 dark:text-amber-200 space-y-1.5">
                      <p className="font-semibold">
                        Get free calling for demo:
                      </p>
                      <ul className="space-y-1 list-none">
                        <li>
                          🆓{" "}
                          <a
                            href="https://www.twilio.com/try-twilio"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline font-medium"
                          >
                            Twilio Free Trial
                          </a>{" "}
                          — $15 credit, no expiry
                        </li>
                        <li>
                          🆓{" "}
                          <a
                            href="https://www.vonage.com/communications-apis/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline font-medium"
                          >
                            Vonage/Nexmo
                          </a>{" "}
                          — €2 free credit
                        </li>
                        <li>
                          🆓{" "}
                          <a
                            href="https://plivo.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline font-medium"
                          >
                            Plivo
                          </a>{" "}
                          — $0.80 trial credit
                        </li>
                      </ul>
                      <p className="text-amber-600 dark:text-amber-400 pt-1">
                        All work on localhost via ngrok tunnel.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* ── Users Tab ── */}
              <TabsContent value="users" className="mt-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Users className="h-4 w-4 text-indigo-500" />
                          Tracked End Users
                          <span className="text-xs font-normal text-muted-foreground bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                            {bankUsers.length} total
                          </span>
                        </CardTitle>
                        <CardDescription className="mt-1">
                          Users who authenticated through your platform
                          integrations, grouped by partner app and user.
                        </CardDescription>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={fetchBankUsers}
                        disabled={usersLoading}
                      >
                        <RefreshCw
                          className={`h-3.5 w-3.5 mr-1.5 ${usersLoading ? "animate-spin" : ""}`}
                        />
                        Refresh
                      </Button>
                    </div>

                    {/* Search */}
                    <div className="relative mt-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        className="w-full rounded-lg border border-input bg-background pl-9 pr-4 py-2 text-sm"
                        placeholder="Search by name, email, phone, user ID, partner app, source host, or auth method..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                      />
                    </div>
                  </CardHeader>

                  <CardContent className="p-0">
                    {usersLoading && bankUsers.length === 0 ?
                      <div className="flex items-center justify-center py-16 text-muted-foreground">
                        <RefreshCw className="h-5 w-5 animate-spin mr-2" />{" "}
                        Loading users…
                      </div>
                    : bankUsers.length === 0 ?
                      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                        <Users className="h-8 w-8 opacity-30" />
                        <p className="text-sm">
                          No tracked users yet in the selected time window.
                        </p>
                      </div>
                    : <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-slate-50 dark:bg-slate-900/50">
                              <th className="text-left py-2.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                User
                              </th>
                              <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                Name
                              </th>
                              <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                Email
                              </th>
                              <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                Phone
                              </th>
                              <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                Platform
                              </th>
                              <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                Auth
                              </th>
                              <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                Sessions
                              </th>
                              <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                Pass Rate
                              </th>
                              <th className="text-left py-2.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                Last Seen
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {bankUsers
                              .filter((u) => {
                                if (!userSearch.trim()) return true;
                                const q = userSearch.toLowerCase();
                                return (
                                  (u.fullName || "")
                                    .toLowerCase()
                                    .includes(q) ||
                                  (u.email || "").toLowerCase().includes(q) ||
                                  (u.phone || "").toLowerCase().includes(q) ||
                                  u.partnerId.toLowerCase().includes(q) ||
                                  u.userId.toLowerCase().includes(q) ||
                                  u.authMethod.toLowerCase().includes(q) ||
                                  (u.sourceHost || "").toLowerCase().includes(q)
                                );
                              })
                              .map((u) => {
                                return (
                                  <tr
                                    key={u.id}
                                    className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors"
                                  >
                                    <td className="py-2.5 px-4">
                                      <div className="font-semibold text-sm font-mono">
                                        {u.userId}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        first seen{" "}
                                        {new Date(u.firstSeenAt).toLocaleString(
                                          "en-IN",
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-3">
                                      <div className="text-sm font-semibold">
                                        {u.fullName || "Unknown User"}
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-3">
                                      <div className="text-xs font-mono text-muted-foreground">
                                        {u.email || "-"}
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-3">
                                      <div className="text-xs font-mono text-muted-foreground">
                                        {u.phone || "-"}
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-3">
                                      <div className="text-sm font-semibold">
                                        {u.partnerId}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {u.sourceHost || "unknown-host"}
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-3">
                                      <Badge
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        {u.authMethod || "unknown"}
                                      </Badge>
                                    </td>
                                    <td className="py-2.5 px-3 text-xs text-muted-foreground font-mono">
                                      total {u.totalSessions} / pass{" "}
                                      {u.passCount} / fail {u.failCount} / lock{" "}
                                      {u.lockedCount}
                                    </td>
                                    <td className="py-2.5 px-3">
                                      <span
                                        className={`text-xs font-semibold ${
                                          u.passRate >= 70 ? "text-emerald-600"
                                          : u.passRate >= 40 ? "text-amber-600"
                                          : "text-rose-600"
                                        }`}
                                      >
                                        {u.passRate}%
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-4 text-xs">
                                      <div>
                                        {new Date(u.lastSeenAt).toLocaleString(
                                          "en-IN",
                                        )}
                                      </div>
                                      <div className="text-muted-foreground">
                                        status {u.lastStatus}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>

                        {bankUsers.filter((u) => {
                          if (!userSearch.trim()) return false;
                          const q = userSearch.toLowerCase();
                          return !(
                            (u.fullName || "").toLowerCase().includes(q) ||
                            (u.email || "").toLowerCase().includes(q) ||
                            (u.phone || "").toLowerCase().includes(q) ||
                            u.partnerId.toLowerCase().includes(q) ||
                            u.userId.toLowerCase().includes(q) ||
                            u.authMethod.toLowerCase().includes(q) ||
                            (u.sourceHost || "").toLowerCase().includes(q)
                          );
                        }).length === bankUsers.length &&
                          userSearch && (
                            <div className="py-12 text-center text-sm text-muted-foreground">
                              No users match &ldquo;{userSearch}&rdquo;
                            </div>
                          )}
                      </div>
                    }
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Settings Tab ── */}
              <TabsContent value="settings" className="mt-4">
                <div className="grid md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Mail className="h-4 w-4 text-emerald-500" />
                        Email SMTP Configuration
                      </CardTitle>
                      <CardDescription>
                        Configure how OTPs and Re-enrollment links are sent from
                        the bank.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form
                        className="space-y-4"
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const fd = new FormData(e.currentTarget);
                          const body = Object.fromEntries(fd);

                          toast.promise(
                            fetch("/api/proxy/demo-bank/email-settings", {
                              method: "POST",
                              headers: { "content-type": "application/json" },
                              body: JSON.stringify(body),
                            }).then(async (r) => {
                              const d = await r.json();
                              if (!r.ok)
                                throw new Error(d.message || "Failed to save");
                              return d;
                            }),
                            {
                              loading: "Saving and testing connection...",
                              success: (d) => d.message,
                              error: (e) => e.message,
                            },
                          );
                        }}
                      >
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-muted-foreground">
                              Bank Name
                            </label>
                            <input
                              name="bankName"
                              defaultValue="HDFC Demo Bank"
                              className="w-full rounded-md border p-2 text-sm"
                              placeholder="HDFC Demo Bank"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-muted-foreground">
                              SMTP Host
                            </label>
                            <input
                              name="host"
                              defaultValue="smtp.gmail.com"
                              className="w-full rounded-md border p-2 text-sm"
                              placeholder="smtp.gmail.com"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-muted-foreground">
                              SMTP Port
                            </label>
                            <input
                              name="port"
                              defaultValue="587"
                              className="w-full rounded-md border p-2 text-sm"
                              placeholder="587"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-muted-foreground">
                              Sender Email
                            </label>
                            <input
                              name="user"
                              defaultValue="someshsrichandan@gmail.com"
                              className="w-full rounded-md border p-2 text-sm"
                              placeholder="user@gmail.com"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase text-muted-foreground">
                            App Password / Pass
                          </label>
                          <input
                            name="pass"
                            type="password"
                            defaultValue="hafhlmzahkatvpsw"
                            className="w-full rounded-md border p-2 text-sm font-mono"
                            placeholder="••••••••••••••••"
                          />
                          <p className="text-[10px] text-muted-foreground italic mt-1">
                            For Gmail: Use an "App Password" from your Google
                            Security settings.
                          </p>
                        </div>

                        <div className="pt-4 flex gap-3">
                          <Button
                            type="submit"
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                          >
                            Save & Test Connection
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>

                  <Card className="border-indigo-100 bg-indigo-50/20">
                    <CardHeader>
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Shield className="h-4 w-4 text-indigo-500" />
                        Security Setup Guide
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-4">
                      <div className="space-y-2">
                        <h4 className="font-bold text-indigo-900 border-b border-indigo-100 pb-1">
                          1. Generating App Passwords
                        </h4>
                        <p className="text-indigo-800 text-xs leading-relaxed">
                          To send email via Gmail, you <strong>cannot</strong>{" "}
                          use your normal password. Enable 2-Step Verification,
                          then go to "App Passwords" to generate a unique
                          16-character code.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-bold text-indigo-900 border-b border-indigo-100 pb-1">
                          2. Runtime Proxy Implementation
                        </h4>
                        <p className="text-indigo-800 text-xs leading-relaxed">
                          This dashboard uses a <strong>Secure Proxy</strong>.
                          When you hit "Save", your credentials are sent to the
                          Demo-Bank server and stored in its runtime process
                          environment.
                        </p>
                      </div>

                      <div className="space-y-2 text-indigo-700 italic text-[11px] border-l-2 border-indigo-300 pl-3">
                        <p>
                          Note: Settings saved via this UI are{" "}
                          <strong>runtime only</strong>. To persist across
                          server restarts, add them to your{" "}
                          <code className="bg-white/50 px-1 rounded">
                            .env.local
                          </code>{" "}
                          file.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </>
        }
      </main>
    </div>
  );
}

// ─── Stat Card Component ────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  highlight,
  danger,
}: {
  label: string;
  value: string | number;
  icon: typeof Activity;
  highlight?: boolean;
  danger?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-md dark:bg-slate-900 ${
        danger ?
          "border-rose-100 bg-rose-50/30 dark:border-rose-900/20 dark:bg-rose-900/10"
        : highlight ?
          "border-indigo-100 bg-indigo-50/30 dark:border-indigo-900/20 dark:bg-indigo-900/10"
        : "border-slate-200 dark:border-slate-800"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <div
          className={`rounded-full p-1.5 ${
            danger ?
              "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"
            : highlight ?
              "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {value}
        </h3>
      </div>
    </div>
  );
}

// ─── Progress Bar Component ─────────────────────────────────────────────────

function StatusBar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm">{label}</span>
        <span className="text-sm font-mono">
          {count}{" "}
          <span className="text-muted-foreground">({Math.round(pct)}%)</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
