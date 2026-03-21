import { NextRequest } from "next/server";
import { proxyApi } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ sessionToken: string }>;
};

export const GET = async (request: NextRequest, context: RouteContext) => {
  const { sessionToken } = await context.params;
  return proxyApi(request, `/visual-password/v1/challenge/${sessionToken}`);
};
