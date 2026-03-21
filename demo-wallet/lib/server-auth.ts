import { cookies } from "next/headers";

import { parseWalletSessionToken } from "@/lib/session";

const SESSION_COOKIE = "demo_wallet_session";

export const readServerSession = async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return parseWalletSessionToken(token);
};
