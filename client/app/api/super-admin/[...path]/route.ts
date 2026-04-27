import { NextRequest } from "next/server";
import { proxyApi } from "@/lib/api-proxy";

export const GET = async (request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) => {
  const p = await params;
  return proxyApi(request, `/super-admin/${p.path.join("/")}`);
};

export const POST = async (request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) => {
  const p = await params;
  return proxyApi(request, `/super-admin/${p.path.join("/")}`);
};

export const PUT = async (request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) => {
  const p = await params;
  return proxyApi(request, `/super-admin/${p.path.join("/")}`);
};

export const DELETE = async (request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) => {
  const p = await params;
  return proxyApi(request, `/super-admin/${p.path.join("/")}`);
};
