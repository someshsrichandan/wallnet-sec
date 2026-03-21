import { NextRequest, NextResponse } from "next/server";

import { findUserByPartnerUserId, updateUserVisualEnabled } from "@/lib/demo-shop-store";
import { demoShopConfig } from "@/lib/config";
import { readServerSession } from "@/lib/server-auth";

export async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl;
    const result = searchParams.get("result");
    const enrollToken = searchParams.get("enrollToken");

    if (result !== "ENROLLED" || !enrollToken) {
        return NextResponse.redirect(
            new URL("/login?enrollError=Enrollment+did+not+complete", demoShopConfig.publicOrigin),
        );
    }

    try {
        const backendUrl = `${demoShopConfig.visualApiBase}/visual-password/v1/enroll-session/${encodeURIComponent(enrollToken)}`;
        const sessionRes = await fetch(backendUrl, { cache: "no-store" });
        if (!sessionRes.ok) throw new Error("Unable to verify enrollment session.");

        const sessionData = (await sessionRes.json()) as {
            partnerId: string;
            userId: string;
            status: string;
        };
        if (sessionData.status !== "COMPLETED")
            throw new Error("Enrollment session is not marked completed.");

        const user = await findUserByPartnerUserId(sessionData.userId);
        if (user) await updateUserVisualEnabled(user.id, true);

        const bankSession = await readServerSession();
        if (bankSession) {
            return NextResponse.redirect(
                new URL("/dashboard?enrolled=1", demoShopConfig.publicOrigin),
            );
        }
        return NextResponse.redirect(new URL("/login?enrolled=1", demoShopConfig.publicOrigin));
    } catch (error) {
        const msg = error instanceof Error ? error.message : "Enrollment callback failed.";
        return NextResponse.redirect(
            new URL(`/login?enrollError=${encodeURIComponent(msg)}`, demoShopConfig.publicOrigin),
        );
    }
}
