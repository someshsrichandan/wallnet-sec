import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { getVerifiedRecord, clearOtp } from "@/lib/agent-otp-store";
import { sendReenrollLinkEmail } from "@/lib/email-service";
import { initVisualEnroll, VisualApiError } from "@/lib/visual-api";
import { demoBankConfig } from "@/lib/config";

/**
 * POST /api/demo-bank/agent/send-reset-link
 * After OTP is verified, agent sends the visual password re-enroll link to the user's email.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      requestId: string;
      agentName: string;
      partnerUserId: string;
    };
    const requestId = String(body.requestId || "").trim();
    const agentName = String(body.agentName || "Support Agent").trim();
    const partnerUserId = String(body.partnerUserId || "").trim();

    if (!requestId || !partnerUserId) {
      return NextResponse.json({ message: "requestId and partnerUserId are required." }, { status: 400 });
    }

    // Ensure OTP was verified for this request
    const record = getVerifiedRecord(requestId);
    if (!record) {
      return NextResponse.json({
        message: "Identity not yet verified. Please complete OTP verification first.",
      }, { status: 403 });
    }

    // Initiate enrollment via SaaS backend
    const enroll = await initVisualEnroll({
      partnerUserId,
      state: randomUUID(),
    });

    // Send the enroll link to user's registered email
    await sendReenrollLinkEmail(
      record.email,
      record.fullName,
      enroll.enrollUrl,
      agentName,
    );

    // Clear the OTP session — one use only
    clearOtp(requestId);

    console.log(
      `[agent] Re-enroll link sent by "${agentName}" to ${record.email} ` +
      `for partnerUserId="${partnerUserId}" | partnerId="${demoBankConfig.partnerId}"`
    );

    return NextResponse.json({
      ok: true,
      message: `Re-enrollment link sent to ${record.email}. User can now reset their visual password.`,
      emailSentTo: record.email,
      linkExpiresInMinutes: 15,
    });
  } catch (err) {
    if (err instanceof VisualApiError) {
      return NextResponse.json({ message: `SaaS API error: ${err.message}` }, { status: err.statusCode });
    }
    console.error("[agent/send-reset-link]", err);
    return NextResponse.json({ message: "Failed to send reset link." }, { status: 500 });
  }
}
