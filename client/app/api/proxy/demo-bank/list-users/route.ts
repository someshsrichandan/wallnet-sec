import { NextRequest, NextResponse } from "next/server";

const backendBase =
  process.env.BACKEND_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:3000/api";
const demoBankBase =
  process.env.DEMO_BANK_URL ||
  process.env.NEXT_PUBLIC_DEMO_BANK_URL ||
  "http://localhost:3002";
const proxyKey = String(
  process.env.DEMO_BANK_PROXY_SHARED_KEY || "dev-demo-bank-proxy-key-change-me",
).trim();

const unauthorized = () =>
  NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

const parseJson = async (response: Response) => {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return text ? { message: text } : {};
};

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) {
    return unauthorized();
  }

  try {
    const meRes = await fetch(`${backendBase}/users/me`, {
      method: "GET",
      headers: { Authorization: auth },
      cache: "no-store",
    });
    const me = (await parseJson(meRes)) as { _id?: string; id?: string; message?: string };

    if (!meRes.ok) {
      return NextResponse.json(
        { ok: false, message: me.message || "Failed to validate admin user." },
        { status: meRes.status },
      );
    }

    const ownerUserId = String(me._id || me.id || "").trim();
    if (!ownerUserId) {
      return unauthorized();
    }

    const keysRes = await fetch(`${backendBase}/partners/keys`, {
      method: "GET",
      headers: { Authorization: auth },
      cache: "no-store",
    });
    const keysData = (await parseJson(keysRes)) as {
      keys?: Array<{ partnerId?: string }>;
      message?: string;
    };

    if (!keysRes.ok) {
      return NextResponse.json(
        { ok: false, message: keysData.message || "Failed to load admin partner keys." },
        { status: keysRes.status },
      );
    }

    const partnerIds = Array.from(
      new Set(
        (keysData.keys || [])
          .map((key) => String(key.partnerId || "").trim().toLowerCase())
          .filter(Boolean),
      ),
    );

    const res = await fetch(`${demoBankBase}/api/demo-bank/agent/list-users`, {
      method: "GET",
      headers: {
        "x-admin-owner-id": ownerUserId,
        "x-admin-partner-ids": partnerIds.join(","),
        "x-admin-proxy-key": proxyKey,
      },
      cache: "no-store",
    });

    const data = await parseJson(res);
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Demo-bank unavailable" },
      { status: 503 },
    );
  }
}
