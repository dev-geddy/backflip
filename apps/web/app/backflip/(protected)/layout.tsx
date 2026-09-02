import type { CSSProperties, ReactNode } from "react"
import { redirect } from "next/navigation"

import { SidebarInset, SidebarProvider } from "@workspace/ui/components/sidebar"

import { auth } from "@/app/_lib/auth"
import { customChromeVars } from "@/app/_lib/theme/chrome-themes"
import { getChromePreferences } from "@/app/_lib/theme/preferences"
import { AppSidebar } from "./_components/app-sidebar"
import { SiteHeader } from "./_components/site-header"
import type { SessionUser } from "./_components/types"

/**
 * Authenticated /backflip shell (Flat Admin design): a flush left sidebar
 * (248px) against a soft canvas, with a 48px header. The proxy already gates
 * this subtree; `auth()` provides the user.
 *
 * The user's chrome preferences are resolved here and stamped on the shell
 * wrapper as `data-chrome-theme` + `data-chrome-header`, so the themed chrome
 * arrives with the server HTML — no flash of the default palette on every
 * navigation (`L2-UI-25`). `data-chrome-header="plain"` keeps the sidebar
 * themed while the header falls back to plain light/dark (`L2-UI-32`), and
 * `data-chrome-glass="on"` floats the header over the page as frosted glass
 * (`L2-UI-45`) — a separate attribute because it is orthogonal to the tint.
 *
 * @spec L2-UI-25
 */
export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect("/backflip/login")

  const chrome = await getChromePreferences(session.user.id)
  // `custom` has no stylesheet block — its palette ships as inline variables
  // in exactly the shape a theme block would declare (`L2-UI-33`).
  const customVars =
    chrome.theme === "custom"
      ? customChromeVars(
          chrome.custom.surface,
          chrome.custom.accent,
          chrome.headerThemed
        )
      : {}

  const user: SessionUser = {
    name: session.user.name ?? "Owner",
    email: session.user.email ?? "",
    image: session.user.image ?? null,
    role: session.user.role,
  }

  return (
    <SidebarProvider
      data-chrome-theme={chrome.theme}
      data-chrome-header={chrome.headerThemed ? "themed" : "plain"}
      data-chrome-glass={chrome.headerGlass ? "on" : "off"}
      style={
        {
          "--sidebar-width": "15.5rem",
          "--sidebar-width-icon": "3.5rem",
          "--header-height": "3rem",
          ...customVars,
        } as CSSProperties
      }
    >
      <AppSidebar user={user} />
      <SidebarInset>
        <SiteHeader />
        {/* No outer padding: master-detail pages go full-bleed edge-to-edge;
            padded pages (dashboard/account) add their own padding. */}
        <div className="flex min-h-0 flex-1 flex-col bg-muted/40">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
