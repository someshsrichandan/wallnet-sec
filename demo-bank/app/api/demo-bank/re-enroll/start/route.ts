import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { demoBankConfig } from "@/lib/config";
import { readServerSession } from "@/lib/server-auth";
import { initVisualAuth, VisualApiError } from "@/lib/visual-api";

/**
 * POST /api/demo-bank/re-enroll/start
 *
 * Requires an active bank session. Initiates a visual-auth challenge and
 * returns a verifyUrl. On PASS the backend will redirect the browser to
 * /api/demo-bank/re-enroll/verify which then starts a fresh enrollment.
 */
export async function POST() {
  const session = await readServerSession();
  if (!session) {
    return NextResponse.json({ message: "Bank session required." }, { status: 401 });
  }

  try {
    const state = randomUUID();
    const callbackUrl = `${demoBankConfig.publicOrigin}/api/demo-bank/re-enroll/verify`;

    const init = await initVisualAuth({
      partnerUserId: session.partnerUserId,
      state,
      callbackUrl,
    });

    return NextResponse.json({ ok: true, verifyUrl: init.verifyUrl, state });
  } catch (error) {
    if (error instanceof VisualApiError) {
      return NextResponse.json(
        { message: `Unable to start verification: ${error.message}` },
        { status: error.statusCode }
      );
    }
    return NextResponse.json({ message: "Failed to start re-verification." }, { status: 500 });
  }
}
