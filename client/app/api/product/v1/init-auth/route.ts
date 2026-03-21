import { NextRequest } from "next/server";
import { proxyProductPartnerApi } from "@/lib/product-partner-proxy";

export const POST = async (request: NextRequest) =>
  proxyProductPartnerApi(request, "/visual-password/v1/init-auth");
