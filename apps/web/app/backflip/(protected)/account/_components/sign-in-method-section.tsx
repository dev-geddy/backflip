import { GoogleMark } from "../../_components/google-mark"

/**
 * Sign-in method row — which credentials actually open this account. Derived,
 * never stored: a `passwordHash` means "Password", each linked OAuth row means
 * that provider. Mirrors the member detail's row shape
 * (`users/_components/member-detail.tsx`), so reading your own record and
 * reading someone else's present the same fact identically.
 *
 * The empty case is worth stating rather than hiding: an account reachable
 * only by an email link has no sign-in method yet, and a blank row would read
 * as a loading failure.
 */
export function SignInMethodSection({
  loginMethods,
  usesGoogle,
}: {
  loginMethods: string[]
  usesGoogle: boolean
}) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-32 flex-none text-sm text-muted-foreground">
        Sign-in method
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {usesGoogle ? <GoogleMark /> : null}
        <span className="truncate text-sm">
          {loginMethods.length ? loginMethods.join(", ") : "No sign-in method"}
        </span>
      </div>
    </div>
  )
}
