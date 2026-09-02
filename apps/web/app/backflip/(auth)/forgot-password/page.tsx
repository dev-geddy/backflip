import Link from "next/link"

import { BrandIcon } from "@/app/_components/brand-icon"
import { ForgotPasswordForm } from "./_components/forgot-password-form"

/**
 * /backflip/forgot-password — public. Requests a password-reset link.
 * Allowed through the auth gate by the proxy (public auth route).
 */
export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link
          href="/backflip/login"
          className="flex items-center gap-2 self-center font-medium"
        >
          <div className="flex size-6 items-center justify-center rounded-md border bg-card">
            <BrandIcon size={12} className="text-primary" />
          </div>
          Backflip
        </Link>
        <ForgotPasswordForm />
      </div>
    </div>
  )
}
