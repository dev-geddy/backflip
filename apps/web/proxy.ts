import { NextResponse, type NextRequest } from "next/server"

/**
 * Admin auth boundary for the /backflip scope. Runs as a Next.js
 * proxy (the renamed `middleware` convention, Next 16+).
 *
 * Setup-only stub: the real check will validate a Google-auth session.
 * For now it looks for a `session` cookie and redirects unauthenticated
 * requests to /backflip/login. /backflip/login itself stays public.
 *
 * See docs/kickoff/phase1.md for the intended auth flow.
 */

const LOGIN_PATH = "/backflip/login"

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname === LOGIN_PATH) {
    return NextResponse.next()
  }

  const hasSession = Boolean(request.cookies.get("session")?.value)
  if (!hasSession) {
    const loginUrl = new URL(LOGIN_PATH, request.url)
    loginUrl.searchParams.set("from", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/backflip/:path*"],
}
