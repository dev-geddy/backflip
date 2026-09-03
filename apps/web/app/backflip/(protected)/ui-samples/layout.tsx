import type { ReactNode } from "react"
import type { Metadata } from "next"

import { titleFor } from "../../_lib/crumbs"

/**
 * Exists only to carry the tab title: `ui-samples/page.tsx` is a client
 * component, and a client component cannot export `metadata`.
 */
export const metadata: Metadata = { title: titleFor("/backflip/ui-samples") }

export default function UiSamplesLayout({ children }: { children: ReactNode }) {
  return children
}
