import { NextResponse } from "next/server";
import {
  getAdminOwnerFromProxyHeaders,
  getAdminPartnerIdsFromProxyHeaders,
  unauthorizedAdminProxy,
} from "@/lib/admin-proxy-auth";
import {
  listLegacyUsersByPartnerIds,
  listUsersByOwner,
  listUsersWithoutOwner,
} from "@/lib/demo-bank-store";

/**
 * GET /api/demo-bank/agent/list-users
 * Returns all bank users (safe fields only) for admin user management table.
 * CORS headers are handled by middleware.ts
 */
export async function GET(request: Request) {
  try {
    const ownerUserId = getAdminOwnerFromProxyHeaders(request);
    const partnerIds = getAdminPartnerIdsFromProxyHeaders(request);
    if (!ownerUserId) {
      return unauthorizedAdminProxy();
    }

    const users = await listUsersByOwner(ownerUserId);
    const legacyUsers =
      partnerIds.length > 0
        ? await listLegacyUsersByPartnerIds(partnerIds)
        : await listUsersWithoutOwner();
    const merged = [...users, ...legacyUsers].filter(
      (user, index, all) => all.findIndex((candidate) => candidate.id === user.id) === index,
    );

    const safe = merged
      .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1))
      .map((u) => ({
        id: u.id,
        partnerUserId: u.partnerUserId,
        fullName: u.fullName,
        emailMasked: maskEmail(u.email),
        emailFull: u.email,
        phone: u.phone || "",
        phoneMasked: maskPhone(u.phone || ""),
        accountNumber: u.accountNumber || "",
        visualEnabled: u.visualEnabled,
        createdAt: u.createdAt,
      }));

    return NextResponse.json({ ok: true, total: safe.length, users: safe });
  } catch (err) {
    console.error("[list-users]", err);
    return NextResponse.json({ ok: false, message: "Failed to list users." }, { status: 500 });
  }
}

// Support OPTIONS pre-flight (belt-and-suspenders, middleware handles it too)
export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

const maskEmail = (email: string) => {
  const [l, d] = email.split("@");
  return l ? l.slice(0, 2) + "***@" + d : email;
};

const maskPhone = (phone: string) => {
  if (!phone || phone.length < 4) return phone || "—";
  return "XXXXXX" + phone.slice(-4);
};
