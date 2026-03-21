import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "demo_shop_session";

export function middleware(request: NextRequest) {
    const hasSession = request.cookies.has(SESSION_COOKIE);

    // Redirect logged-in users away from login/register to dashboard
    if (hasSession) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/login", "/register"],
};
