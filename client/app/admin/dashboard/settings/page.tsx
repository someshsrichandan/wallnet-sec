"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requestJson } from "@/lib/http";

type AdminSettings = {
  tenantName: string;
  defaultPartnerId: string;
  callbackBaseUrl: string;
  enableThreatEmails: boolean;
  autoRefreshDashboard: boolean;
};

type EmailSettings = {
  partnerId: string;
  emailHost: string;
  emailPort: number;
  emailUser: string;
  emailPass: string;
  emailTo: string;
  fromName: string;
  enabled: boolean;
  hasEmailPass?: boolean;
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
  const [token, setToken] = useState("");
  const [emailSavedAt, setEmailSavedAt] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    partnerId: DEFAULT_SETTINGS.defaultPartnerId,
    emailHost: "smtp.gmail.com",
    emailPort: 587,
    emailUser: "",
    emailPass: "",
    emailTo: "",
    fromName: "Visual Security",
    enabled: true,
  });

  useEffect(() => {
    const authToken = localStorage.getItem("authToken") || "";
    setToken(authToken);

    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as AdminSettings;
      setSettings(parsed);
      setEmailSettings((prev) => ({
        ...prev,
        partnerId: parsed.defaultPartnerId || prev.partnerId,
      }));
    } catch {
      localStorage.removeItem(SETTINGS_KEY);
    }
  }, []);

  const loadEmailSettings = async (partnerId: string) => {
    if (!token || !partnerId) {
      return;
    }

    try {
      setEmailLoading(true);
      setEmailError("");
      const data = await requestJson<EmailSettings>(
        `/api/settings/email?partnerId=${encodeURIComponent(partnerId)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setEmailSettings((prev) => ({
        ...prev,
        partnerId: data.partnerId || partnerId,
        emailHost: data.emailHost || prev.emailHost,
        emailPort: Number(data.emailPort || prev.emailPort),
        emailUser: data.emailUser || "",
        emailPass: "",
        emailTo: data.emailTo || "",
        fromName: data.fromName || "Visual Security",
        enabled: data.enabled !== false,
      }));
    } catch (error) {
      setEmailError(error instanceof Error ? error.message : "Failed to load email settings");
    } finally {
      setEmailLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      return;
    }
    loadEmailSettings(emailSettings.partnerId || settings.defaultPartnerId);
  }, [token]);

  const saveSettings = () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    setSavedAt(new Date().toLocaleString());
  };

  const saveEmailSettings = async () => {
    if (!token) {
      setEmailError("Login is required to save email settings.");
      return;
    }

    try {
      setEmailLoading(true);
      setEmailError("");
      await requestJson<EmailSettings>("/api/settings/email", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(emailSettings),
      });
      setEmailSavedAt(new Date().toLocaleString());
      setEmailSettings((prev) => ({ ...prev, emailPass: "" }));
    } catch (error) {
      setEmailError(error instanceof Error ? error.message : "Failed to save email settings");
    } finally {
      setEmailLoading(false);
    }
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reset Email (SMTP) Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Partner ID</label>
              <Input
                value={emailSettings.partnerId}
                onChange={(e) =>
                  setEmailSettings((prev) => ({
                    ...prev,
                    partnerId: e.target.value.trim().toLowerCase(),
                  }))
                }
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">EMAIL_HOST</label>
                <Input
                  value={emailSettings.emailHost}
                  onChange={(e) =>
                    setEmailSettings((prev) => ({ ...prev, emailHost: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">EMAIL_PORT</label>
                <Input
                  type="number"
                  value={emailSettings.emailPort}
                  onChange={(e) =>
                    setEmailSettings((prev) => ({
                      ...prev,
                      emailPort: Number.parseInt(e.target.value || "587", 10) || 587,
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">EMAIL_USER</label>
              <Input
                type="email"
                value={emailSettings.emailUser}
                onChange={(e) =>
                  setEmailSettings((prev) => ({ ...prev, emailUser: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">EMAIL_PASS</label>
              <Input
                type="password"
                placeholder="Keep empty to preserve saved password"
                value={emailSettings.emailPass}
                onChange={(e) =>
                  setEmailSettings((prev) => ({ ...prev, emailPass: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">EMAIL_TO (optional BCC)</label>
              <Input
                type="email"
                value={emailSettings.emailTo}
                onChange={(e) =>
                  setEmailSettings((prev) => ({ ...prev, emailTo: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">From Name</label>
              <Input
                value={emailSettings.fromName}
                onChange={(e) =>
                  setEmailSettings((prev) => ({ ...prev, fromName: e.target.value }))
                }
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={emailSettings.enabled}
                onChange={(e) =>
                  setEmailSettings((prev) => ({ ...prev, enabled: e.target.checked }))
                }
              />
              Enable reset email delivery
            </label>

            {emailError && <p className="text-sm text-rose-500">{emailError}</p>}

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => loadEmailSettings(emailSettings.partnerId)}
                disabled={!token || emailLoading}
              >
                Reload
              </Button>
              <Button onClick={saveEmailSettings} disabled={!token || emailLoading}>
                Save Email Settings
              </Button>
              {emailSavedAt && (
                <span className="text-xs text-muted-foreground">Saved at {emailSavedAt}</span>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
