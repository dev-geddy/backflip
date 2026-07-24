"use client"

import type { ComponentProps, ComponentType } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar"
import {
  RiDashboardLine,
  RiGroupLine,
  RiStackLine,
  RiShapesLine,
  RiUserLine,
} from "@remixicon/react"

import { can, type Capability } from "@/app/_lib/auth/permissions"
import { NavUser } from "./nav-user"
import type { SessionUser } from "./types"

type NavItem = {
  title: string
  url: string
  icon: ComponentType<{ className?: string }>
  capability: Capability
}

/** Nav grouped into design's labeled sections; each item declares its capability. */
const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Platform",
    items: [
      {
        title: "Overview",
        url: "/backflip",
        icon: RiDashboardLine,
        capability: "dashboard",
      },
      {
        title: "Users",
        url: "/backflip/users",
        icon: RiGroupLine,
        capability: "users.view",
      },
    ],
  },
  {
    label: "Settings",
    items: [
      {
        title: "Account",
        url: "/backflip/account",
        icon: RiUserLine,
        capability: "account",
      },
      {
        title: "Integrations",
        url: "/backflip/settings",
        icon: RiStackLine,
        capability: "settings",
      },
    ],
  },
]

function isActive(pathname: string, url: string) {
  return url === "/backflip" ? pathname === url : pathname.startsWith(url)
}

export function AppSidebar({
  user,
  ...props
}: ComponentProps<typeof Sidebar> & { user: SessionUser }) {
  const pathname = usePathname()

  const groups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => can(user.role, i.capability)),
  })).filter((g) => g.items.length > 0)

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link href="/backflip" />}
              className="gap-2.5"
            >
              <div className="flex aspect-square size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <RiShapesLine className="size-4" />
              </div>
              <div className="grid flex-1 text-left leading-tight">
                <span className="text-sm font-semibold">Backflip</span>
                <span className="text-xs text-muted-foreground">
                  Admin console
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-[11px] uppercase tracking-wide">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      tooltip={item.title}
                      isActive={isActive(pathname, item.url)}
                      render={<Link href={item.url} />}
                      className="gap-2.5 text-[13px] data-active:font-semibold"
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
