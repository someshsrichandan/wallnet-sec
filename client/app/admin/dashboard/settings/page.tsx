"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type AdminSettings = {
  tenantName: string;
  defaultPartnerId: string;
  callbackBaseUrl: string;
  enableThreatEmails: boolean;
  autoRefreshDashboard: boolean;
};

const SETTINGS_KEY = "adminDashboardSettings";

const DEFAULT_SETTINGS: AdminSettings = {
  tenantName: "Partner Workspace",
  defaultPartnerId: "hdfc_bank",
  callbackBaseUrl: "http://localhost:3001/partner-live/callback",
  enableThreatEmails: true,
  autoRefreshDashboard: true,
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<AdminSettings>(DEFAULT_SETTINGS);
  const [savedAt, setSavedAt] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as AdminSettings;
      setSettings(parsed);
    } catch {
      localStorage.removeItem(SETTINGS_KEY);
    }
  }, []);

  const saveSettings = () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    setSavedAt(new Date().toLocaleString());
  };

  return (
    <div className="flex-1 w-full bg-background text-foreground">
      <main className="mx-auto max-w-4xl px-6 py-8 space-y-6">
        <div className="border-b border-slate-200/60 pb-4 dark:border-slate-800/60">
          <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Workspace defaults for admin operations and dashboard behavior.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Workspace Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tenant Name</label>
              <Input
                value={settings.tenantName}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    tenantName: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Default Partner ID</label>
              <Input
                value={settings.defaultPartnerId}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    defaultPartnerId: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Default Callback URL
              </label>
              <Input
                value={settings.callbackBaseUrl}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    callbackBaseUrl: e.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.enableThreatEmails}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      enableThreatEmails: e.target.checked,
                    }))
                  }
                />
                Enable threat alert emails
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.autoRefreshDashboard}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      autoRefreshDashboard: e.target.checked,
                    }))
                  }
                />
                Enable dashboard auto-refresh
              </label>
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={saveSettings}>Save Settings</Button>
              {savedAt && (
                <span className="text-xs text-muted-foreground">
                  Saved at {savedAt}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
