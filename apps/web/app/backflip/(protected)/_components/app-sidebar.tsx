"use client"

import type { ComponentProps } from "react"

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
  RiBarChartBoxLine,
  RiDashboardLine,
  RiFileList3Line,
  RiGroupLine,
  RiQuestionLine,
  RiSettings3Line,
  RiShapesLine,
} from "@remixicon/react"

import { NavMain, type NavItem } from "./nav-main"
import { NavSecondary, type NavSecondaryItem } from "./nav-secondary"
import { NavUser } from "./nav-user"
import type { SessionUser } from "./types"

const navMain: NavItem[] = [
  { title: "Dashboard", url: "/backflip", icon: RiDashboardLine },
  { title: "Users", url: "#", icon: RiGroupLine },
  { title: "Analytics", url: "#", icon: RiBarChartBoxLine },
  { title: "Content", url: "#", icon: RiFileList3Line },
]

const navSecondary: NavSecondaryItem[] = [
  { title: "Settings", url: "#", icon: RiSettings3Line },
  { title: "Get Help", url: "#", icon: RiQuestionLine },
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
              render={<a href="/backflip" />}
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
