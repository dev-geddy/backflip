import type { ReactNode } from "react"
import type { Metadata } from "next"

import { CRUMB_SEPARATOR, TITLE_PREFIX } from "./_lib/crumbs"

/**
 * Tab titles for the whole admin scope. Pages set only their trail
 * (`titleFor()`), and this composes "B › Settings › My account". Declared here
 * rather than in `(protected)` so the sign-in pages inherit it too — they had
 * no title at all, which is why the browser fell back to the bare URL.
 */
export const metadata: Metadata = {
  title: {
    template: `${TITLE_PREFIX}${CRUMB_SEPARATOR}%s`,
    default: `${TITLE_PREFIX}${CRUMB_SEPARATOR}Admin`,
  },
}

/**
 * Root layout for the /backflip admin scope.
 * Wraps both the public (auth) and (protected) route groups.
 * Setup-only: shell/nav to be implemented in a later phase.
 */
export default function BackflipLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-svh">{children}</div>
}
