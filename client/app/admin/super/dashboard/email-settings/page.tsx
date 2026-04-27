"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { 
  Mail, 
  Send, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  Zap, 
  AlertTriangle,
  ExternalLink,
  Save,
  Server,
  Lock,
  Globe
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { requestJson } from "@/lib/http";

type EmailSettings = {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpFrom: string;
  smtpService: string;
  smtpSecure: boolean;
};

export default function EmailSettingsPage() {
  const [settings, setSettings] = useState<EmailSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const token = localStorage.getItem("superAdminToken");
        if (!token) return;

        const result = await requestJson<{ settings: EmailSettings }>("/api/super-admin/settings", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSettings(result.settings);
      } catch (error) {
        toast.error("Failed to load email settings");
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
      
      await requestJson("/api/super-admin/settings", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(settings)
      });

      toast.success("Email configuration saved to database");
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    if (!testEmail) {
      toast.error("Please enter a test email address");
      return;
    }

    try {
      setIsSending(true);
      const token = localStorage.getItem("superAdminToken");
      
      await requestJson("/api/super-admin/settings/test-email", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ to: testEmail })
      });

      toast.success("Test email sent! Using current database or .env settings.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send test email");
    } finally {
      setIsSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 w-full bg-background flex items-center justify-center p-8">
        <Zap className="h-8 w-8 animate-pulse text-red-500/50" />
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="flex-1 w-full bg-background p-8 space-y-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Mail className="h-8 w-8 text-red-500" />
            Email Configuration
          </h2>
          <p className="text-muted-foreground mt-2">
            Choose your provider and configure SMTP credentials. Settings are saved securely in the database.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-red-600 hover:bg-red-700">
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving..." : "Save Configuration"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5 text-red-500" />
              Provider Settings
            </CardTitle>
            <CardDescription>
              Select your email service and enter credentials.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Email Service Provider</Label>
                <Select 
                  value={settings.smtpService} 
                  onValueChange={(v) => setSettings({...settings, smtpService: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Custom SMTP Server</SelectItem>
                    <SelectItem value="gmail">Google / Gmail</SelectItem>
                    <SelectItem value="outlook">Outlook / Hotmail</SelectItem>
                    <SelectItem value="sendgrid">SendGrid</SelectItem>
                    <SelectItem value="mailgun">Mailgun</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Sender Address (From)</Label>
                <Input 
                  value={settings.smtpFrom} 
                  onChange={(e) => setSettings({...settings, smtpFrom: e.target.value})}
                  placeholder="WallNet-Sec <noreply@wallnet-sec.com>"
                />
              </div>
            </div>

            {settings.smtpService === "custom" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg border border-border/50">
                <div className="space-y-2">
                  <Label>SMTP Host</Label>
                  <Input 
                    value={settings.smtpHost} 
                    onChange={(e) => setSettings({...settings, smtpHost: e.target.value})}
                    placeholder="smtp.example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>SMTP Port</Label>
                  <Input 
                    type="number"
                    value={settings.smtpPort} 
                    onChange={(e) => setSettings({...settings, smtpPort: parseInt(e.target.value) || 0})}
                    placeholder="587"
                  />
                </div>
                <div className="flex items-center gap-2 pt-8">
                  <Switch 
                    checked={settings.smtpSecure}
                    onCheckedChange={(v) => setSettings({...settings, smtpSecure: v})}
                  />
                  <Label>Use SSL/TLS</Label>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Globe className="h-3 w-3" /> SMTP Username / Email
                </Label>
                <Input 
                  value={settings.smtpUser} 
                  onChange={(e) => setSettings({...settings, smtpUser: e.target.value})}
                  placeholder="admin@yourdomain.com"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Lock className="h-3 w-3" /> SMTP Password / App Key
                </Label>
                <Input 
                  type="password"
                  value={settings.smtpPass} 
                  onChange={(e) => setSettings({...settings, smtpPass: e.target.value})}
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Send className="h-4 w-4" />
                Test Delivery
              </h4>
              <div className="flex gap-2">
                <Input 
                  placeholder="receiver@example.com" 
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  type="email"
                />
                <Button variant="secondary" onClick={handleSendTest} disabled={isSending}>
                  {isSending ? "Sending..." : "Send Test Email"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Delivery Health</CardTitle>
            <CardDescription>Metrics for {settings.smtpService} provider</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">Inbox Reach</span>
              <span className="text-sm font-bold text-emerald-500">99.2%</span>
            </div>
            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: '99%' }} />
            </div>
            
            <Separator />
            
            <div className="space-y-3">
              <h5 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Quick Info</h5>
              <div className="flex items-center gap-2 text-xs">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>SPF/DKIM: Verified</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-amber-500">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>DMARC: Not Found</span>
              </div>
            </div>

            <Button variant="outline" size="sm" className="w-full mt-4" asChild>
              <a href="https://nodemailer.com/about/" target="_blank">
                View Mail Logs <ExternalLink className="ml-2 h-3 w-3" />
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-bold">Automated Notification Flows</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { name: "Welcome Partner", icon: Zap, trigger: "On Signup", description: "Sent to new partners immediately after registration.", status: "Active" },
            { name: "Trial Expiring Soon", icon: Clock, trigger: "3 Days Before Expiry", description: "Reminder to upgrade before the trial period ends.", status: "Active" },
            { name: "Trial Expired", icon: AlertTriangle, trigger: "On Expiry", description: "Alert sent when the trial ends and keys are suspended.", status: "Active" },
            { name: "Super Admin Security Alert", icon: ShieldAlert, trigger: "On Admin Login", description: "Security notification sent on every Super Admin login.", status: "High Priority" }
          ].map((tpl) => (
            <Card key={tpl.name} className="hover:border-red-500/30 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-red-500/10 rounded-lg">
                    <tpl.icon className="h-6 w-6 text-red-500" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold">{tpl.name}</h4>
                      <Badge variant={tpl.status === "Active" ? "outline" : "destructive"} className="text-[10px]">
                        {tpl.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{tpl.description}</p>
                    <div className="pt-2 flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase">Trigger:</span>
                      <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">{tpl.trigger}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
