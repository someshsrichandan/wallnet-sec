import { NextResponse } from "next/server";

import { createUser, findUserByEmail, findUserByPhone } from "@/lib/demo-wallet-store";
import { hashPassword } from "@/lib/password";
import { validateEmail, validatePhone, validatePassword } from "@/lib/validators";
import { initVisualEnroll, VisualApiError } from "@/lib/visual-api";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const fullName = String(body.fullName || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const phone = String(body.phone || "").trim();
    const password = String(body.password || "");
    const partnerUserId = String(body.partnerUserId || "").trim() || `wallet-${crypto.randomUUID().slice(0, 12)}`;

    if (!fullName || fullName.length < 2) {
      return NextResponse.json({ message: "Full name is required (min 2 chars)." }, { status: 400 });
    }

    if (!validateEmail(email)) {
      return NextResponse.json({ message: "A valid email address is required." }, { status: 400 });
    }

    if (!validatePhone(phone)) {
      return NextResponse.json({ message: "A valid phone number is required." }, { status: 400 });
    }

    if (!validatePassword(password)) {
      return NextResponse.json({ message: "Password must be at least 6 characters." }, { status: 400 });
    }

    const existingEmail = await findUserByEmail(email);
    if (existingEmail) {
      return NextResponse.json({ message: "An account with this email already exists." }, { status: 409 });
    }

    const existingPhone = await findUserByPhone(phone);
    if (existingPhone) {
      return NextResponse.json({ message: "An account with this phone number already exists." }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    const user = await createUser({
      email,
      phone,
      fullName,
      passwordHash,
      partnerUserId,
    });

    // Try to start visual enrollment
    let enrollUrl: string | null = null;
    try {
      const state = crypto.randomUUID();
      const enroll = await initVisualEnroll({ partnerUserId: user.partnerUserId, state });
      enrollUrl = enroll.enrollUrl;
    } catch (enrollErr) {
      console.warn("[demo-wallet] Visual enrollment auto-start failed:", enrollErr instanceof Error ? enrollErr.message : enrollErr);
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        fullName: user.fullName,
        partnerUserId: user.partnerUserId,
      },
      enrollUrl,
    });
  } catch (error) {
    if (error instanceof VisualApiError) {
      return NextResponse.json(
        { message: `Visual API error: ${error.message}` },
        { status: error.statusCode },
      );
    }
    console.error("[demo-wallet] Register error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Registration failed." },
      { status: 500 },
    );
  }
}
