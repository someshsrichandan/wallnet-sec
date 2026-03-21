import { demoShopConfig } from "@/lib/config";
import type { ConsumeResultResponse, InitAuthResponse, InitEnrollResponse } from "@/lib/types";

type RequestOptions = {
    method?: "GET" | "POST";
    body?: unknown;
    headers?: Record<string, string>;
};

export class VisualApiError extends Error {
    statusCode: number;
    constructor(statusCode: number, message: string) {
        super(message);
        this.statusCode = statusCode;
    }
}

const requestJson = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
    const url = `${demoShopConfig.visualApiBase}${path}`;
    const headers = new Headers(options.headers || {});
    if (options.body !== undefined && !headers.has("content-type")) {
        headers.set("content-type", "application/json");
    }
    const response = await fetch(url, {
        method: options.method || "GET",
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        cache: "no-store",
    });

    let payload: unknown = {};
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
        payload = await response.json();
    } else {
        const text = await response.text();
        payload = text ? { message: text } : {};
    }

    if (!response.ok) {
        const message =
            (payload as { message?: string }).message ||
            `Visual API request failed with status ${response.status}`;
        throw new VisualApiError(response.status, message);
    }
    return payload as T;
};

export const initVisualAuth = async (input: {
    partnerUserId: string;
    state: string;
    callbackUrl?: string;
}) => {
    const resolvedCallbackUrl =
        input.callbackUrl ?? `${demoShopConfig.publicOrigin}/api/demo-shop/login/finalize`;

    const response = await requestJson<InitAuthResponse>("/visual-password/v1/init-auth", {
        method: "POST",
        headers: { "x-api-key": demoShopConfig.partnerApiKey },
        body: {
            partnerId: demoShopConfig.partnerId,
            userId: input.partnerUserId,
            callbackUrl: resolvedCallbackUrl,
            state: input.state,
        },
    });

    const verifyUrl = new URL(response.verifyPath, demoShopConfig.visualVerifyOrigin).toString();
    return { ...response, verifyUrl };
};

export const initVisualEnroll = async (input: { partnerUserId: string; state: string }) => {
    const callbackUrl = `${demoShopConfig.publicOrigin}/api/demo-shop/enroll/callback`;

    const response = await requestJson<InitEnrollResponse>(
        "/visual-password/v1/partner/init-enroll",
        {
            method: "POST",
            headers: { "x-api-key": demoShopConfig.partnerApiKey },
            body: {
                partnerId: demoShopConfig.partnerId,
                userId: input.partnerUserId,
                callbackUrl,
                state: input.state,
            },
        },
    );

    const enrollUrl = new URL(response.enrollPath, demoShopConfig.visualVerifyOrigin).toString();
    return { ...response, enrollUrl };
};

export const consumeVisualResult = async (signature: string) =>
    requestJson<ConsumeResultResponse>("/visual-password/v1/partner/consume-result", {
        method: "POST",
        headers: { "x-api-key": demoShopConfig.partnerApiKey },
        body: { signature },
    });
