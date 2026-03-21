import { NextResponse } from "next/server";

import { clearShopSession, clearPendingVisual } from "@/lib/session";

export async function GET(request: Request) {
    const response = NextResponse.redirect(new URL("/login?loggedOut=1", request.url));
    clearShopSession(response);
    clearPendingVisual(response);
    return response;
}
