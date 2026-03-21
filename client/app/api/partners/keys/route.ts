import { NextRequest } from "next/server";
import { proxyApi } from "@/lib/api-proxy";

export const GET = async (request: NextRequest) =>
  proxyApi(request, "/partners/keys");

export const POST = async (request: NextRequest) =>
  proxyApi(request, "/partners/keys");
