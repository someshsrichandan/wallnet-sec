import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { findUserById } from "@/lib/store";
import { readServerSession } from "@/lib/session";
import { initVisualEnroll, VisualApiError } from "@/lib/visual-api";

export async function POST() {
  try {
    const session = await readServerSession();
    if (!session) {
      return NextResponse.json(
        { message: "Not authenticated." },
        { status: 401 },
      );
    }

    const user = await findUserById(session.userId);
    if (!user) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    const state = randomUUID();
    const init = await initVisualEnroll({
      partnerUserId: user.partnerUserId,
      state,
    });

    return NextResponse.json({
      ok: true,
      enrollUrl: init.enrollUrl,
      enrollToken: init.enrollToken,
      expiresAt: init.expiresAt,
      state,
    });
  } catch (error) {
    if (error instanceof VisualApiError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.statusCode },
      );
    }
    const message =
      error instanceof Error ? error.message : "Unable to start enrollment.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
