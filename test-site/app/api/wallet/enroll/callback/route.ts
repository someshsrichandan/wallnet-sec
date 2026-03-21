import { NextRequest, NextResponse } from "next/server";

import { findUserByPartnerUserId, updateUserVisualEnabled } from "@/lib/store";
import { siteConfig } from "@/lib/config";
import { readServerSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const result = searchParams.get("result");
  const enrollToken = searchParams.get("enrollToken");

  if (result !== "ENROLLED" || !enrollToken) {
    return NextResponse.redirect(
      new URL(
        "/login?enrollError=Enrollment+did+not+complete",
        siteConfig.publicOrigin,
      ),
    );
  }

  try {
    // Verify enrollment session via the SaaS backend
    const backendUrl = `${siteConfig.visualApiBase}/visual-password/v1/enroll-session/${encodeURIComponent(enrollToken)}`;
    const sessionRes = await fetch(backendUrl, { cache: "no-store" });

    if (!sessionRes.ok) {
      throw new Error("Unable to verify enrollment session.");
    }

    const sessionData = (await sessionRes.json()) as {
      partnerId: string;
      userId: string;
      status: string;
    };

    if (sessionData.status !== "COMPLETED") {
      throw new Error("Enrollment session is not marked completed.");
    }

    // Mark user as visual-enabled
    const user = await findUserByPartnerUserId(sessionData.userId);
    if (user) {
      await updateUserVisualEnabled(user.id, true);
    }

    // If user has active session, go to dashboard; otherwise login
    const bankSession = await readServerSession();
    if (bankSession) {
      return NextResponse.redirect(
        new URL("/dashboard?enrolled=1", siteConfig.publicOrigin),
      );
    }

    return NextResponse.redirect(
      new URL("/login?enrolled=1", siteConfig.publicOrigin),
    );
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Enrollment callback failed.";
    return NextResponse.redirect(
      new URL(
        `/login?enrollError=${encodeURIComponent(msg)}`,
        siteConfig.publicOrigin,
      ),
    );
  }
}
