import { NextRequest, NextResponse } from "next/server";

import { readBankSessionFromRequest } from "@/lib/session";

export async function GET(request: NextRequest) {
    const session = readBankSessionFromRequest(request);
    if (!session) return NextResponse.json({ authenticated: false }, { status: 401 });
    return NextResponse.json({ authenticated: true, user: session });
}
