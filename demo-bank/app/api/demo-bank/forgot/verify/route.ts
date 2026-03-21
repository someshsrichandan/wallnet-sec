import { NextResponse } from "next/server";
import { verifyOtp, clearOtp } from "@/lib/agent-otp-store";
import { initVisualEnroll, VisualApiError } from "@/lib/visual-api";
import { findUserById } from "@/lib/demo-bank-store";
import { sendReenrollLinkEmail } from "@/lib/email-service";

/**
 * POST /api/demo-bank/forgot/verify
 * User submits the OTP → system verifies + generates + emails re-enroll link.
 * Returns the enrollUrl directly so self-service can redirect immediately.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { requestId: string; otp: string };
    const requestId = String(body.requestId || "").trim();
    const otp = String(body.otp || "").trim();

    if (!requestId || !otp) {
      return NextResponse.json({ message: "requestId and OTP are required." }, { status: 400 });
    }

    const result = verifyOtp(requestId, otp);
    if (!result.valid) {
      return NextResponse.json({ ok: false, message: result.reason }, { status: 422 });
    }

    const record = result.record!;

    // Get fresh user record for partnerUserId
    const user = await findUserById(record.userId);
    if (!user) {
      return NextResponse.json({ message: "User account not found." }, { status: 404 });
    }

    // Initiate visual enrollment
    const enroll = await initVisualEnroll({
      partnerUserId: user.partnerUserId,
      state: crypto.randomUUID(),
    });

    // Send enrollment link to email
    await sendReenrollLinkEmail(
      record.email,
      record.fullName,
      enroll.enrollUrl,
      "Self-Service Recovery",
    );

    // Clear OTP
    clearOtp(requestId);

    const isDev = process.env.NODE_ENV !== "production";

    return NextResponse.json({
      ok: true,
      message: "Identity verified! Re-enrollment link sent to your email.",
      // Return enrollUrl directly so user can be redirected immediately (no extra email step in demo)
      enrollUrl: enroll.enrollUrl,
      emailSentTo: record.email,
      devMode: isDev,
    });
  } catch (err) {
    if (err instanceof VisualApiError) {
      return NextResponse.json({ message: `Failed to start enrollment: ${err.message}` }, { status: err.statusCode });
    }
    return NextResponse.json({ message: "Verification failed. Please try again." }, { status: 500 });
  }
}
