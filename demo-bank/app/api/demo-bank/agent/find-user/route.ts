import { NextResponse } from "next/server";
import { findUserByPartnerUserId, findUserByEmail, findUserByAccountNumber } from "@/lib/demo-bank-store";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

/**
 * POST /api/demo-bank/agent/find-user
 * Agent searches for a bank user by:
 *   - 6-digit accountNumber (DTMF verification)
 *   - partnerUserId
 *   - email
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { query: string };
    const query = String(body.query || "").trim();

    if (!query || query.length < 3) {
      return NextResponse.json({ message: "Enter at least 3 characters to search." }, { status: 400 });
    }

    // 6-digit account number first, then partnerUserId, then email
    let user =
      /^\d{6}$/.test(query)
        ? await findUserByAccountNumber(query)
        : null;

    if (!user) user = await findUserByPartnerUserId(query);
    if (!user) user = await findUserByEmail(query);

    if (!user) {
      return NextResponse.json({ message: "No user found with that account number, ID, or email." }, { status: 404 });
    }

    return NextResponse.json({
      found: true,
      user: {
        id: user.id,
        partnerUserId: user.partnerUserId,
        fullName: user.fullName,
        emailMasked: maskEmail(user.email),
        emailFull: user.email,
        phone: user.phone || "",
        phoneMasked: maskPhone(user.phone || ""),
        accountNumber: user.accountNumber || "",
        visualEnabled: user.visualEnabled,
        createdAt: user.createdAt,
      },
    });
  } catch {
    return NextResponse.json({ message: "Search failed. Please try again." }, { status: 500 });
  }
}

const maskEmail = (email: string): string => {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  return local.slice(0, 2) + "***@" + domain;
};

const maskPhone = (phone: string): string => {
  if (!phone || phone.length < 4) return phone;
  return "XXXXXX" + phone.slice(-4);
};
