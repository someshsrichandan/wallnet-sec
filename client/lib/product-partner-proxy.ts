import { NextRequest, NextResponse } from "next/server";

type ProductMode = "test" | "live";

const DEFAULT_LIVE_BASE =
  process.env.BACKEND_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:3000/api";

const DEFAULT_TEST_BASE = process.env.BACKEND_SANDBOX_API_BASE_URL ?? DEFAULT_LIVE_BASE;

const resolveMode = (request: NextRequest): ProductMode => {
  const queryMode = request.nextUrl.searchParams.get("mode");
  const headerMode =
    request.headers.get("x-vp-mode") ??
    request.headers.get("x-product-mode") ??
    request.headers.get("x-partner-mode");

  const raw = String(queryMode || headerMode || "live").trim().toLowerCase();
  if (raw === "test" || raw === "sandbox" || raw === "demo") {
    return "test";
  }

  return "live";
};

const resolveConfig = (mode: ProductMode) => {
  if (mode === "test") {
    return {
      baseUrl: DEFAULT_TEST_BASE,
      apiKey:
        process.env.PARTNER_SERVER_SANDBOX_API_KEY || process.env.PARTNER_SERVER_API_KEY || "",
    };
  }

  return {
    baseUrl: DEFAULT_LIVE_BASE,
    apiKey: process.env.PARTNER_SERVER_API_KEY || "",
  };
};

const readBody = async (request: NextRequest) => {
  if (request.method === "GET" || request.method === "HEAD") {
    return undefined;
  }

  const body = await request.text();
  return body || undefined;
};

const parseBody = async (response: Response) => {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return text ? { message: text } : {};
};

export const proxyProductPartnerApi = async (request: NextRequest, upstreamPath: string) => {
  const mode = resolveMode(request);
  const config = resolveConfig(mode);
  const callerApiKey =
    request.headers.get("x-api-key") ?? request.headers.get("x-partner-api-key") ?? "";
  const allowServerFallback = process.env.NODE_ENV !== "production";
  const effectiveApiKey = callerApiKey || (allowServerFallback ? config.apiKey : "");

  if (!effectiveApiKey) {
    return NextResponse.json(
      {
        message:
          "Missing API key. Provide x-api-key. In non-production, server fallback key can be used for local testing.",
      },
      {
        status: 401,
        headers: { "x-vp-mode": mode },
      }
    );
  }

  const requestBody = await readBody(request);
  const headers = new Headers({
    "x-api-key": effectiveApiKey,
  });

  if (requestBody) {
    headers.set("Content-Type", request.headers.get("content-type") ?? "application/json");
  }

  const requestId = request.headers.get("x-request-id");
  if (requestId) {
    headers.set("x-request-id", requestId);
  }

  try {
    const forwardedSearch = new URLSearchParams(request.nextUrl.searchParams);
    forwardedSearch.delete("mode");
    const forwardedQuery = forwardedSearch.toString();
    const targetUrl = `${config.baseUrl}${upstreamPath}${forwardedQuery ? `?${forwardedQuery}` : ""}`;

    const upstream = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: requestBody,
      cache: "no-store",
    });

    const payload = await parseBody(upstream);
    return NextResponse.json(payload, {
      status: upstream.status,
      headers: {
        "x-vp-mode": mode,
      },
    });
  } catch {
    return NextResponse.json(
      { message: "Upstream product API is unavailable" },
      { status: 503, headers: { "x-vp-mode": mode } }
    );
  }
};

export const getProductApiRuntimeInfo = (request: NextRequest) => {
  const mode = resolveMode(request);
  const config = resolveConfig(mode);
  return {
    mode,
    baseUrl: config.baseUrl,
    hasApiKey: Boolean(config.apiKey),
    hasSandboxApiKey: Boolean(process.env.PARTNER_SERVER_SANDBOX_API_KEY),
    docsPath: "/docs",
    developerPortalPath: "/developers",
  };
};
