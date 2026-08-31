import { Suspense } from "react"
import type { Metadata } from "next"

import { getDocsIndex } from "./_lib/docs-index"
import { DocsExplorer } from "./_components/docs-explorer"

export const metadata: Metadata = { title: "Docs" }

/**
 * Admin docs explorer — the repo's three-level doc system (L1 constitution,
 * L2 contracts, L3 notes) as a browsable cascade. Capability `dashboard`, so
 * every signed-in role reaches it; the shell already gates the subtree.
 *
 * @spec L2-UI-20
 */
export default async function DocsPage() {
  const index = await getDocsIndex()
  // The explorer reads its whole state from the query string
  // (`L2-UI-38`), so it needs a Suspense boundary around `useSearchParams`.
  return (
    <Suspense>
      <DocsExplorer index={index} />
    </Suspense>
  )
}
