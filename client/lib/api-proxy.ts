import { NextRequest, NextResponse } from "next/server";

const BACKEND_API_BASE =
  process.env.BACKEND_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:3000/api";

const DEFAULT_TIMEOUT_MS = 12_000;

const readBody = async (request: NextRequest) => {
  if (request.method === "GET" || request.method === "HEAD") {
    return undefined;
  }

  const textBody = await request.text();
  return textBody || undefined;
};

const parseBody = async (response: Response) => {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return text ? { message: text } : {};
};

export const proxyApi = async (request: NextRequest, apiPath: string) => {
  const targetUrl = `${BACKEND_API_BASE}${apiPath}${request.nextUrl.search}`;
  const requestBody = await readBody(request);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  const headers = new Headers();

  if (requestBody) {
    headers.set("Content-Type", request.headers.get("content-type") ?? "application/json");
  }

  const authorization = request.headers.get("authorization");
  if (authorization) {
    headers.set("Authorization", authorization);
  }

  const requestId = request.headers.get("x-request-id");
  if (requestId) {
    headers.set("x-request-id", requestId);
  }

  try {
    const upstreamResponse = await fetch(targetUrl, {
      method: request.method,
      body: requestBody,
      signal: controller.signal,
      headers,
      cache: "no-store",
    });

    const responseBody = await parseBody(upstreamResponse);
    return NextResponse.json(responseBody, {
      status: upstreamResponse.status,
    });
  } catch {
    return NextResponse.json(
      { message: "Upstream API is unavailable" },
      { status: 503 }
    );
  } finally {
    clearTimeout(timer);
  }
};
