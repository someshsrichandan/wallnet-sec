import { NextRequest } from "next/server";
import { proxyApi } from "@/lib/api-proxy";

export const GET = async (request: NextRequest) =>
  proxyApi(request, "/settings/email");

export const PUT = async (request: NextRequest) =>
  proxyApi(request, "/settings/email");
