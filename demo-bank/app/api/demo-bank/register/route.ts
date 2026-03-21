import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { createUser, findUserByEmail } from "@/lib/demo-bank-store";
import { hashPassword } from "@/lib/password";
import { parseRegisterPayload } from "@/lib/validators";
import { initVisualEnroll, VisualApiError } from "@/lib/visual-api";

const toPartnerUserId = () => `customer-bank-${randomUUID().slice(0, 12)}`.toLowerCase();

/** Generate a unique 6-digit account number */
const generateAccountNumber = () =>
  String(Math.floor(100000 + Math.random() * 900000));

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = parseRegisterPayload(body);
    const existing = await findUserByEmail(parsed.email);
    if (existing) {
      return NextResponse.json({ message: "A bank user with this email already exists." }, { status: 409 });
    }

    const partnerUserId = parsed.partnerUserId || toPartnerUserId();
    const passwordHash = await hashPassword(parsed.password);
    const accountNumber = generateAccountNumber();
    const phone = String((body as Record<string, unknown>).phone || "").trim();

    const user = await createUser({
      fullName: parsed.fullName,
      email: parsed.email,
      passwordHash,
      partnerUserId,
      phone,
      accountNumber,
    });

    // Kick off visual enrollment redirect immediately after registration
    let enrollUrl: string | null = null;
    try {
      const enroll = await initVisualEnroll({
        partnerUserId: user.partnerUserId,
        state: randomUUID(),
      });
      enrollUrl = enroll.enrollUrl;
    } catch (enrollErr) {
      // Non-fatal — user can enroll later from dashboard
      console.error("[register] initVisualEnroll failed:", enrollErr instanceof Error ? enrollErr.message : enrollErr);
    }

    return NextResponse.json(
      {
        ok: true,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          partnerUserId: user.partnerUserId,
          accountNumber: user.accountNumber,
        },
        enrollUrl,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof VisualApiError) {
      return NextResponse.json({ message: error.message }, { status: error.statusCode });
    }
    const message = error instanceof Error ? error.message : "Unable to register bank user.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
