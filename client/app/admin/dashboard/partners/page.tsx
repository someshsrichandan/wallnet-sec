"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ClipboardCopy,
  Globe,
  Key,
  Plus,
  RefreshCw,
  RotateCcw,
  Shield,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { HttpError, requestJson } from "@/lib/http";
import { useRouter } from "next/navigation";

type PartnerKeyInfo = {
  _id: string;
  id?: string;
  partnerId: string;
  label: string;
  keyId: string;
  mode: string;
  active: boolean;
  webhookUrl?: string;
  callbackAllowlist?: string[];
  usageCount: number;
  lastUsedAt: string | null;
  createdAt: string;
  // Legacy field (may be present on old keys)
  apiKey?: string;
};

type NewKeyResponse = {
  id: string;
  partnerId: string;
  label: string;
  key_id: string;
  key_secret: string;
  webhook_secret: string;
  mode: string;
  webhookUrl: string;
  callbackAllowlist: string[];
  createdAt: string;
  message: string;
  usage_example: { header: string; curl: string };
};

export default function PartnerManagementPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [keys, setKeys] = useState<PartnerKeyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyLabel, setNewKeyLabel] = useState("");
  const [newKeyPartnerId, setNewKeyPartnerId] = useState("");
  const [newKeyMode, setNewKeyMode] = useState<"test" | "live">("test");
  const [newKeyWebhook, setNewKeyWebhook] = useState("");
  const [revealedCredentials, setRevealedCredentials] = useState<{ keyId: string; keySecret: string; webhookSecret: string } | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editWebhook, setEditWebhook] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("authToken");
    if (stored) setToken(stored);
  }, []);

  const headers: Record<string, string> =
    token ? { Authorization: `Bearer ${token}` } : {};

  const fetchKeys = useCallback(async () => {
    if (!token) return;
    try {
      const data = await requestJson<{ keys: PartnerKeyInfo[] }>(
        "/api/partners/keys",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setKeys(data.keys || []);
    } catch (err) {
      if (err instanceof HttpError && err.status === 401) {
        localStorage.removeItem("authToken");
        toast.error("Session expired. Redirecting to login...");
        router.push("/admin/login");
        return;
      }
      toast.error(
        err instanceof Error ? err.message : "Failed to load API keys",
      );
    } finally {
      setLoading(false);
    }
  }, [token, router]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleCreate = async () => {
    if (!newKeyPartnerId.trim() || !newKeyLabel.trim()) {
      toast.error("Partner ID and Label are required");
      return;
    }
    try {
      setCreating(true);
      const body: Record<string, string> = {
        partnerId: newKeyPartnerId.trim(),
        label: newKeyLabel.trim(),
        mode: newKeyMode,
      };
      if (newKeyWebhook.trim()) body.webhookUrl = newKeyWebhook.trim();

      const data = await requestJson<NewKeyResponse>("/api/partners/keys", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      setRevealedCredentials({
        keyId: data.key_id,
        keySecret: data.key_secret,
        webhookSecret: data.webhook_secret,
      });
      setNewKeyLabel("");
      setNewKeyPartnerId("");
      setNewKeyWebhook("");
      setShowCreate(false);
      fetchKeys();
      toast.success(
        "Credentials generated! Copy them now — the secret won't be shown again.",
      );
    } catch (err) {
      if (err instanceof HttpError && err.status === 401) {
        localStorage.removeItem("authToken");
        toast.error("Session expired. Redirecting to login...");
        router.push("/admin/login");
        return;
      }
      toast.error(err instanceof Error ? err.message : "Failed to create key");
    } finally {
      setCreating(false);
    }
  };

  const handleRotate = async (keyDocId: string) => {
    try {
      const data = await requestJson<{ key_id: string; key_secret: string }>(
        `/api/partners/keys/${keyDocId}/rotate`,
        {
          method: "POST",
          headers,
        },
      );
      setRevealedCredentials({
        keyId: data.key_id,
        keySecret: data.key_secret,
        webhookSecret: "",
      });
      fetchKeys();
      toast.success("Secret rotated. Copy the new key_secret now.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to rotate key");
    }
  };

  const handleRevoke = async (keyId: string) => {
    try {
      await requestJson(`/api/partners/keys/${keyId}`, {
        method: "DELETE",
        headers,
      });
      fetchKeys();
      toast.success("API key revoked");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke key");
    }
  };

  const handleUpdate = async (keyId: string) => {
    try {
      const body: Record<string, string> = {};
      if (editLabel.trim()) body.label = editLabel.trim();
      if (editWebhook.trim()) body.webhookUrl = editWebhook.trim();

      await requestJson(`/api/partners/keys/${keyId}`, {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setEditingKey(null);
      fetchKeys();
      toast.success("Key updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update key");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  if (!token) return null; // Let the layout protect this or handle via useEffect

  return (
    <div className="flex-1 w-full bg-[#f8fafc] text-slate-950 dark:bg-slate-950 dark:text-slate-50 relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[30rem] bg-[radial-gradient(circle_at_50%_0%,rgba(120,119,198,0.1),transparent_50%)] dark:opacity-20" />
      <main className="relative mx-auto w-full max-w-5xl px-6 py-8 space-y-6">

        <div className="flex items-center justify-between pb-4 border-b border-slate-200/60 dark:border-slate-800/60">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">API Key Management</h2>
            <p className="text-muted-foreground text-sm">Create and organize secure access credentials</p>
          </div>
          <Button
            variant="default"
            onClick={() => setShowCreate(!showCreate)}
            className="bg-slate-900 text-white hover:bg-slate-800"
          >
            <Plus className="h-4 w-4 mr-2" />
            New API Key
          </Button>
        </div>

        {/* ── Revealed Key Banner ── */}
        {revealedCredentials && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm dark:border-amber-900/30 dark:bg-amber-900/10">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-amber-100 p-2 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                <Shield className="h-6 w-6" />
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <h3 className="font-bold text-amber-900 dark:text-amber-200">🔐 Credentials Generated</h3>
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    Copy your credentials now. The <strong>key_secret</strong> will <strong>never</strong> be shown again.
                  </p>
                </div>

                {/* key_id */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase text-amber-600 dark:text-amber-400">Key ID (public — safe to store in config)</label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 overflow-x-auto rounded-lg border border-amber-200 bg-white/50 px-3 py-2 font-mono text-sm text-amber-900 dark:border-amber-900/30 dark:bg-black/20 dark:text-amber-100">
                      {revealedCredentials.keyId}
                    </code>
                    <Button size="sm" variant="outline" className="border-amber-200 hover:bg-amber-100 dark:border-amber-800 dark:hover:bg-amber-900/30 shrink-0" onClick={() => copyToClipboard(revealedCredentials.keyId)}>
                      <ClipboardCopy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* key_secret */}
                {revealedCredentials.keySecret && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase text-red-600 dark:text-red-400">Key Secret (⚠️ shown ONCE — save securely)</label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 overflow-x-auto rounded-lg border border-red-200 bg-red-50/50 px-3 py-2 font-mono text-sm text-red-900 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-200">
                        {revealedCredentials.keySecret}
                      </code>
                      <Button size="sm" variant="outline" className="border-red-200 hover:bg-red-100 dark:border-red-800 dark:hover:bg-red-900/30 shrink-0" onClick={() => copyToClipboard(revealedCredentials.keySecret)}>
                        <ClipboardCopy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* webhook_secret */}
                {revealedCredentials.webhookSecret && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase text-amber-600 dark:text-amber-400">Webhook Secret (for verifying webhook signatures)</label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 overflow-x-auto rounded-lg border border-amber-200 bg-white/50 px-3 py-2 font-mono text-sm text-amber-900 dark:border-amber-900/30 dark:bg-black/20 dark:text-amber-100">
                        {revealedCredentials.webhookSecret}
                      </code>
                      <Button size="sm" variant="outline" className="border-amber-200 hover:bg-amber-100 dark:border-amber-800 dark:hover:bg-amber-900/30 shrink-0" onClick={() => copyToClipboard(revealedCredentials.webhookSecret)}>
                        <ClipboardCopy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Usage example */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase text-amber-600 dark:text-amber-400">Usage (add to your .env)</label>
                  <code className="block overflow-x-auto rounded-lg border border-amber-200 bg-white/50 px-3 py-2 font-mono text-xs text-amber-800 dark:border-amber-900/30 dark:bg-black/20 dark:text-amber-200 whitespace-pre">{`VISUAL_KEY_ID=${revealedCredentials.keyId}\nVISUAL_KEY_SECRET=${revealedCredentials.keySecret}`}</code>
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs text-amber-700 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-200"
                  onClick={() => setRevealedCredentials(null)}
                >
                  I have saved my credentials securely
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Create Key Form ── */}
        {showCreate && (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/50">
              <h3 className="font-semibold text-foreground">Generate New Integration Key</h3>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Partner ID *</label>
                  <Input
                    placeholder="e.g., internal_app_1"
                    value={newKeyPartnerId}
                    onChange={(e) => setNewKeyPartnerId(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Label *</label>
                  <Input
                    placeholder="e.g., Production Core"
                    value={newKeyLabel}
                    onChange={(e) => setNewKeyLabel(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Environment Mode</label>
                <div className="flex gap-2">
                  <Button
                    variant={newKeyMode === "test" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setNewKeyMode("test")}
                    className={newKeyMode === "test" ? "bg-slate-900 text-white" : ""}
                  >
                    Sandbox / Test
                  </Button>
                  <Button
                    variant={newKeyMode === "live" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setNewKeyMode("live")}
                    className={newKeyMode === "live" ? "bg-indigo-600 hover:bg-indigo-700 text-white" : ""}
                  >
                    Live / Production
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Webhook Push Notification URL (Optional)</label>
                <Input
                  placeholder="https://yourserver.com/webhooks/visual-pass"
                  value={newKeyWebhook}
                  onChange={(e) => setNewKeyWebhook(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button onClick={handleCreate} disabled={creating} className="bg-slate-900 text-white hover:bg-slate-800">
                  {creating ?
                    <RefreshCw className="h-3.5 w-3.5 animate-spin mr-2" />
                    : <Key className="h-3.5 w-3.5 mr-2" />}
                  Generate Credentials
                </Button>
                <Button variant="ghost" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Key List ── */}
        <div className="space-y-4 pt-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400">
              <RefreshCw className="h-6 w-6 animate-spin mb-4" />
              <p>Fetching active credentials...</p>
            </div>
          ) : keys.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-16 text-center dark:border-slate-700 dark:bg-slate-900/50">
              <div className="mb-4 rounded-full bg-slate-200 p-4 dark:bg-slate-800">
                <Key className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold">No API Keys Generated</h3>
              <p className="max-w-xs text-sm text-slate-500 dark:text-slate-400 mt-2 mb-6">
                Create credentials to allow partner systems to integrate with the Visual Auth service.
              </p>
              <Button onClick={() => setShowCreate(true)} variant="outline">
                Generate First Key
              </Button>
            </div>
          ) : (
            <div className="grid gap-3">
              {keys.map((k) => (
                <div key={k._id} className={`group relative overflow-hidden rounded-xl border bg-white shadow-sm transition-all hover:shadow-md dark:bg-slate-900 ${!k.active ? "border-slate-200 opacity-60 dark:border-slate-800" : "border-slate-200 dark:border-slate-800"}`}>
                  <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">

                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${k.mode === "live" ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}`}>
                          <Key className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                            {k.label || k.partnerId}
                            {!k.active && <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">Revoked</Badge>}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <span className="font-mono">{k.partnerId}</span>
                            <span>•</span>
                            <span className={`capitalize ${k.mode === "live" ? "font-semibold text-indigo-600 dark:text-indigo-400" : ""}`}>{k.mode}</span>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-md bg-slate-50 px-3 py-2 font-mono text-xs text-slate-600 dark:bg-slate-950 dark:text-slate-400">
                        {k.keyId || k.apiKey || "—"}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Usage: <strong className="text-slate-700 dark:text-slate-300">{k.usageCount}</strong>
                        </span>
                        {k.lastUsedAt && (
                          <span>
                            Last used: {new Date(k.lastUsedAt).toLocaleDateString()}
                          </span>
                        )}
                        {k.webhookUrl && (
                          <span className="flex items-center gap-1">
                            <Globe className="h-3 w-3 text-indigo-500" />
                            <span className="text-slate-600 dark:text-slate-300">Webhook Configured</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    {k.active && (
                      <div className="flex items-start gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                          title="Edit Webhook"
                          onClick={() => {
                            setEditingKey(k._id);
                            setEditLabel(k.label);
                            setEditWebhook(k.webhookUrl || "");
                          }}
                        >
                          <Globe className="h-4 w-4" />
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400"
                              title="Rotate key"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Rotate API Key?</AlertDialogTitle>
                              <AlertDialogDescription>
                                The current key for <strong>{k.label}</strong> will be invalidated immediately. Any apps using the current key will start failing.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleRotate(k._id)} className="bg-amber-600 hover:bg-amber-700">
                                Confirm Rotate
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                              title="Revoke key"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Revoke API Key?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently deactivate the key for <strong>{k.label}</strong>. This cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRevoke(k._id)}
                                className="bg-red-600 hover:bg-red-700 text-white"
                              >
                                Permanently Revoke
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>

                  {/* Inline Edit Form */}
                  {editingKey === k._id && (
                    <div className="border-t border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-500">Display Label</label>
                          <Input
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-500">Webhook URL</label>
                          <Input
                            value={editWebhook}
                            onChange={(e) => setEditWebhook(e.target.value)}
                            placeholder="https://..."
                          />
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button size="sm" onClick={() => handleUpdate(k._id)}>
                          Save Settings
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingKey(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
