export class HttpError extends Error {
  status: number;
  requestId?: string;

  constructor(message: string, status: number, requestId?: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.requestId = requestId;
  }
}

type RequestOptions = RequestInit & {
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 12_000;

const parseResponse = async (response: Response) => {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return text ? { message: text } : {};
};

export const requestJson = async <T>(
  url: string,
  options: RequestOptions = {}
): Promise<T> => {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, headers, ...init } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(headers ?? {}),
      },
      cache: "no-store",
      signal: controller.signal,
    });

    const body = await parseResponse(response);

    if (!response.ok) {
      const message =
        (typeof body === "object" && body && "message" in body
          ? String((body as { message?: string }).message)
          : null) ?? "Request failed";
      const requestId =
        typeof body === "object" && body && "requestId" in body
          ? String((body as { requestId?: string }).requestId)
          : undefined;

      throw new HttpError(message, response.status, requestId);
    }

    return body as T;
  } finally {
    clearTimeout(timer);
  }
};
