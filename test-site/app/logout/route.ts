import { NextResponse } from "next/server";

import { clearSession, clearPending } from "@/lib/session";

export async function GET(request: Request) {
  const response = NextResponse.redirect(
    new URL("/login?loggedOut=1", request.url),
  );
  clearSession(response);
  clearPending(response);
  return response;
}
