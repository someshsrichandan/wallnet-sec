import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { verifyOtp, clearOtp } from "@/lib/agent-otp-store";
import { findUserByPartnerUserId } from "@/lib/demo-bank-store";
import { sendReenrollLinkEmail } from "@/lib/email-service";
import { initVisualEnroll, VisualApiError } from "@/lib/visual-api";
import { demoBankConfig } from "@/lib/config";

/**
 * POST /api/demo-bank/agent/verify-otp
 *
 * Agent submits the OTP the caller read out.
 * On success, AUTOMATICALLY:
 *   1. Generates a fresh 15-min visual enroll session
 *   2. Emails the re-enrollment link to the user's registered email
 *   3. Clears the OTP session
 *
 * No extra "send-reset-link" step needed — everything happens here.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      requestId: string;
      otp: string;
      agentName?: string;
    };
    const requestId = String(body.requestId || "").trim();
    const otp = String(body.otp || "").trim();
    const agentName = String(body.agentName || "Support Agent").trim();

    if (!requestId || !otp) {
      return NextResponse.json({ message: "requestId and otp are required." }, { status: 400 });
    }

    /* ── 1. Verify OTP ── */
    const result = verifyOtp(requestId, otp);
    if (!result.valid) {
      return NextResponse.json({ ok: false, message: result.reason || "Invalid OTP." }, { status: 422 });
    }
    const record = result.record!;

    /* ── 2. Look up user to get partnerUserId ── */
    const user = await findUserByPartnerUserId(record.userId)
      // record.userId might already be partnerUserId depending on store usage
      ?? await findUserByPartnerUserId(record.userId);

    // Fallback: use what we stored in the OTP record
    const partnerUserId = user?.partnerUserId ?? record.userId;

    /* ── 3. Generate fresh visual enroll session ── */
    const enroll = await initVisualEnroll({
      partnerUserId,
      state: randomUUID(),
    });

    /* ── 4. Email the re-enrollment link automatically ── */
    let emailSent = false;
    try {
      await sendReenrollLinkEmail(record.email, record.fullName, enroll.enrollUrl, agentName);
      emailSent = true;
    } catch (emailErr) {
      console.warn("[agent/verify-otp] email send failed:", emailErr instanceof Error ? emailErr.message : emailErr);
    }

    /* ── 5. Clear OTP session ── */
    clearOtp(requestId);

    console.log(
      `[agent] Identity verified + link auto-sent by "${agentName}" ` +
      `for "${partnerUserId}" → ${record.email} | partner="${demoBankConfig.partnerId}"`
    );

    return NextResponse.json({
      ok: true,
      message: emailSent
        ? `✅ Identity verified! Reset link automatically sent to ${maskEmail(record.email)}.`
        : `✅ Identity verified! (Email send failed — check GMAIL_USER config)`,
      emailSentTo: record.email,
      emailMasked: maskEmail(record.email),
      emailSent,
      linkExpiresInMinutes: 15,
      // Return link in dev mode so agent can see it even without email
      enrollUrl: process.env.NODE_ENV !== "production" ? enroll.enrollUrl : undefined,
    });
  } catch (err) {
    if (err instanceof VisualApiError) {
      return NextResponse.json({ message: `Visual API error: ${err.message}` }, { status: err.statusCode });
    }
    console.error("[agent/verify-otp]", err);
    return NextResponse.json({ message: "Verification failed. Please try again." }, { status: 500 });
  }
}

const maskEmail = (e: string) => {
  const [l, d] = e.split("@");
  return l ? l.slice(0, 2) + "***@" + d : e;
};
