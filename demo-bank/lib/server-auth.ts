import { cookies } from "next/headers";

import { parseBankSessionToken } from "@/lib/session";

const SESSION_COOKIE = "demo_bank_session";

export const readServerSession = async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return parseBankSessionToken(token);
};
