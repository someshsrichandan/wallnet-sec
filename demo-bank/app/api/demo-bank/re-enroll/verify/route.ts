import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { demoBankConfig } from "@/lib/config";
import { consumeVisualResult, initVisualEnroll, VisualApiError } from "@/lib/visual-api";

const toSafe = (msg: string) => encodeURIComponent(String(msg || "Re-enrollment failed.").slice(0, 160));

/**
 * GET /api/demo-bank/re-enroll/verify
 *
 * Callback from the visual-auth challenge when the user is changing their
 * visual password. On PASS the handler immediately starts a fresh enrollment
 * and redirects the browser to the SaaS enrollment page.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const result = String(searchParams.get("result") || "").trim().toUpperCase();
  const signature = String(searchParams.get("signature") || "").trim();

  const dashboardBase = new URL("/dashboard", demoBankConfig.publicOrigin);

  if (result !== "PASS" || !signature) {
    const reason =
      result && result !== "PASS"
        ? `Visual re-verification ${result.toLowerCase()}.`
        : "Visual re-verification failed.";
    dashboardBase.searchParams.set("reEnrollError", reason);
    return NextResponse.redirect(dashboardBase);
  }

  try {
    const consumed = await consumeVisualResult(signature);

    if (!consumed.userId) {
      throw new Error("Unable to identify user from verification signature.");
    }

    const enroll = await initVisualEnroll({
      partnerUserId: consumed.userId,
      state: randomUUID(),
    });

    // Redirect the browser directly to the SaaS enrollment page
    return NextResponse.redirect(enroll.enrollUrl);
  } catch (error) {
    const message = error instanceof VisualApiError ? error.message : (error instanceof Error ? error.message : "Re-enrollment failed.");
    dashboardBase.searchParams.set("reEnrollError", message);
    return NextResponse.redirect(dashboardBase);
  }
}
