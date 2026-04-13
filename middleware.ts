import { NextResponse, type NextRequest } from "next/server"
import { AUTH_COOKIE_NAME, ROLES_COOKIE_NAME, hasAdminAccess } from "@/lib/auth-session"

export function middleware(request: NextRequest) {
  const hasAuthCookie = request.cookies.get(AUTH_COOKIE_NAME)?.value === "1"
  const encodedRoles = request.cookies.get(ROLES_COOKIE_NAME)?.value ?? ""
  if (!hasAuthCookie) {
    return NextResponse.next()
  }

  const roles = decodeURIComponent(encodedRoles).split(",").filter(Boolean)

  if (!hasAdminAccess(roles)) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*"],
}
