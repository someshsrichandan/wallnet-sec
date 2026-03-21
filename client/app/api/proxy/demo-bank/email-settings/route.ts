import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/proxy/demo-bank/email-settings/test
 *
 * Writes runtime email env vars and fires a test email via the demo-bank API.
 * For demo purposes only — in production use a proper secrets manager.
 */
export async function POST(request: NextRequest) {
  const demoBankBase = process.env.DEMO_BANK_URL || process.env.NEXT_PUBLIC_DEMO_BANK_URL || "http://localhost:3002";

  try {
    const body = await request.json() as Record<string, string>;

    const res = await fetch(`${demoBankBase}/api/demo-bank/admin/email-settings`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ message: "Demo-bank unavailable" }, { status: 503 });
  }
}

export async function GET() {
  const demoBankBase = process.env.DEMO_BANK_URL || process.env.NEXT_PUBLIC_DEMO_BANK_URL || "http://localhost:3002";

  try {
    const res = await fetch(`${demoBankBase}/api/demo-bank/admin/email-settings`, {
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ message: "Demo-bank unavailable" }, { status: 503 });
  }
}
