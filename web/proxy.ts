import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE, parseAuthCookie } from "@/lib/auth";

// Next.js 16 renamed `middleware` -> `proxy`. This guards the admin area:
// only authenticated users with the `admin` role may enter /admin/*.
export function proxy(request: NextRequest) {
  // The admin login page must stay reachable while signed out.
  if (request.nextUrl.pathname === "/admin/login") {
    return NextResponse.next();
  }

  const auth = parseAuthCookie(request.cookies.get(AUTH_COOKIE)?.value);

  if (!auth) {
    const url = new URL("/admin/login", request.url);
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (!auth.roles?.includes("admin")) {
    // Logged in but not an admin -> send to the storefront.
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
