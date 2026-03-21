import { NextRequest, NextResponse } from "next/server";

import { readWalletSessionFromRequest } from "@/lib/session";
import { updateUserVisualEnabled } from "@/lib/demo-wallet-store";

export async function GET(request: NextRequest) {
  const session = readWalletSessionFromRequest(request);

  const result = request.nextUrl.searchParams.get("result");
  const error = request.nextUrl.searchParams.get("error");

  if (result === "SUCCESS" || result === "PASS") {
    if (session) {
      await updateUserVisualEnabled(session.userId, true).catch(() => undefined);
    }
    return NextResponse.redirect(new URL("/dashboard?enrolled=1", request.url));
  }

  const errorMessage = error || "Visual password setup was cancelled or failed.";
  return NextResponse.redirect(
    new URL(`/dashboard?enrollError=${encodeURIComponent(errorMessage)}`, request.url),
  );
}
