import { NextRequest } from "next/server";
import { proxyApi } from "@/lib/api-proxy";

export const PUT = async (
  request: NextRequest,
  { params }: { params: Promise<{ keyId: string }> },
) => {
  const { keyId } = await params;
  return proxyApi(request, `/partners/keys/${keyId}`);
};

export const DELETE = async (
  request: NextRequest,
  { params }: { params: Promise<{ keyId: string }> },
) => {
  const { keyId } = await params;
  return proxyApi(request, `/partners/keys/${keyId}`);
};
