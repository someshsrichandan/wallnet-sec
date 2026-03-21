import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { demoBankConfig } from "@/lib/config";
import { findUserByEmail } from "@/lib/demo-bank-store";
import { verifyPassword } from "@/lib/password";
import { applyPendingVisual, clearBankSession, clearPendingVisual } from "@/lib/session";
import { initVisualAuth, initVisualEnroll, VisualApiError } from "@/lib/visual-api";

const parsePayload = async (request: Request) => {
  const body = (await request.json()) as Record<string, unknown>;
  return {
    email: String(body.email || "")
      .trim()
      .toLowerCase(),
    password: String(body.password || ""),
  };
};

export async function POST(request: Request) {
  try {
    const payload = await parsePayload(request);
    if (!payload.email || !payload.password) {
      return NextResponse.json({ message: "email and password are required." }, { status: 400 });
    }

    const user = await findUserByEmail(payload.email);
    if (!user) {
      return NextResponse.json({ message: "Invalid email or password." }, { status: 401 });
    }

    const passwordValid = await verifyPassword(payload.password, user.passwordHash);
    if (!passwordValid) {
      return NextResponse.json({ message: "Invalid email or password." }, { status: 401 });
    }

    const state = randomUUID();
    const loginId = randomUUID();

    // Try to start visual auth; handle missing or stale profiles gracefully.
    let initResult: Awaited<ReturnType<typeof initVisualAuth>> | null = null;
    let enrollUrl: string | null = null;
    let enrollReason: "not_enrolled" | "stale_credential" | null = null;

    try {
      initResult = await initVisualAuth({ partnerUserId: user.partnerUserId, state });
    } catch (authErr) {
      if (authErr instanceof VisualApiError) {
        if (authErr.statusCode === 404) {
          // User has never enrolled — redirect to fresh enrollment.
          enrollReason = "not_enrolled";
        } else if (authErr.statusCode === 422) {
          // Visual credential exists but cannot be decrypted (key rotation or
          // corrupted data). Initiate re-enrollment to overwrite the stale record.
          enrollReason = "stale_credential";
        } else {
          throw authErr;
        }

        // Initiate enrollment (overwrites the stale credential on submit).
        const enroll = await initVisualEnroll({ partnerUserId: user.partnerUserId, state });
        enrollUrl = enroll.enrollUrl;
      } else {
        throw authErr;
      }
    }

    if (enrollUrl) {
      const message =
        enrollReason === "stale_credential"
          ? "Your visual password needs to be reset. Please re-enroll now."
          : "Visual password not set up yet. Redirecting to setup…";

      return NextResponse.json(
        {
          needsEnroll: true,
          enrollUrl,
          enrollReason,
          message,
        },
        { status: 200 }
      );
    }

    const init = initResult!;
    const response = NextResponse.json({
      ok: true,
      verifyUrl: init.verifyUrl,
      sessionToken: init.sessionToken,
      expiresAt: init.expiresAt,
      state,
    });
    applyPendingVisual(response, {
      loginId,
      state,
      sessionToken: init.sessionToken,
      partnerId: demoBankConfig.partnerId,
      partnerUserId: user.partnerUserId,
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
    });
    clearBankSession(response);
    return response;
  } catch (error) {
    if (error instanceof VisualApiError) {
      return NextResponse.json(
        { message: `Unable to start visual verification: ${error.message}` },
        { status: error.statusCode }
      );
    }

    const response = NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to start login flow." },
      { status: 500 }
    );
    clearPendingVisual(response);
    return response;
  }
}
