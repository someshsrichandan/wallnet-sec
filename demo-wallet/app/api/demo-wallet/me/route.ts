import { NextRequest, NextResponse } from "next/server";

import { readWalletSessionFromRequest } from "@/lib/session";
import { findUserById } from "@/lib/demo-wallet-store";

export async function GET(request: NextRequest) {
  const session = readWalletSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ message: "Not authenticated." }, { status: 401 });
  }

  const user = await findUserById(session.userId);
  if (!user) {
    return NextResponse.json({ message: "User not found." }, { status: 404 });
  }

  return NextResponse.json({
    userId: user.id,
    email: user.email,
    phone: user.phone,
    fullName: user.fullName,
    partnerUserId: user.partnerUserId,
    visualEnabled: user.visualEnabled,
    walletBalance: user.walletBalance,
  });
}
