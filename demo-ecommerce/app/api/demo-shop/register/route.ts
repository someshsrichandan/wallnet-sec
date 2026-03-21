import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { createUser, findUserByEmail } from "@/lib/demo-shop-store";
import { hashPassword } from "@/lib/password";
import { parseRegisterPayload } from "@/lib/validators";
import { initVisualEnroll, VisualApiError } from "@/lib/visual-api";

const toPartnerUserId = () => `customer-shop-${randomUUID().slice(0, 12)}`.toLowerCase();

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const parsed = parseRegisterPayload(body);
        const existing = await findUserByEmail(parsed.email);
        if (existing) {
            return NextResponse.json(
                { message: "A shopper account with this email already exists." },
                { status: 409 },
            );
        }

        const partnerUserId = parsed.partnerUserId || toPartnerUserId();
        const passwordHash = await hashPassword(parsed.password);
        const user = await createUser({
            fullName: parsed.fullName,
            email: parsed.email,
            passwordHash,
            partnerUserId,
        });

        let enrollUrl: string | null = null;
        try {
            const enroll = await initVisualEnroll({
                partnerUserId: user.partnerUserId,
                state: randomUUID(),
            });
            enrollUrl = enroll.enrollUrl;
        } catch (enrollErr) {
            console.error(
                "[register] initVisualEnroll failed:",
                enrollErr instanceof Error ? enrollErr.message : enrollErr,
            );
        }

        return NextResponse.json(
            {
                ok: true,
                user: {
                    id: user.id,
                    email: user.email,
                    fullName: user.fullName,
                    partnerUserId: user.partnerUserId,
                },
                enrollUrl,
            },
            { status: 201 },
        );
    } catch (error) {
        if (error instanceof VisualApiError) {
            return NextResponse.json({ message: error.message }, { status: error.statusCode });
        }
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Unable to register shopper." },
            { status: 400 },
        );
    }
}
