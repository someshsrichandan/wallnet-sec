import { NextResponse } from "next/server";
import { findUserByEmail, findUserByPartnerUserId } from "@/lib/demo-bank-store";
import { generateOtp, storeOtp } from "@/lib/agent-otp-store";
import { sendOtpEmail } from "@/lib/email-service";

/**
 * POST /api/demo-bank/forgot/request
 * User submits their email → system sends OTP to that email.
 * Returns requestId + (in dev) the OTP itself for demo purposes.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; partnerUserId?: string };
    const email = String(body.email || "").trim().toLowerCase();
    const partnerUserId = String(body.partnerUserId || "").trim();

    if (!email && !partnerUserId) {
      return NextResponse.json({ message: "Email address is required." }, { status: 400 });
    }

    // Find user — always respond with same message to prevent user enumeration
    const user = email
      ? await findUserByEmail(email)
      : await findUserByPartnerUserId(partnerUserId);

    // Always return 200 even if user not found (security: don't leak if email exists)
    if (!user) {
      return NextResponse.json({
        ok: true,
        requestId: "not-found-" + Math.random().toString(36).slice(2),
        message: "If this email is registered, an OTP has been sent.",
        devOtp: null, // never leak in production
      });
    }

    const otp = generateOtp();
    const requestId = crypto.randomUUID();

    storeOtp(requestId, {
      otp,
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
    });

    // Send email — falls back to console.log in dev if GMAIL_USER not set
    await sendOtpEmail(user.email, otp, user.fullName);

    const isDev = process.env.NODE_ENV !== "production";

    return NextResponse.json({
      ok: true,
      requestId,
      emailMasked: maskEmail(user.email),
      message: `OTP sent to ${maskEmail(user.email)}. Check your inbox.`,
      // Expose OTP in dev mode so the demo works without real email config
      devOtp: isDev ? otp : null,
      devMode: isDev,
    });
  } catch {
    return NextResponse.json({ message: "Failed to send OTP. Please try again." }, { status: 500 });
  }
}

const maskEmail = (email: string) => {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  return local.slice(0, 2) + "***@" + domain;
};
