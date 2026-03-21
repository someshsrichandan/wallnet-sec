"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { HttpError, requestJson } from "@/lib/http";
import {
  clearPendingPartnerAuthContext,
  readPendingPartnerAuthContext,
} from "@/lib/partner-auth-context";

type ConsumeResultResponse = {
  result: "PASS";
  partnerId: string;
  userId: string;
  state: string;
  sessionToken: string;
  consumedAt: string;
};

type PopupCallbackPayload = {
  type: "VISUAL_PASSWORD_CALLBACK";
  result: string;
  signature: string;
  state: string;
  sessionToken: string;
  partnerId: string;
  userId: string;
  environment?: string;
};

function PartnerCallbackPageContent() {
  const searchParams = useSearchParams();
  const signature = searchParams.get("signature") ?? "";
  const resultParam = searchParams.get("result") ?? "";
  const state = searchParams.get("state") ?? "";
  const sessionToken = searchParams.get("sessionToken") ?? "";
  const partnerId = searchParams.get("partnerId") ?? "";
  const userId = searchParams.get("userId") ?? "";
  const modeParam = (searchParams.get("mode") ?? "").toLowerCase();
  const flow = (searchParams.get("flow") ?? (modeParam === "popup" || modeParam === "redirect" ? modeParam : "")).toLowerCase();
  const env = (searchParams.get("env") ?? (modeParam === "test" || modeParam === "live" ? modeParam : "live")).toLowerCase();
  const productMode = env === "test" || env === "sandbox" ? "test" : "live";
  const isPopupMode = flow === "popup";

  const [loading, setLoading] = useState(false);
  const [consumeResult, setConsumeResult] = useState<ConsumeResultResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [postedToOpener, setPostedToOpener] = useState(false);
  const [contextCheckMessage, setContextCheckMessage] = useState("");
  const [contextValid, setContextValid] = useState(true);
  const [pendingApiKey, setPendingApiKey] = useState("");

  useEffect(() => {
    if (isPopupMode) {
      setContextValid(true);
      setContextCheckMessage("Popup mode: opener validates context and signature.");
      return;
    }

    const pendingContext = readPendingPartnerAuthContext();
    if (!pendingContext) {
      setContextValid(false);
      setContextCheckMessage("No pending auth context found. Callback rejected.");
      setPendingApiKey("");
      return;
    }

    const partnerMatches = !partnerId || pendingContext.partnerId === partnerId;
    const userMatches = !userId || pendingContext.userId === userId;

    if (
      pendingContext.sessionToken !== sessionToken ||
      pendingContext.state !== state ||
      !partnerMatches ||
      !userMatches ||
      pendingContext.environment !== productMode
    ) {
      setContextValid(false);
      setContextCheckMessage("Callback context mismatch detected. Possible replay/tampering.");
      clearPendingPartnerAuthContext();
      setPendingApiKey("");
      return;
    }

    setContextValid(true);
    setContextCheckMessage("Callback context validated.");
    setPendingApiKey(pendingContext.apiKey || "");
  }, [isPopupMode, partnerId, productMode, sessionToken, state, userId]);

  useEffect(() => {
    if (!isPopupMode || !contextValid) {
      return;
    }

    const payload: PopupCallbackPayload = {
      type: "VISUAL_PASSWORD_CALLBACK",
      result: resultParam || "FAIL",
      signature,
      state,
      sessionToken,
      partnerId,
      userId,
      environment: productMode,
    };

    if (!window.opener || window.opener.closed) {
      return;
    }

    window.opener.postMessage(payload, window.location.origin);
    setPostedToOpener(true);
    clearPendingPartnerAuthContext();

    const closeTimer = window.setTimeout(() => {
      window.close();
    }, 150);

    return () => {
      window.clearTimeout(closeTimer);
    };
  }, [contextValid, isPopupMode, partnerId, productMode, resultParam, sessionToken, signature, state, userId]);

  useEffect(() => {
    if (!signature || isPopupMode || !contextValid) {
      return;
    }

    const consume = async () => {
      setLoading(true);
      try {
        const data = await requestJson<ConsumeResultResponse>(
          `/api/product/v1/partner/consume-result?mode=${productMode}`,
          {
            method: "POST",
            body: JSON.stringify({ signature }),
            headers: pendingApiKey.trim() ? { "x-api-key": pendingApiKey.trim() } : undefined,
          }
        );
        setConsumeResult(data);
        clearPendingPartnerAuthContext();
      } catch (error) {
        if (error instanceof HttpError) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage("Unable to validate callback signature.");
        }
      } finally {
        setLoading(false);
      }
    };

    consume();
  }, [contextValid, isPopupMode, pendingApiKey, productMode, signature]);

  return (
    <div className="min-h-screen bg-[#edf5ef] text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-14">
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-600 dark:text-slate-400">
            Partner Callback
          </p>
          <h1 className="text-3xl font-semibold md:text-4xl">Partner Site Verification Result</h1>
        </section>

        <Card className="border-slate-900/10 bg-white/90 dark:bg-slate-800/90 dark:border-slate-700/70">
          <CardHeader>
            <CardTitle>Callback Payload</CardTitle>
            <CardDescription>Result received after visual authentication portal.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
            <p>Mode: {isPopupMode ? "Popup" : "Redirect"}</p>
            <p>Environment: {productMode.toUpperCase()}</p>
            <p>Result param: {resultParam || "Not provided"}</p>
            <p>State: {state || "Not provided"}</p>
            <p>Session token: {sessionToken || "Not provided"}</p>
            <p className="break-all">
              Signature: {signature ? `${signature.slice(0, 32)}...` : "Not provided"}
            </p>
            {isPopupMode ? (
              <Alert className="border-slate-900/10 bg-slate-50 dark:bg-slate-700/60 dark:border-slate-700">
                <AlertTitle>Popup callback bridge</AlertTitle>
                <AlertDescription>
                  {postedToOpener
                    ? "Result sent to opener page. This popup closes automatically."
                    : "Opener page not found. Close this window and retry."}
                </AlertDescription>
              </Alert>
            ) : null}
            <Alert className={contextValid ? "border-emerald-500/40 bg-emerald-50 dark:bg-emerald-900/20" : "border-rose-500/40 bg-rose-50 dark:bg-rose-900/20"}>
              <AlertTitle>Callback context check</AlertTitle>
              <AlertDescription>{contextCheckMessage || "Pending..."}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card className="border-slate-900/10 bg-white/90 dark:bg-slate-800/90 dark:border-slate-700/70">
          <CardHeader>
            <CardTitle>Server Validation</CardTitle>
            <CardDescription>
              Partner backend should always validate the signature before allowing password step.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading && (
              <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <Spinner /> Validating callback signature...
              </div>
            )}

            {!loading && consumeResult && (
              <Alert className="border-emerald-500/40 bg-emerald-50 dark:bg-emerald-900/20">
                <AlertTitle>PASS validated</AlertTitle>
                <AlertDescription>
                  User {consumeResult.userId} authenticated for partner {consumeResult.partnerId}.
                  Consumed at {new Date(consumeResult.consumedAt).toLocaleString()}.
                </AlertDescription>
              </Alert>
            )}

            {!loading && !consumeResult && errorMessage && (
              <Alert className="border-rose-500/40 bg-rose-50 dark:bg-rose-900/20">
                <AlertTitle>Validation failed</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            {!loading && !consumeResult && !errorMessage && !signature && (
              <Alert className="border-amber-500/40 bg-amber-50 dark:bg-amber-900/20">
                <AlertTitle>No signature present</AlertTitle>
                <AlertDescription>
                  This callback indicates non-PASS outcome or incomplete redirect data.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/partner-live">Start New Partner Login</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/">Back to Home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default function PartnerCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#edf5ef] text-slate-700">
          Loading callback...
        </div>
      }
    >
      <PartnerCallbackPageContent />
    </Suspense>
  );
}
