import { NextRequest } from "next/server";
import { proxyApi } from "@/lib/api-proxy";

export const POST = async (request: NextRequest) =>
  proxyApi(request, "/visual-password/enroll");
