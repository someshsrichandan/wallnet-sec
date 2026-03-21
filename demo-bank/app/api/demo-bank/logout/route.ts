import { NextRequest, NextResponse } from "next/server";

import { clearBankSession, clearPendingVisual } from "@/lib/session";

export async function POST(request: NextRequest) {
  const accepts = request.headers.get("accept") || "";
  if (accepts.includes("text/html")) {
    const response = NextResponse.redirect(new URL("/login?loggedOut=1", request.url));
    clearBankSession(response);
    clearPendingVisual(response);
    return response;
  }

  const response = NextResponse.json({ ok: true });
  clearBankSession(response);
  clearPendingVisual(response);
  return response;
}
