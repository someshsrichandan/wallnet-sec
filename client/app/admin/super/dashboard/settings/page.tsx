"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Activity, Save } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { requestJson } from "@/lib/http";

type AdminSettings = {
  trialDurationDays: number;
  trialEnabled: boolean;
  paymentAmount: number;
  paymentCurrency: string;
  paymentMessage: string;
  paymentLink: string;
  requireApiApproval: boolean;
  autoActivateOnSignup: boolean;
  maxApiKeysPerUser: number;
  defaultApiLimit: number;
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const token = localStorage.getItem("superAdminToken");
        if (!token) return;

        const result = await requestJson<{ settings: AdminSettings }>("/api/super-admin/settings", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSettings(result.settings);
      } catch (error) {
        toast.error("Failed to load settings");
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    
    try {
      setSaving(true);
      const token = localStorage.getItem("superAdminToken");
      
      const result = await requestJson<{ settings: AdminSettings }>("/api/super-admin/settings", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(settings)
      });

      setSettings(result.settings);
      toast.success("Global settings updated successfully");
    } catch (error) {
      toast.error("Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 w-full bg-background flex items-center justify-center p-8">
        <Activity className="h-8 w-8 animate-pulse text-red-500/50" />
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="flex-1 w-full bg-background p-8 space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Global Settings
          </h2>
          <p className="text-muted-foreground mt-2">
            Configure platform-wide trial limits, pricing details, and partner onboarding flows.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-red-600 hover:bg-red-700">
          {saving ? <Activity className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Changes
        </Button>
      </div>

      <div className="grid gap-6">
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle>Partner Onboarding & Trial</CardTitle>
            <CardDescription>Determine what happens when a new partner registers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Trial Periods</Label>
                <p className="text-sm text-muted-foreground">New accounts start in 'trial' mode rather than immediately requiring payment.</p>
              </div>
              <Switch 
                checked={settings.trialEnabled} 
                onCheckedChange={(v) => setSettings({...settings, trialEnabled: v})} 
              />
            </div>
            
            {settings.trialEnabled && (
              <div className="grid gap-2 border-l-2 border-muted pl-4">
                <Label>Trial Duration (Days)</Label>
                <Input 
                  type="number" 
                  value={settings.trialDurationDays} 
                  onChange={(e) => setSettings({...settings, trialDurationDays: parseInt(e.target.value) || 0})}
                  className="max-w-[200px]"
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-Activate Accounts</Label>
                <p className="text-sm text-muted-foreground">Skip trial entirely and mark new accounts as fully active immediately.</p>
              </div>
              <Switch 
                checked={settings.autoActivateOnSignup} 
                onCheckedChange={(v) => setSettings({...settings, autoActivateOnSignup: v})} 
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Require Admin Approval for API Keys</Label>
                <p className="text-sm text-muted-foreground">When partners generate live keys, an admin must approve them here before they work.</p>
              </div>
              <Switch 
                checked={settings.requireApiApproval} 
                onCheckedChange={(v) => setSettings({...settings, requireApiApproval: v})} 
              />
            </div>

            <div className="grid gap-2 border-t pt-4">
              <div className="space-y-0.5">
                <Label>Default API Limit (Per Account)</Label>
                <p className="text-sm text-muted-foreground">The default maximum number of API requests a new partner can make. Can be overridden per user.</p>
              </div>
              <Input 
                type="number" 
                value={settings.defaultApiLimit || 10000} 
                onChange={(e) => setSettings({...settings, defaultApiLimit: parseInt(e.target.value) || 10000})}
                className="max-w-[200px]"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle>Billing & Payment Information</CardTitle>
            <CardDescription>Details shown to users when their trial expires or they need to pay</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Payment Amount</Label>
                <Input 
                  type="number" 
                  value={settings.paymentAmount} 
                  onChange={(e) => setSettings({...settings, paymentAmount: parseInt(e.target.value) || 0})}
                />
              </div>
              <div className="grid gap-2">
                <Label>Currency Code</Label>
                <Input 
                  value={settings.paymentCurrency} 
                  onChange={(e) => setSettings({...settings, paymentCurrency: e.target.value})}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Payment Gateway / Instructions Link</Label>
              <Input 
                value={settings.paymentLink} 
                onChange={(e) => setSettings({...settings, paymentLink: e.target.value})}
                placeholder="https://razorpay.me/... or https://your-site/pay"
              />
              <p className="text-xs text-muted-foreground">URL where users are redirected to complete payment</p>
            </div>

            <div className="grid gap-2">
              <Label>Payment Instructions Message</Label>
              <textarea 
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={settings.paymentMessage} 
                onChange={(e) => setSettings({...settings, paymentMessage: e.target.value})}
              />
              <p className="text-xs text-muted-foreground">Shown on the upgrade/payment page</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
