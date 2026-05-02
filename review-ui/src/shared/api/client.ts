import { env } from "../lib/env";

/**
 * Thin fetch wrapper.
 *
 * - Resolves URLs against `env.apiBaseUrl` so callers pass relative paths.
 * - Surfaces non-2xx responses as `ApiError` with the parsed body (when JSON).
 * - Handles JSON encoding of bodies and JSON parsing of responses.
 *
 * Stays deliberately small — TanStack Query handles caching/retries on
 * top, and providers handle auth headers when we add them.
 */

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly url: string,
    message: string,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions {
  method?: Method;
  json?: unknown;
  body?: BodyInit;
  headers?: HeadersInit;
  signal?: AbortSignal;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", json, body, headers, signal } = options;

  const finalHeaders = new Headers(headers);
  let finalBody: BodyInit | undefined = body;

  if (json !== undefined) {
    finalHeaders.set("Content-Type", "application/json");
    finalBody = JSON.stringify(json);
  }

  const url = path.startsWith("http")
    ? path
    : `${env.apiBaseUrl}${path}`;

  const response = await fetch(url, {
    method,
    headers: finalHeaders,
    body: finalBody,
    signal,
  });

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload: unknown = isJson
    ? await response.json().catch(() => undefined)
    : await response.text().catch(() => undefined);

  if (!response.ok) {
    const message =
      isJson && payload && typeof payload === "object" && "detail" in payload
        ? String((payload as { detail: unknown }).detail)
        : `HTTP ${response.status}`;
    throw new ApiError(response.status, url, message, payload);
  }

  return payload as T;
}

export const apiClient = {
  get: <T>(path: string, options?: Omit<RequestOptions, "method" | "json" | "body">) =>
    request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, json?: unknown, options?: Omit<RequestOptions, "method" | "json">) =>
    request<T>(path, { ...options, method: "POST", json }),
  put: <T>(path: string, json?: unknown, options?: Omit<RequestOptions, "method" | "json">) =>
    request<T>(path, { ...options, method: "PUT", json }),
  delete: <T>(path: string, options?: Omit<RequestOptions, "method" | "json" | "body">) =>
    request<T>(path, { ...options, method: "DELETE" }),
};
