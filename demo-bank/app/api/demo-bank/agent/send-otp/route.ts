import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { findUserByPartnerUserId } from "@/lib/demo-bank-store";
import { generateOtp, storeOtp } from "@/lib/agent-otp-store";
import { sendOtpEmail } from "@/lib/email-service";

/**
 * POST /api/demo-bank/agent/send-otp
 * Agent triggers OTP send to user's registered email.
 * Returns a requestId the agent will use to verify the OTP.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { partnerUserId: string; agentName: string };
    const partnerUserId = String(body.partnerUserId || "").trim();
    const agentName = String(body.agentName || "Support Agent").trim();

    if (!partnerUserId) {
      return NextResponse.json({ message: "partnerUserId is required." }, { status: 400 });
    }

    const user = await findUserByPartnerUserId(partnerUserId);
    if (!user) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    const otp = generateOtp();
    const requestId = randomUUID();

    storeOtp(requestId, {
      otp,
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
    });

    await sendOtpEmail(user.email, otp, user.fullName);

    console.log(`[agent] OTP sent by agent "${agentName}" for user ${partnerUserId} → ${maskEmail(user.email)}`);

    return NextResponse.json({
      ok: true,
      requestId,
      emailMasked: maskEmail(user.email),
      message: `OTP sent to ${maskEmail(user.email)}. Ask the caller to provide it.`,
      expiresInSeconds: 300,
    });
  } catch (err) {
    console.error("[agent/send-otp]", err);
    return NextResponse.json({ message: "Failed to send OTP." }, { status: 500 });
  }
}

const maskEmail = (email: string) => {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  return local.slice(0, 2) + "***@" + domain;
};
