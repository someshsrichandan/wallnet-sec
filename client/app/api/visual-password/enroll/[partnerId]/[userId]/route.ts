import { NextRequest } from "next/server";
import { proxyApi } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{
    partnerId: string;
    userId: string;
  }>;
};

export const GET = async (request: NextRequest, context: RouteContext) => {
  const { partnerId, userId } = await context.params;
  return proxyApi(request, `/visual-password/enroll/${partnerId}/${userId}`);
};
