"use client"

import { useEffect, useState } from "react"
import { RiMoonLine, RiSunLine } from "@remixicon/react"
import { useTheme } from "next-themes"

import { Button } from "@workspace/ui/components/button"

import { BrandIcon } from "./brand-icon"

function Wordmark({ className }: { className?: string }) {
  return (
    <a
      href="/"
      className={`flex items-center gap-2 text-base font-bold tracking-tight ${className ?? ""}`}
    >
      <span className="inline-flex size-[22px] items-center justify-center rounded-md border bg-card">
        <BrandIcon className="text-primary" />
      </span>
      Backflip
    </a>
  )
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const isDark = resolvedTheme === "dark"
  return (
    <Button
      variant="outline"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {/* Mount guard avoids hydration mismatch before the theme resolves. */}
      {mounted && isDark ? (
        <RiSunLine className="size-[18px]" aria-hidden="true" />
      ) : (
        <RiMoonLine className="size-[18px]" aria-hidden="true" />
      )}
    </Button>
  )
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
      <nav
        aria-label="Primary"
        className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-6"
      >
        <Wordmark />
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            render={<a href="/getting-started" />}
          >
            Getting started
          </Button>
          <ThemeToggle />
          <Button size="sm" render={<a href="/backflip" />}>
            Admin
          </Button>
        </div>
      </nav>
    </header>
  )
}
