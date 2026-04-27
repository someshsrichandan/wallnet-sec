"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ShieldCheck,
  Users,
  KeyRound,
  Activity,
  UserX,
  CreditCard,
  Building,
  CheckCircle2,
  XCircle,
  AlertCircle
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requestJson } from "@/lib/http";
import { formatDistanceToNow } from "date-fns";

type AnalyticsData = {
  totalUsage: number;
  topPartnersByUsage: Array<{ _id: string; totalUsage: number; keyCount: number }>;
  topKeysByUsage: Array<{
    _id: string;
    keyId: string;
    partnerId: string;
    ownerName: string;
    mode: string;
    usageCount: number;
    active: boolean;
  }>;
};

type SuperAdminOverview = {
  overview: {
    totalUsers: number;
    activeUsers: number;
    trialUsers: number;
    inactiveUsers: number;
    suspendedUsers: number;
    expiredTrialUsers: number;
    totalApiKeys: number;
    activeApiKeys: number;
    pendingApiKeys: number;
    recentSignups: number;
    last24hAuditCount: number;
  };
  settings: {
    trialDurationDays: number;
    trialEnabled: boolean;
    requireApiApproval: boolean;
    autoActivateOnSignup: boolean;
    paymentAmount: number;
    paymentCurrency: string;
  };
  generatedAt: string;
};

export default function SuperAdminDashboard() {
  const [data, setData] = useState<SuperAdminOverview | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const token = localStorage.getItem("superAdminToken");
        if (!token) return;

        const [overviewResult, analyticsResult] = await Promise.all([
          requestJson<SuperAdminOverview>("/api/super-admin/dashboard", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          requestJson<AnalyticsData>("/api/super-admin/analytics?days=7", {
            headers: { Authorization: `Bearer ${token}` },
          })
        ]);
        setData(overviewResult);
        setAnalytics(analyticsResult);
      } catch (error) {
        toast.error("Failed to load super admin data");
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 w-full bg-background flex items-center justify-center p-8">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <ShieldCheck className="h-12 w-12 text-red-500 opacity-50" />
          <p className="text-muted-foreground">Loading command center...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { overview, settings } = data;

  return (
    <div className="flex-1 w-full bg-background p-8 space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">
          Platform Overview
        </h2>
        <p className="text-muted-foreground mt-2">
          Global statistics and platform health metrics.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-red-500/20 bg-red-500/5 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Partners</CardTitle>
            <Building className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600 dark:text-red-400">{overview.totalUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              +{overview.recentSignups} in the last 7 days
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Partners</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{overview.activeUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Fully activated accounts
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active API Keys</CardTitle>
            <KeyRound className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{overview.activeApiKeys}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Out of {overview.totalApiKeys} total generated
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{overview.pendingApiKeys}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Keys awaiting admin review
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Partner Account Status</CardTitle>
            <CardDescription>Breakdown of all registered partner accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="font-medium text-sm">Active</span>
                </div>
                <span className="font-bold">{overview.activeUsers}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="font-medium text-sm">Trial (Active)</span>
                </div>
                <span className="font-bold">{overview.trialUsers - overview.expiredTrialUsers}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="font-medium text-sm">Trial (Expired)</span>
                </div>
                <span className="font-bold">{overview.expiredTrialUsers}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-slate-500" />
                  <span className="font-medium text-sm">Inactive</span>
                </div>
                <span className="font-bold">{overview.inactiveUsers}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="font-medium text-sm">Suspended</span>
                </div>
                <span className="font-bold">{overview.suspendedUsers}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>Active Global Settings</CardTitle>
            <CardDescription>Current platform configurations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Trial Mode</p>
                <p className="font-medium flex items-center gap-2">
                  {settings.trialEnabled ? (
                    <><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Enabled ({settings.trialDurationDays} days)</>
                  ) : (
                    <><XCircle className="h-4 w-4 text-muted-foreground" /> Disabled</>
                  )}
                </p>
              </div>

              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Auto-Activate</p>
                <p className="font-medium flex items-center gap-2">
                  {settings.autoActivateOnSignup ? (
                    <><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Yes</>
                  ) : (
                    <><XCircle className="h-4 w-4 text-muted-foreground" /> No (Manual/Trial)</>
                  )}
                </p>
              </div>

              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">API Key Approval</p>
                <p className="font-medium flex items-center gap-2">
                  {settings.requireApiApproval ? (
                    <><CheckCircle2 className="h-4 w-4 text-amber-500" /> Required</>
                  ) : (
                    <><XCircle className="h-4 w-4 text-muted-foreground" /> Auto-approve</>
                  )}
                </p>
              </div>

              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Pricing Setup</p>
                <p className="font-medium flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-indigo-500" /> {settings.paymentAmount} {settings.paymentCurrency}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-indigo-500" />
                Top API Keys by Usage (7 Days)
              </CardTitle>
              <CardDescription>Most actively used individual keys</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.topKeysByUsage.slice(0, 5).map((key) => (
                  <div key={key._id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{key.partnerId}</p>
                      <p className="text-xs text-muted-foreground font-mono">{key.keyId} • {key.ownerName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{key.usageCount.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">{key.mode}</p>
                    </div>
                  </div>
                ))}
                {analytics.topKeysByUsage.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No API usage recorded recently.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-4 w-4 text-emerald-500" />
                Top Partners by Traffic
              </CardTitle>
              <CardDescription>Partners generating the most API calls</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.topPartnersByUsage.slice(0, 5).map((partner) => (
                  <div key={partner._id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{partner._id || "Unknown App"}</p>
                      <p className="text-xs text-muted-foreground">{partner.keyCount} keys</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{partner.totalUsage.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">Calls</p>
                    </div>
                  </div>
                ))}
                {analytics.topPartnersByUsage.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No partner traffic recorded recently.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
