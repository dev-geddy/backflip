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
  RiDashboardLine,
  RiFileList3Line,
  RiSettings3Line,
  RiUserLine,
} from "@remixicon/react"

import { NavMain, type NavItem } from "./nav-main"
import { NavUser } from "./nav-user"
import type { SessionUser } from "./types"

const navMain: NavItem[] = [
  { title: "Dashboard", url: "/backflip", icon: RiDashboardLine, isActive: true },
  {
    title: "Users",
    url: "#",
    icon: RiUserLine,
    items: [
      { title: "All users", url: "#" },
      { title: "Invitations", url: "#" },
    ],
  },
  {
    title: "Content",
    url: "#",
    icon: RiFileList3Line,
    items: [
      { title: "Pages", url: "#" },
      { title: "Media", url: "#" },
    ],
  },
  {
    title: "Settings",
    url: "#",
    icon: RiSettings3Line,
    items: [
      { title: "General", url: "#" },
      { title: "Team", url: "#" },
    ],
  },
]

export function AppSidebar({
  user,
  ...props
}: ComponentProps<typeof Sidebar> & { user: SessionUser }) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<a href="/backflip" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground">
                b
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">backflip</span>
                <span className="truncate text-xs">Admin</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
