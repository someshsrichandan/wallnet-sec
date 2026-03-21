import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Adds CORS headers to ALL /api/demo-bank/* routes so the admin client
 * at localhost:3001 (and any other origin) can call them from the browser.
 */
export function middleware(request: NextRequest) {
  const origin = request.headers.get("origin") ?? "*";

  // Handle preflight
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // Clone and add CORS headers to actual response
  const response = NextResponse.next();
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return response;
}

export const config = {
  matcher: "/api/:path*",
};
