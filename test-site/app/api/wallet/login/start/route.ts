import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { siteConfig } from "@/lib/config";
import { findUserByEmail } from "@/lib/store";
import { verifyPassword } from "@/lib/password";
import { applyPending, clearSession, clearPending } from "@/lib/session";
import {
  initVisualAuth,
  initVisualEnroll,
  VisualApiError,
} from "@/lib/visual-api";

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
      return NextResponse.json(
        { message: "Email and password are required." },
        { status: 400 },
      );
    }

    const user = await findUserByEmail(payload.email);
    if (!user) {
      return NextResponse.json(
        { message: "Invalid email or password." },
        { status: 401 },
      );
    }

    const passwordValid = await verifyPassword(
      payload.password,
      user.passwordHash,
    );
    if (!passwordValid) {
      return NextResponse.json(
        { message: "Invalid email or password." },
        { status: 401 },
      );
    }

    const state = randomUUID();
    const loginId = randomUUID();

    // Try visual auth; if no profile yet, offer enrollment
    let initResult: Awaited<ReturnType<typeof initVisualAuth>> | null = null;
    let enrollUrl: string | null = null;

    try {
      initResult = await initVisualAuth({
        partnerUserId: user.partnerUserId,
        state,
      });
    } catch (authErr) {
      if (authErr instanceof VisualApiError && authErr.statusCode === 404) {
        const enroll = await initVisualEnroll({
          partnerUserId: user.partnerUserId,
          state,
        });
        enrollUrl = enroll.enrollUrl;
      } else {
        throw authErr;
      }
    }

    if (enrollUrl) {
      return NextResponse.json(
        {
          needsEnroll: true,
          enrollUrl,
          message: "Visual password not set up yet. Redirecting to setup…",
        },
        { status: 200 },
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

    applyPending(response, {
      loginId,
      state,
      sessionToken: init.sessionToken,
      partnerId: siteConfig.partnerId,
      partnerUserId: user.partnerUserId,
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
    });
    clearSession(response);
    return response;
  } catch (error) {
    if (error instanceof VisualApiError) {
      return NextResponse.json(
        { message: `Unable to start visual verification: ${error.message}` },
        { status: error.statusCode },
      );
    }
    const response = NextResponse.json(
      {
        message:
          error instanceof Error ?
            error.message
          : "Unable to start login flow.",
      },
      { status: 500 },
    );
    clearPending(response);
    return response;
  }
}
