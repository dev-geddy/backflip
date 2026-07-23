import { LoginForm } from "./_components/login-form"

/**
 * /backflip/login — public admin login (credentials + Google).
 * `from` (set by the proxy on redirect) becomes the post-login target,
 * constrained to in-scope paths to avoid open redirects.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>
}) {
  const { from } = await searchParams
  const callbackUrl = from?.startsWith("/backflip") ? from : "/backflip"

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex items-center gap-2 self-center font-medium">
          <div className="flex size-6 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
            b
          </div>
          backflip
        </div>
        <LoginForm callbackUrl={callbackUrl} />
      </div>
    </div>
  )
}
