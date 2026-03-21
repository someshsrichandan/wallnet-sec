import { NextRequest, NextResponse } from "next/server";

const BACKEND_API_BASE =
  process.env.BACKEND_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:3000/api";

export const POST = async (request: NextRequest) => {
  const body = await request.text();
  const partnerApiKey = process.env.PARTNER_SERVER_API_KEY;
  if (!partnerApiKey) {
    return NextResponse.json(
      { message: "Server misconfigured: PARTNER_SERVER_API_KEY is required" },
      { status: 500 }
    );
  }

  try {
    const upstream = await fetch(`${BACKEND_API_BASE}/visual-password/v1/partner/consume-result`, {
      method: "POST",
      headers: {
        "Content-Type": request.headers.get("content-type") ?? "application/json",
        "x-api-key": partnerApiKey,
      },
      body,
      cache: "no-store",
    });

    const payload = await upstream.json();
    return NextResponse.json(payload, { status: upstream.status });
  } catch {
    return NextResponse.json({ message: "Upstream API is unavailable" }, { status: 503 });
  }
};
