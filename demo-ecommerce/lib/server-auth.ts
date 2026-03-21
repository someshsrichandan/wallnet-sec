import { cookies } from "next/headers";

import { parseShopSessionToken } from "@/lib/session";

const SESSION_COOKIE = "demo_shop_session";

export const readServerSession = async () => {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    return parseShopSessionToken(token);
};
