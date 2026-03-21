import { NextResponse } from "next/server";

import { clearBankSession, clearPendingVisual } from "@/lib/session";

export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/login?loggedOut=1", request.url));
  clearBankSession(response);
  clearPendingVisual(response);
  return response;
}
