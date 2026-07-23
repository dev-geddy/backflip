import type { CSSProperties, ReactNode } from "react"
import { redirect } from "next/navigation"

import { SidebarInset, SidebarProvider } from "@workspace/ui/components/sidebar"

import { auth } from "@/app/_lib/auth"
import { AppSidebar } from "./_components/app-sidebar"
import { SiteHeader } from "./_components/site-header"
import type { SessionUser } from "./_components/types"

/**
 * Authenticated /backflip shell (dashboard-01 layout): inset sidebar + site
 * header. The proxy already gates this subtree; `auth()` provides the user.
 */
export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect("/backflip/login")

  const user: SessionUser = {
    name: session.user.name ?? "Owner",
    email: session.user.email ?? "",
    image: session.user.image ?? null,
    role: session.user.role,
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as CSSProperties
      }
    >
      <AppSidebar variant="inset" user={user} />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
