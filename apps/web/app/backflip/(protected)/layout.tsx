import type { CSSProperties, ReactNode } from "react"
import { redirect } from "next/navigation"

import { SidebarInset, SidebarProvider } from "@workspace/ui/components/sidebar"

import { auth } from "@/app/_lib/auth"
import { AppSidebar } from "./_components/app-sidebar"
import { SiteHeader } from "./_components/site-header"
import type { SessionUser } from "./_components/types"

function initials(nameOrEmail: string) {
  return nameOrEmail.slice(0, 2).toUpperCase()
}

/**
 * Authenticated /backflip shell (Flat Admin design): a flush left sidebar
 * (248px) against a soft canvas, with a 56px header. The proxy already gates
 * this subtree; `auth()` provides the user.
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
          "--sidebar-width": "15.5rem",
          "--header-height": "3.5rem",
        } as CSSProperties
      }
    >
      <AppSidebar user={user} />
      <SidebarInset>
        <SiteHeader
          userName={user.name}
          userInitials={initials(user.name || user.email)}
        />
        <div className="flex flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-6 md:p-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
