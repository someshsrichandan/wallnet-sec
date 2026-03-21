import { NextRequest, NextResponse } from "next/server";
import { getProductApiRuntimeInfo } from "@/lib/product-partner-proxy";

export const GET = async (request: NextRequest) => {
  const runtime = getProductApiRuntimeInfo(request);

  return NextResponse.json({
    product: "Visual Password Security Layer",
    version: "v1",
    mode: runtime.mode,
    hasApiKey: runtime.hasApiKey,
    hasSandboxApiKey: runtime.hasSandboxApiKey,
    docsPath: runtime.docsPath,
    developerPortalPath: runtime.developerPortalPath,
    endpoints: {
      initAuth: "/api/product/v1/init-auth",
      challenge: "/api/product/v1/challenge/:sessionToken",
      verify: "/api/product/v1/verify",
      consumeResult: "/api/product/v1/partner/consume-result",
      session: "/api/product/v1/session/:sessionToken",
    },
  });
};
