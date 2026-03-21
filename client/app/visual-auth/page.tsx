"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function VisualAuthPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6efe7] px-6 text-slate-950">
      <div className="max-w-xl space-y-4 text-center">
        <h1 className="text-3xl font-semibold">Visual auth route upgraded</h1>
        <p className="text-slate-700">
          Sessions now start via `/api/visual-password/v1/init-auth` and continue on `/verify/:sessionToken`.
        </p>
        <Button asChild>
          <Link href="/partner-live">Start from Partner Live</Link>
        </Button>
      </div>
    </div>
  );
}
