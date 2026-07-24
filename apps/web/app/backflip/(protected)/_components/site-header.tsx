"use client"

import { usePathname } from "next/navigation"

import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { Separator } from "@workspace/ui/components/separator"
import { SidebarTrigger } from "@workspace/ui/components/sidebar"

import { HeaderSearch } from "./header-search"

/** Route → breadcrumb trail (design shows a parent · page crumb on sub-pages). */
const CRUMBS: { match: (p: string) => boolean; trail: string[] }[] = [
  { match: (p) => p === "/backflip", trail: ["Overview"] },
  { match: (p) => p.startsWith("/backflip/users"), trail: ["Users"] },
  {
    match: (p) => p.startsWith("/backflip/account"),
    trail: ["Settings", "My account"],
  },
  {
    match: (p) => p.startsWith("/backflip/settings"),
    trail: ["Workspace", "Integrations"],
  },
]

function crumbsFor(pathname: string): string[] {
  return CRUMBS.find((c) => c.match(pathname))?.trail ?? ["Backflip"]
}

export function SiteHeader({
  userName,
  userInitials,
}: {
  userName: string
  userInitials: string
}) {
  const pathname = usePathname()
  const trail = crumbsFor(pathname)

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b">
      <div className="flex w-full items-center gap-2 px-4 lg:px-5">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-1 data-[orientation=vertical]:h-4"
        />
        <nav className="flex items-center gap-1.5 text-sm">
          {trail.map((c, i) => {
            const last = i === trail.length - 1
            return (
              <span key={c} className="flex items-center gap-1.5">
                <span className={last ? "font-medium" : "text-muted-foreground"}>
                  {c}
                </span>
                {!last ? <span className="text-muted-foreground/50">/</span> : null}
              </span>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <HeaderSearch />
          <a
            href="https://github.com/dev-geddy/backflip#readme"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline"
          >
            Docs
          </a>
          <Avatar className="size-7 rounded-full">
            <AvatarFallback className="rounded-full text-xs" title={userName}>
              {userInitials}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}
