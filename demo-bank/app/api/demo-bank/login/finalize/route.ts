import { NextRequest, NextResponse } from "next/server";

import { finalizeVisualLogin } from "@/lib/finalize-visual-login";

const fromSearchParams = (request: NextRequest) => ({
  result: String(request.nextUrl.searchParams.get("result") || ""),
  signature: String(request.nextUrl.searchParams.get("signature") || ""),
  state: String(request.nextUrl.searchParams.get("state") || ""),
  sessionToken: String(request.nextUrl.searchParams.get("sessionToken") || ""),
  partnerId: String(request.nextUrl.searchParams.get("partnerId") || ""),
  userId: String(request.nextUrl.searchParams.get("userId") || ""),
});

const fromBody = async (request: NextRequest) => {
  const body = (await request.json()) as Record<string, unknown>;
  return {
    result: String(body.result || ""),
    signature: String(body.signature || ""),
    state: String(body.state || ""),
    sessionToken: String(body.sessionToken || ""),
    partnerId: String(body.partnerId || ""),
    userId: String(body.userId || ""),
  };
};

export async function GET(request: NextRequest) {
  return finalizeVisualLogin(request, fromSearchParams(request), { redirect: true });
}

export async function POST(request: NextRequest) {
  try {
    const payload = await fromBody(request);
    return finalizeVisualLogin(request, payload, { redirect: false });
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request payload." }, { status: 400 });
  }
}
