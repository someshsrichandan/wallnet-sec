import { NextRequest } from "next/server";
import { proxyProductPartnerApi } from "@/lib/product-partner-proxy";

type RouteContext = {
  params: Promise<{ sessionToken: string }>;
};

export const GET = async (request: NextRequest, context: RouteContext) => {
  const { sessionToken } = await context.params;
  return proxyProductPartnerApi(request, `/visual-password/v1/session/${sessionToken}`);
};
