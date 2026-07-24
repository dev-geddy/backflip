"use client"

import type { ComponentProps } from "react"
import Link from "next/link"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar"
import {
  RiDashboardLine,
  RiGroupLine,
  RiSettings3Line,
  RiShapesLine,
  RiUserLine,
} from "@remixicon/react"

import { can, type Capability } from "@/app/_lib/auth/permissions"
import { NavMain, type NavItem } from "./nav-main"
import { NavSecondary, type NavSecondaryItem } from "./nav-secondary"
import { NavUser } from "./nav-user"
import type { SessionUser } from "./types"

/** Each nav item declares the capability that reveals it (see permissions). */
const navMain: (NavItem & { capability: Capability })[] = [
  {
    title: "Dashboard",
    url: "/backflip",
    icon: RiDashboardLine,
    capability: "dashboard",
  },
]

const navSecondary: (NavSecondaryItem & { capability: Capability })[] = [
  {
    title: "Users",
    url: "/backflip/users",
    icon: RiGroupLine,
    capability: "users.view",
  },
  {
    title: "Account",
    url: "/backflip/account",
    icon: RiUserLine,
    capability: "account",
  },
  {
    title: "Settings",
    url: "/backflip/settings",
    icon: RiSettings3Line,
    capability: "settings",
  },
]

export function AppSidebar({
  user,
  ...props
}: ComponentProps<typeof Sidebar> & { user: SessionUser }) {
  const visibleMain = navMain.filter((i) => can(user.role, i.capability))
  const visibleSecondary = navSecondary.filter((i) =>
    can(user.role, i.capability)
  )

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              render={<Link href="/backflip" />}
            >
              <RiShapesLine className="size-5!" />
              <span className="text-base font-semibold">Backflip</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={visibleMain} />
        <NavSecondary items={visibleSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
