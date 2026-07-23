import type { ReactNode } from "react"
import { redirect } from "next/navigation"

import { Separator } from "@workspace/ui/components/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar"

import { auth } from "@/app/_lib/auth"
import { AppSidebar } from "./_components/app-sidebar"
import type { SessionUser } from "./_components/types"

/**
 * Authenticated /backflip shell: sidebar + header. The proxy already gates
 * this subtree; `auth()` here provides the session user for the nav.
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
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <h1 className="text-sm font-medium">Dashboard</h1>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
