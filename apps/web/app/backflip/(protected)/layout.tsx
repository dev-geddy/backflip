import type { ReactNode } from "react"

/**
 * Layout for authenticated /backflip pages.
 * The middleware guards this subtree; this layout will host the
 * admin chrome (sidebar/topbar) once implemented. Setup-only for now.
 */
export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-svh">{children}</div>
}
