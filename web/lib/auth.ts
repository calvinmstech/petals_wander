// Lightweight client-side auth state.
//
// After login we store { token, roles, user } in a cookie so that:
//   - the client can attach `Authorization: Bearer <token>` to API calls, and
//   - proxy.ts (server-side) can read the role to guard /admin routes.
//
// NOTE: this cookie is readable by JS (not httpOnly) which is fine for a local
// dev scaffold. For production, move the token into an httpOnly cookie behind a
// BFF proxy route. See README "Security follow-ups".

export type AuthUser = { id: number; name: string; email: string };
export type AuthState = { token: string; roles: string[]; user: AuthUser };

export const AUTH_COOKIE = "fw_auth";

export function parseAuthCookie(raw: string | undefined | null): AuthState | null {
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(raw)) as AuthState;
  } catch {
    return null;
  }
}

export function getAuth(): AuthState | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${AUTH_COOKIE}=`));
  if (!match) return null;
  return parseAuthCookie(match.substring(AUTH_COOKIE.length + 1));
}

export function setAuth(state: AuthState): void {
  const value = encodeURIComponent(JSON.stringify(state));
  document.cookie = `${AUTH_COOKIE}=${value}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`;
}

export function clearAuth(): void {
  document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

export function isAdmin(state: AuthState | null): boolean {
  return !!state?.roles?.includes("admin");
}
