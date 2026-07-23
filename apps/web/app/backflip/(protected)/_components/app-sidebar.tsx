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
} from "@remixicon/react"

import { NavMain, type NavItem } from "./nav-main"
import { NavSecondary, type NavSecondaryItem } from "./nav-secondary"
import { NavUser } from "./nav-user"
import type { SessionUser } from "./types"

const navMain: NavItem[] = [
  { title: "Dashboard", url: "/backflip", icon: RiDashboardLine },
]

const navSecondary: NavSecondaryItem[] = [
  { title: "Users", url: "#", icon: RiGroupLine },
  { title: "Settings", url: "#", icon: RiSettings3Line },
]

export function AppSidebar({
  user,
  ...props
}: ComponentProps<typeof Sidebar> & { user: SessionUser }) {
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
        <NavMain items={navMain} />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
