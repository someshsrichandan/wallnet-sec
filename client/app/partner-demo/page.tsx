"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function PartnerDemoPage() {
  const router = useRouter();
  const [username, setUsername] = useState("customer@bank.com");
  const [partnerId, setPartnerId] = useState("hdfc_bank");
  const [simulatedState, setSimulatedState] = useState("txn-login-001");

  const userId = useMemo(() => {
    const normalized = username.trim().toLowerCase();
    if (!normalized) {
      return "";
    }

    return normalized.replace(/[^a-z0-9]+/g, "-").slice(0, 50);
  }, [username]);

  const redirectToSecureChallenge = () => {
    if (!partnerId.trim() || !userId) {
      return;
    }

    router.push(
      `/partner-live?partnerId=${encodeURIComponent(partnerId.trim())}&userId=${encodeURIComponent(
        userId
      )}&state=${encodeURIComponent(simulatedState.trim() || "txn-login-001")}&flow=popup&mode=test`
    );
  };

  return (
    <div className="min-h-screen bg-[#eef3ec] text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-14">
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-600 dark:text-slate-400">
            Dummy Partner Flow
          </p>
          <h1 className="text-3xl font-semibold md:text-4xl">
            Simulate real-world partner website login
          </h1>
          <p className="max-w-3xl text-slate-700 dark:text-slate-300">
            This route mirrors production sequencing: partner login form to secure visual
            password challenge to PASS or FAIL callback.
          </p>
        </section>

        <Card className="border-slate-900/10 bg-white/90 dark:bg-slate-800/90 dark:border-slate-700/70">
          <CardHeader>
            <CardTitle>Partner Login Screen</CardTitle>
            <CardDescription>
              Enter values and redirect to the visual-password portal.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3">
              <label className="text-sm font-medium">Bank username</label>
              <Input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="customer@bank.com"
              />
            </div>
            <div className="grid gap-3">
              <label className="text-sm font-medium">Partner ID</label>
              <Input
                value={partnerId}
                onChange={(event) => setPartnerId(event.target.value)}
                placeholder="hdfc_bank"
              />
            </div>
            <div className="grid gap-3">
              <label className="text-sm font-medium">Partner State</label>
              <Input
                value={simulatedState}
                onChange={(event) => setSimulatedState(event.target.value)}
                placeholder="txn-login-001"
              />
            </div>
            <Alert className="border-slate-900/10 bg-slate-50 dark:bg-slate-700/60 dark:border-slate-700">
              <AlertTitle>Derived user ID</AlertTitle>
              <AlertDescription>{userId || "Type username to generate userId"}</AlertDescription>
            </Alert>
            <div className="flex flex-wrap gap-3">
              <Button onClick={redirectToSecureChallenge} disabled={!partnerId.trim() || !userId}>
                Redirect to Secure Challenge
              </Button>
              <Button asChild variant="outline">
                <Link href="/">Back to Problem Statement</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
