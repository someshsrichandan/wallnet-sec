import { NextRequest, NextResponse } from "next/server";

import { readWalletSessionFromRequest } from "@/lib/session";
import { findUserById, updateUserVisualEnabled } from "@/lib/demo-wallet-store";
import { initVisualEnroll, VisualApiError } from "@/lib/visual-api";

export async function POST(request: NextRequest) {
  try {
    const session = readWalletSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: "Not authenticated." }, { status: 401 });
    }

    const user = await findUserById(session.userId);
    if (!user) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    const state = crypto.randomUUID();
    const enroll = await initVisualEnroll({ partnerUserId: user.partnerUserId, state });

    return NextResponse.json({
      ok: true,
      enrollUrl: enroll.enrollUrl,
    });
  } catch (error) {
    if (error instanceof VisualApiError) {
      return NextResponse.json(
        { message: `Visual API error: ${error.message}` },
        { status: error.statusCode },
      );
    }
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to start enrollment." },
      { status: 500 },
    );
  }
}
