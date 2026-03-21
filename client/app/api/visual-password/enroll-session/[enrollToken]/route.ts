import { NextRequest } from "next/server";
import { proxyApi } from "@/lib/api-proxy";

export const GET = async (request: NextRequest, { params }: { params: Promise<{ enrollToken: string }> }) => {
  const { enrollToken } = await params;
  return proxyApi(request, `/visual-password/v1/enroll-session/${encodeURIComponent(enrollToken)}`);
};

