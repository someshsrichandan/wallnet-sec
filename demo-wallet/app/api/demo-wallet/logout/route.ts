import { NextResponse } from "next/server";

import { clearWalletSession } from "@/lib/session";

export async function GET() {
  const response = NextResponse.redirect(new URL("/login?loggedOut=1", process.env.DEMO_WALLET_PUBLIC_ORIGIN || "http://localhost:3004"));
  clearWalletSession(response);
  return response;
}

export async function POST() {
  const response = NextResponse.json({ ok: true, message: "Logged out." });
  clearWalletSession(response);
  return response;
}
