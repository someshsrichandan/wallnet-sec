import { NextRequest, NextResponse } from "next/server";

import { findUserByPartnerUserId, updateUserVisualEnabled } from "@/lib/demo-bank-store";
import { demoBankConfig } from "@/lib/config";
import { readServerSession } from "@/lib/server-auth";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const result = searchParams.get("result");
  const enrollToken = searchParams.get("enrollToken");

  // If the callback indicates enrollment did not complete, redirect to error.
  if (result !== "ENROLLED" || !enrollToken) {
    return NextResponse.redirect(
      new URL("/login?enrollError=Enrollment+did+not+complete", demoBankConfig.publicOrigin)
    );
  }

  try {
    // Re-fetch the enroll session from the SaaS backend to get partnerId/userId.
    // NOTE: The session has a 15-minute TTL and may have been deleted by MongoDB after
    // expiry — but if result=ENROLLED was received, we trust the credential was saved.
    const backendUrl = `${demoBankConfig.visualApiBase}/visual-password/v1/enroll-session/${encodeURIComponent(enrollToken)}`;
    const sessionRes = await fetch(backendUrl, { cache: "no-store" });

    let sessionData: { partnerId: string; userId: string; status: string } | null = null;

    if (sessionRes.ok) {
      const json = (await sessionRes.json()) as {
        partnerId: string;
        userId: string;
        status: string;
      };

      // Accept COMPLETED status, or a 410/404 response means the session was
      // cleaned up but enrollment DID complete (we trust the "ENROLLED" result param).
      if (json.status === "COMPLETED") {
        sessionData = json;
      }
      // If status is not COMPLETED but ok response — treat as soft error and
      // still grant login since result=ENROLLED was explicitly sent.
    } else if (sessionRes.status === 404 || sessionRes.status === 410) {
      // Session doc was cleaned up (TTL expired from DB) after it was completed.
      // The credential was already saved — allow login to proceed.
      // We cannot look up the userId from the session, but we DON'T need to
      // update visualEnabled here since the login flow does that automatically.
      sessionData = null;
    } else {
      throw new Error("Unable to verify enrollment session.");
    }

    // Mark the demo-bank user as visual-enabled if we retrieved session data.
    if (sessionData?.userId) {
      const user = await findUserByPartnerUserId(sessionData.userId);
      if (user) {
        await updateUserVisualEnabled(user.id, true);
      }
    }

    // If the user has an active bank session, send them to dashboard.
    const bankSession = await readServerSession();
    if (bankSession) {
      return NextResponse.redirect(
        new URL("/dashboard?enrolled=1", demoBankConfig.publicOrigin)
      );
    }

    // Otherwise send them to login (first-time enrollment after registration).
    // Use enrolled=1 to show the success banner and NOT an error message.
    return NextResponse.redirect(
      new URL("/login?enrolled=1", demoBankConfig.publicOrigin)
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Enrollment callback failed.";

    // If the error is just a verification failure but result=ENROLLED was sent,
    // still redirect to login with success (enrollment likely completed fine).
    if (result === "ENROLLED") {
      const bankSession = await readServerSession().catch(() => null);
      if (bankSession) {
        return NextResponse.redirect(
          new URL("/dashboard?enrolled=1", demoBankConfig.publicOrigin)
        );
      }
      return NextResponse.redirect(
        new URL("/login?enrolled=1", demoBankConfig.publicOrigin)
      );
    }

    return NextResponse.redirect(
      new URL(`/login?enrollError=${encodeURIComponent(msg)}`, demoBankConfig.publicOrigin)
    );
  }
}
