// Browser-side API client. Talks directly to the Laravel "system" API so the
// storefront/admin are clearly API-driven (visible in the Network tab on
// localhost:8014). Auth is sent as a Bearer token from the auth cookie.

import { getAuth, clearAuth } from "./auth";

// On an authenticated request that comes back 401, the token is missing/expired
// (e.g. the API was reseeded). Clear the stale cookie and bounce to the right
// login so pages don't silently spin on a swallowed error.
function handleExpiredSession(): void {
  if (typeof window === "undefined") return;
  clearAuth();
  const { pathname, search } = window.location;
  if (pathname.startsWith("/login") || pathname.startsWith("/admin/login")) return;
  const loginPath = pathname.startsWith("/admin") ? "/admin/login" : "/login";
  window.location.href = `${loginPath}?redirect=${encodeURIComponent(pathname + search)}`;
}

const BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8014/api";

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;
  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

type Options = Omit<RequestInit, "body"> & { body?: unknown };

export async function apiFetch<T = unknown>(
  path: string,
  options: Options = {}
): Promise<T> {
  const auth = getAuth();
  const { body, headers, ...rest } = options;

  // FormData (e.g. receipt upload) must be sent raw so the browser sets the
  // multipart boundary; everything else is JSON.
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;

  const res = await fetch(`${BASE}${path}`, {
    ...rest,
    headers: {
      Accept: "application/json",
      ...(body !== undefined && !isForm ? { "Content-Type": "application/json" } : {}),
      ...(auth ? { Authorization: `Bearer ${auth.token}` } : {}),
      ...headers,
    },
    body:
      body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    // A 401 on a request we authenticated means the session is stale/expired.
    if (res.status === 401 && auth) {
      handleExpiredSession();
    }
    const message =
      (data && (data.message as string)) || `Request failed (${res.status})`;
    throw new ApiError(message, res.status, data?.errors);
  }

  return data as T;
}

export const api = {
  get: <T = unknown>(path: string) => apiFetch<T>(path, { method: "GET" }),
  post: <T = unknown>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "POST", body }),
  put: <T = unknown>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "PUT", body }),
  patch: <T = unknown>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "PATCH", body }),
  delete: <T = unknown>(path: string) =>
    apiFetch<T>(path, { method: "DELETE" }),
  upload: <T = unknown>(path: string, form: FormData) =>
    apiFetch<T>(path, { method: "POST", body: form }),
};
