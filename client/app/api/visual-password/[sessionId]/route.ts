import { NextRequest, NextResponse } from "next/server";

const BACKEND_API_BASE =
  process.env.BACKEND_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:3000/api";

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

export const GET = async (_request: NextRequest, context: RouteContext) => {
  const partnerApiKey = process.env.PARTNER_SERVER_API_KEY;
  if (!partnerApiKey) {
    return NextResponse.json(
      { message: "Server misconfigured: PARTNER_SERVER_API_KEY is required" },
      { status: 500 }
    );
  }
  const { sessionId } = await context.params;

  try {
    const upstream = await fetch(`${BACKEND_API_BASE}/visual-password/v1/session/${sessionId}`, {
      method: "GET",
      headers: {
        "x-api-key": partnerApiKey,
      },
      cache: "no-store",
    });

    const payload = await upstream.json();
    return NextResponse.json(payload, { status: upstream.status });
  } catch {
    return NextResponse.json({ message: "Upstream API is unavailable" }, { status: 503 });
  }
};
