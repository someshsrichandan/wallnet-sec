import { NextRequest, NextResponse } from "next/server";

import { clearShopSession, clearPendingVisual } from "@/lib/session";

export async function POST(request: NextRequest) {
    const accepts = request.headers.get("accept") || "";
    if (accepts.includes("text/html")) {
        const response = NextResponse.redirect(new URL("/login?loggedOut=1", request.url));
        clearShopSession(response);
        clearPendingVisual(response);
        return response;
    }
    const response = NextResponse.json({ ok: true });
    clearShopSession(response);
    clearPendingVisual(response);
    return response;
}
