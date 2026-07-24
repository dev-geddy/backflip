"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command"
import { CommandDialog } from "@workspace/ui/components/command"
import { RiSearchLine } from "@remixicon/react"

/** Quick-jump targets — real routes + a couple of action shortcuts. */
const GROUPS: {
  heading: string
  items: { label: string; href: string; keywords: string }[]
}[] = [
  {
    heading: "Pages",
    items: [
      { label: "Overview", href: "/backflip", keywords: "dashboard home" },
      { label: "Users", href: "/backflip/users", keywords: "members people team" },
      {
        label: "Account",
        href: "/backflip/account",
        keywords: "profile email password my account",
      },
      {
        label: "Integrations",
        href: "/backflip/settings",
        keywords: "settings ai providers email resend keys",
      },
    ],
  },
  {
    heading: "Actions",
    items: [
      { label: "Add member", href: "/backflip/users", keywords: "new user invite create" },
      {
        label: "Change password",
        href: "/backflip/account",
        keywords: "security reset",
      },
    ],
  },
]

/**
 * Header quick-jump (design 5A) — a search button that opens a ⌘K command
 * palette to jump to admin pages/actions. Replicates the design's type-to-jump.
 */
export function HeaderSearch() {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [])

  function go(href: string) {
    setOpen(false)
    router.push(href)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-8 w-40 items-center gap-2 rounded-md border px-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted/50 sm:w-56"
      >
        <RiSearchLine className="size-4" />
        <span className="flex-1 truncate text-left">Jump to…</span>
        <kbd className="hidden rounded border px-1 text-[10px] sm:inline">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <Command>
          <CommandInput placeholder="Jump to a page or action…" />
          <CommandList>
            <CommandEmpty>No matches.</CommandEmpty>
            {GROUPS.map((g) => (
              <CommandGroup key={g.heading} heading={g.heading}>
                {g.items.map((it) => (
                  <CommandItem
                    key={`${g.heading}-${it.label}`}
                    value={`${it.label} ${it.keywords}`}
                    onSelect={() => go(it.href)}
                  >
                    {it.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}
