import { getToken } from "next-auth/jwt"
import { NextResponse, type NextRequest } from "next/server"

/**
 * Admin auth boundary for the /backflip scope. Runs as a Next.js proxy
 * (the renamed `middleware` convention, Next 16+), on the edge runtime.
 *
 * Edge-safe: reads the Auth.js JWT via `getToken` (no db / node deps here).
 * - Unauthenticated request to a protected /backflip path → redirect to login
 *   with the original path in `from`.
 * - Authenticated request to the login page → redirect to the dashboard.
 * The login route is otherwise public.
 */

const LOGIN_PATH = "/backflip/login"
const HOME_PATH = "/backflip"

/**
 * Public auth routes within `/backflip` — reachable without a session. Login
 * bounces authed users to the dashboard; the password-recovery routes are
 * always public (a logged-out click on an emailed link must work).
 */
const RECOVERY_PATHS = new Set([
  "/backflip/forgot-password",
  "/backflip/reset-password",
])

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (RECOVERY_PATHS.has(pathname)) {
    return NextResponse.next()
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  })
  const isAuthed = Boolean(token)

  if (pathname === LOGIN_PATH) {
    if (isAuthed) {
      return NextResponse.redirect(new URL(HOME_PATH, request.url))
    }
    return NextResponse.next()
  }

  if (!isAuthed) {
    const loginUrl = new URL(LOGIN_PATH, request.url)
    loginUrl.searchParams.set("from", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/backflip/:path*"],
}
