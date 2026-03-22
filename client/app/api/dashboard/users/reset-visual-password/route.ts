import { NextRequest } from "next/server";
import { proxyApi } from "@/lib/api-proxy";

export const POST = async (request: NextRequest) =>
  proxyApi(request, "/dashboard/users/reset-visual-password");
