"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { HttpError, requestJson } from "@/lib/http";
import {
  clearPendingPartnerAuthContext,
  createSecureState,
  readPendingPartnerAuthContext,
  writePendingPartnerAuthContext,
} from "@/lib/partner-auth-context";

type InitAuthResponse = {
  sessionToken: string;
  expiresAt: string;
  verifyPath: string;
};

type ConsumeResultResponse = {
  result: "PASS";
  partnerId: string;
  userId: string;
  state: string;
  sessionToken: string;
  consumedAt: string;
};

type IntegrationMode = "REDIRECT" | "POPUP";
type PopupStatus = "IDLE" | "OPEN" | "VERIFYING" | "PASS" | "FAIL" | "ERROR";
type ProductMode = "live" | "test";

type PopupCallbackPayload = {
  type: "VISUAL_PASSWORD_CALLBACK";
  result?: string;
  signature?: string;
  state?: string;
  sessionToken?: string;
  partnerId?: string;
  userId?: string;
  environment?: string;
};

const LAST_VISUAL_PROFILE_KEY = "lastVisualProfile";
const readLastVisualProfile = (): { partnerId?: string; userId?: string } => {
  if (typeof window === "undefined") {
    return {};
  }

  const raw = window.localStorage.getItem(LAST_VISUAL_PROFILE_KEY);
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as { partnerId?: string; userId?: string };
  } catch {
    window.localStorage.removeItem(LAST_VISUAL_PROFILE_KEY);
    return {};
  }
};

function PartnerLivePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lastVisualProfile = readLastVisualProfile();
  const [username, setUsername] = useState("customer@bank.com");
  const [partnerId, setPartnerId] = useState(lastVisualProfile.partnerId || "hdfc_bank");
  const [state, setState] = useState(() => createSecureState());
  const [userId, setUserId] = useState(lastVisualProfile.userId || "");
  const [starting, setStarting] = useState(false);
  const [integrationMode, setIntegrationMode] = useState<IntegrationMode>("REDIRECT");
  const [productMode, setProductMode] = useState<ProductMode>("live");
  const [partnerApiKey, setPartnerApiKey] = useState("");
  const [popupStatus, setPopupStatus] = useState<PopupStatus>("IDLE");
  const [popupStatusMessage, setPopupStatusMessage] = useState("");
  const [popupSessionToken, setPopupSessionToken] = useState("");
  const popupWindowRef = useRef<Window | null>(null);
  const popupMonitorRef = useRef<number | null>(null);

  const derivedUserId = useMemo(() => {
    const normalized = username.trim().toLowerCase();
    if (!normalized) {
      return "";
    }

    return normalized.replace(/[^a-z0-9]+/g, "-").slice(0, 50);
  }, [username]);

  useEffect(() => {
    const queryPartnerId = searchParams.get("partnerId");
    const queryUserId = searchParams.get("userId");
    const queryState = searchParams.get("state");
    const queryFlow = searchParams.get("flow");
    const queryMode = searchParams.get("mode");

    if (queryPartnerId) {
      setPartnerId(queryPartnerId);
    }
    if (queryUserId) {
      setUserId(queryUserId);
    }
    if (queryState) {
      setState(queryState);
    }
    if (queryFlow?.toLowerCase() === "popup") {
      setIntegrationMode("POPUP");
    }
    if (queryFlow?.toLowerCase() === "redirect") {
      setIntegrationMode("REDIRECT");
    }
    if (queryMode?.toLowerCase() === "test" || queryMode?.toLowerCase() === "sandbox") {
      setProductMode("test");
    }
    if (queryMode?.toLowerCase() === "live") {
      setProductMode("live");
    }
  }, [searchParams]);

  useEffect(() => {
    if (!userId) {
      setUserId(derivedUserId);
    }
  }, [derivedUserId, userId]);

  useEffect(() => {
    const pending = readPendingPartnerAuthContext();
    if (!pending) {
      return;
    }

    setPopupSessionToken(pending.sessionToken);
    if (pending.apiKey) {
      setPartnerApiKey(pending.apiKey);
    }
    if (pending.mode === "popup") {
      setPopupStatusMessage("Pending popup verification session found. Continue verification.");
    }
  }, []);

  useEffect(() => {
    const handlePopupCallback = async (event: MessageEvent<PopupCallbackPayload>) => {
      if (event.origin !== window.location.origin) {
        return;
      }

      const payload = event.data;
      if (!payload || payload.type !== "VISUAL_PASSWORD_CALLBACK") {
        return;
      }
      if (event.source !== popupWindowRef.current) {
        return;
      }

      if (popupMonitorRef.current) {
        window.clearInterval(popupMonitorRef.current);
        popupMonitorRef.current = null;
      }

      if (popupWindowRef.current && !popupWindowRef.current.closed) {
        popupWindowRef.current.close();
      }
      popupWindowRef.current = null;

      const pendingContext = readPendingPartnerAuthContext();
      if (!pendingContext) {
        setPopupStatus("ERROR");
        setPopupStatusMessage("No pending auth context found. Rejecting callback.");
        toast.error("Callback rejected due to missing auth context.");
        return;
      }

      if (
        payload.sessionToken !== pendingContext.sessionToken ||
        payload.state !== pendingContext.state ||
        payload.partnerId !== pendingContext.partnerId ||
        payload.userId !== pendingContext.userId ||
        payload.environment !== pendingContext.environment
      ) {
        setPopupStatus("ERROR");
        setPopupStatusMessage("Callback payload mismatch detected. Login denied.");
        clearPendingPartnerAuthContext();
        toast.error("Callback payload mismatch. Potential tampering detected.");
        return;
      }

      const callbackResult = String(payload.result || "FAIL").toUpperCase();
      if (callbackResult !== "PASS" || !payload.signature) {
        setPopupStatus("FAIL");
        setPopupStatusMessage("Verification failed. Partner login must remain blocked.");
        clearPendingPartnerAuthContext();
        toast.error("Visual verification failed.");
        return;
      }

      setPopupStatus("VERIFYING");
      setPopupStatusMessage("Validating PASS signature on partner backend...");

      try {
        const consumed = await requestJson<ConsumeResultResponse>(
          `/api/product/v1/partner/consume-result?mode=${productMode}`,
          {
            method: "POST",
            body: JSON.stringify({ signature: payload.signature }),
            headers: partnerApiKey.trim() ? { "x-api-key": partnerApiKey.trim() } : undefined,
          }
        );

        setPopupStatus("PASS");
        setPopupStatusMessage(
          `PASS verified for ${consumed.userId}. Partner session can now start.`
        );
        clearPendingPartnerAuthContext();
        toast.success("PASS verified. Continue to partner session.");
      } catch (error) {
        if (error instanceof HttpError) {
          setPopupStatusMessage(error.message);
        } else {
          setPopupStatusMessage("Unable to validate popup callback signature.");
        }
        setPopupStatus("ERROR");
        clearPendingPartnerAuthContext();
        toast.error("Callback signature validation failed.");
      }
    };

    window.addEventListener("message", handlePopupCallback);

    return () => {
      window.removeEventListener("message", handlePopupCallback);
    };
  }, [partnerApiKey, productMode]);

  useEffect(() => {
    return () => {
      if (popupMonitorRef.current) {
        window.clearInterval(popupMonitorRef.current);
      }

      if (popupWindowRef.current && !popupWindowRef.current.closed) {
        popupWindowRef.current.close();
      }
    };
  }, []);

  const startBankingHandshake = async () => {
    if (!userId.trim() || !partnerId.trim()) {
      return;
    }

    setStarting(true);
    setPopupStatus("IDLE");
    setPopupStatusMessage("");
    setPopupSessionToken("");

    try {
      const effectiveState = state.trim() || createSecureState();
      if (!state.trim()) {
        setState(effectiveState);
      }

      const callbackUrl = `${window.location.origin}/partner-live/callback?flow=${integrationMode.toLowerCase()}&env=${productMode}`;
      const data = await requestJson<InitAuthResponse>(`/api/product/v1/init-auth?mode=${productMode}`, {
        method: "POST",
        body: JSON.stringify({
          partnerId: partnerId.trim(),
          userId: userId.trim(),
          state: effectiveState,
          callbackUrl,
        }),
        headers: partnerApiKey.trim() ? { "x-api-key": partnerApiKey.trim() } : undefined,
      });

      const verifyPath = data.verifyPath || `/verify/${encodeURIComponent(data.sessionToken)}`;
      writePendingPartnerAuthContext({
        sessionToken: data.sessionToken,
        partnerId: partnerId.trim(),
        userId: userId.trim(),
        state: effectiveState,
        mode: integrationMode === "POPUP" ? "popup" : "redirect",
        environment: productMode,
        apiKey: partnerApiKey.trim(),
        createdAt: Date.now(),
      });

      if (integrationMode === "REDIRECT") {
        router.push(verifyPath);
        return;
      }

      const verifyUrl = new URL(verifyPath, window.location.origin).toString();
      const popup = window.open(
        verifyUrl,
        "visual-password-checkout",
        "popup=yes,width=540,height=780,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes"
      );

      if (!popup) {
        setPopupStatus("ERROR");
        setPopupStatusMessage(
          "Popup blocked by browser. Allow popups or use redirect mode."
        );
        clearPendingPartnerAuthContext();
        toast.error("Popup blocked. Allow popups for hosted verification flow.");
        return;
      }

      popup.focus();
      popupWindowRef.current = popup;
      setPopupSessionToken(data.sessionToken);
      setPopupStatus("OPEN");
      setPopupStatusMessage("Secure verification popup opened. Waiting for callback...");

      if (popupMonitorRef.current) {
        window.clearInterval(popupMonitorRef.current);
      }

      popupMonitorRef.current = window.setInterval(() => {
        if (!popupWindowRef.current || !popupWindowRef.current.closed) {
          return;
        }

        window.clearInterval(popupMonitorRef.current!);
        popupMonitorRef.current = null;
        popupWindowRef.current = null;

        setPopupStatus((current) => {
          if (current === "OPEN") {
            setPopupStatusMessage("Popup closed before PASS result. Partner login denied.");
            clearPendingPartnerAuthContext();
            toast.error("Secure popup was closed before completion.");
            return "FAIL";
          }

          return current;
        });
      }, 350);
    } catch (error) {
      if (error instanceof HttpError) {
        if (error.status === 404) {
          toast.error(
            `No profile for partnerId="${partnerId.trim()}" and userId="${userId.trim()}". Enroll this exact pair in Admin.`
          );
        } else {
          toast.error(error.message);
        }
      } else {
        toast.error("Unable to start secure handshake.");
      }
      setPopupStatus("ERROR");
      setPopupStatusMessage("Failed to initialize secure verification session.");
      clearPendingPartnerAuthContext();
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900">
      {/* Fake Bank Header */}
      <header className="bg-[#0047AB] text-white shadow-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded bg-white text-2xl font-bold text-[#0047AB]">
              AB
            </div>
            <span className="text-xl font-semibold tracking-tight">AnyBank</span>
          </div>
          <nav className="hidden gap-6 text-sm font-medium opacity-90 md:flex">
            <span>Personal</span>
            <span>Business</span>
            <span>Loans</span>
            <span>Support</span>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-10">
        <div className="grid gap-10 md:grid-cols-2">
          {/* Left Column: Marketing / Welcome */}
          <div className="hidden flex-col justify-center space-y-6 md:flex">
            <h1 className="text-4xl font-bold text-[#0047AB]">
              Welcome to Next-Gen Banking
            </h1>
            <p className="text-lg text-slate-600">
              Secure, fast, and reliable. Experience the future of digital finance with AnyBank's new visual security integration.
            </p>
            <div className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="flex items-center gap-4 mb-3">
                    <div className="h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/></svg>
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800">Enhanced Security</h3>
                        <p className="text-xs text-slate-500">We use FraudShield visual verification.</p>
                    </div>
                </div>
                <div className="space-y-2">
                    <div className="h-2 w-3/4 bg-slate-100 rounded"></div>
                    <div className="h-2 w-1/2 bg-slate-100 rounded"></div>
                </div>
            </div>
          </div>

          {/* Right Column: Login Form */}
          <div className="flex justify-center">
            <Card className="w-full max-w-md border-0 shadow-2xl">
              <CardHeader className="border-b border-slate-100 bg-white pb-6 pt-8 text-center">
                <CardTitle className="text-2xl text-[#0047AB]">NetBanking Login</CardTitle>
                <CardDescription>
                  Enter your Customer ID to proceed.
                </CardDescription>
              </CardHeader>
              <CardContent className="bg-white p-6 pt-8 space-y-6">
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Customer ID / Username</label>
                    <Input
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      placeholder="Enter Customer ID"
                      className="h-12 border-slate-300 text-lg bg-slate-50 focus:border-[#0047AB] focus:ring-[#0047AB]"
                    />
                  </div>

                   {/* Integration Mode Toggles (User Friendly) */}
                   <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Login Method</label>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => setIntegrationMode("REDIRECT")}
                            className={`px-3 py-2 text-sm font-bold rounded-lg border transition-all ${integrationMode === "REDIRECT" ? "bg-[#0047AB] text-white border-[#0047AB]" : "bg-white text-slate-600 border-slate-200 hover:border-[#0047AB]"}`}
                        >
                            Standard Page
                        </button>
                        <button
                            type="button"
                            onClick={() => setIntegrationMode("POPUP")}
                            className={`px-3 py-2 text-sm font-bold rounded-lg border transition-all ${integrationMode === "POPUP" ? "bg-[#0047AB] text-white border-[#0047AB]" : "bg-white text-slate-600 border-slate-200 hover:border-[#0047AB]"}`}
                        >
                            Secure Popup
                        </button>
                    </div>
                  </div>

                   <Button 
                    onClick={startBankingHandshake} 
                    disabled={!userId.trim() || !partnerId.trim() || starting}
                    className="w-full h-12 bg-[#0047AB] hover:bg-[#003380] text-white font-bold text-lg shadow-lg shadow-blue-900/20"
                   >
                    {starting ? (
                        <span className="flex items-center gap-2">
                             Connecting...
                        </span>
                    ) : (
                        "Secure Login"
                    )}
                  </Button>
                </div>

                <div className="text-center text-xs text-slate-400">
                    <p>Protected by 256-bit SSL encryption.</p>
                </div>

                 {integrationMode === "POPUP" && (
                    <div className="mt-4">
                    <Alert
                        className={
                        popupStatus === "PASS"
                            ? "border-emerald-500/40 bg-emerald-50"
                            : popupStatus === "FAIL" || popupStatus === "ERROR"
                            ? "border-rose-500/40 bg-rose-50"
                            : "border-slate-200 bg-slate-50"
                        }
                    >
                        <AlertTitle className="text-xs font-bold uppercase tracking-wider">Session Status</AlertTitle>
                        <AlertDescription className="text-xs">
                        {popupStatusMessage || "Ready to launch secure popup."}
                        </AlertDescription>
                    </Alert>
                    </div>
                )}


                {/* Developer Tools Toggle */}
                <div className="mt-8 pt-6 border-t border-slate-100">
                    <details className="group">
                        <summary className="cursor-pointer text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 select-none hover:text-slate-600">
                            <span>Developer / Integration Config</span>
                            <svg className="w-4 h-4 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </summary>
                         <div className="space-y-4 pt-4 animate-in slide-in-from-top-2 duration-200">
                            <div className="grid gap-2">
                                <label className="text-xs font-medium text-slate-500">Partner ID</label>
                                <Input
                                    value={partnerId}
                                    onChange={(event) => setPartnerId(event.target.value)}
                                    className="h-8 text-xs font-mono bg-slate-50"
                                />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-xs font-medium text-slate-500">Partner User ID (Derived)</label>
                                <Input
                                    value={userId}
                                    onChange={(event) => setUserId(event.target.value)}
                                    className="h-8 text-xs font-mono bg-slate-50"
                                />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-xs font-medium text-slate-500">Environment</label>
                                <div className="flex gap-2">
                                    <button
                                    type="button"
                                    onClick={() => setProductMode("test")}
                                    className={`px-3 py-1 text-xs rounded border ${productMode === "test" ? "bg-slate-800 text-white" : "bg-white"}`}
                                    >
                                    Test
                                    </button>
                                    <button
                                    type="button"
                                    onClick={() => setProductMode("live")}
                                    className={`px-3 py-1 text-xs rounded border ${productMode === "live" ? "bg-emerald-600 text-white" : "bg-white"}`}
                                    >
                                    Live
                                    </button>
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <label className="text-xs font-medium text-slate-500">API Key</label>
                                <Input
                                    value={partnerApiKey}
                                    onChange={(event) => setPartnerApiKey(event.target.value)}
                                    placeholder="Optional"
                                    className="h-8 text-xs font-mono bg-slate-50"
                                />
                            </div>
                         </div>
                    </details>
                </div>

              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-6xl px-4 flex justify-between items-center">
             <span>© 2026 AnyBank Corp. All rights reserved.</span>
             <div className="flex gap-4">
                 <span>Privacy Policy</span>
                 <span>Terms of Service</span>
                 <span>Security</span>
             </div>
        </div>
      </footer>
    </div>
  );
}

export default function PartnerLivePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#eaf2f8] text-slate-700 dark:bg-slate-950 dark:text-slate-400">
          Loading partner integration...
        </div>
      }
    >
      <PartnerLivePageContent />
    </Suspense>
  );
}
