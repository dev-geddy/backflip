import Link from "next/link"
import type { Metadata } from "next"

import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { RiShieldKeyholeLine } from "@remixicon/react"

import { BrandIcon } from "@/app/_components/brand-icon"

export const metadata: Metadata = { title: "Access denied" }

/**
 * Copy per Auth.js error code. `pages.error` takes a single route, so every
 * auth error lands here, not just `AccessDenied` — the rest would otherwise
 * fall back to the framework's unstyled page.
 *
 * `AccessDenied` is the only code a normal visitor reaches: it is what the
 * `signIn` callback returns for a Google account whose email is not
 * pre-registered (`L2-AUTH-41`). The wording points at the remedy — an
 * administrator adding the address — rather than at the visitor, since there
 * is nothing they can fix on their own.
 */
const ERRORS: Record<string, { title: string; description: string }> = {
  AccessDenied: {
    title: "You don’t have access",
    description:
      "This account isn’t set up to sign in here. Ask an administrator to add it, then try again.",
  },
  Verification: {
    title: "That link has expired",
    description:
      "Sign-in links can only be used once, and they don’t last long. Request a new one to continue.",
  },
  Configuration: {
    title: "Sign-in isn’t available",
    description:
      "The server is missing part of its sign-in configuration. This one needs an administrator.",
  },
}

const FALLBACK = {
  title: "Something went wrong",
  description: "We couldn’t complete your sign-in. Please try again.",
}

/**
 * /backflip/access-denied — public. Where Auth.js sends a failed sign-in
 * (`pages.error`), replacing the framework's built-in page at
 * `/api/auth/error`. The API route stays an API route: it now redirects here
 * instead of rendering HTML of its own.
 *
 * Allowed through the auth gate by the proxy — a rejected visitor has no
 * session by definition, so gating this route would bounce them to the login
 * page and they would never see why they were turned away.
 *
 * @spec L2-AUTH-46
 */
export default async function AccessDeniedPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const { title, description } = (error && ERRORS[error]) || FALLBACK

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link
          href="/"
          className="flex items-center gap-2 self-center font-medium"
        >
          <div className="flex size-6 items-center justify-center rounded-md border bg-card">
            <BrandIcon size={12} className="text-primary" />
          </div>
          Backflip
        </Link>

        <Card>
          <CardHeader className="text-center">
            <div
              aria-hidden
              className="mx-auto mb-1 flex size-10 items-center justify-center rounded-full border bg-muted text-muted-foreground"
            >
              <RiShieldKeyholeLine className="size-5" />
            </div>
            <CardTitle className="text-xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button
              render={<Link href="/backflip/login">Back to login</Link>}
            />
            <Button
              variant="ghost"
              render={<Link href="/">Go to the homepage</Link>}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
