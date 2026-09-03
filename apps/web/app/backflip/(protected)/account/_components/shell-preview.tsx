"use client"

import { cn } from "@workspace/ui/lib/utils"

import { gradientVars, type ChromeTheme } from "@/app/_lib/theme/chrome-themes"

/**
 * Miniature of the real shell — themed sidebar with an active nav row, themed
 * header strip, neutral content.
 *
 * Every tile paints from inline colors, `default` included. It cannot use
 * `bg-sidebar`: this picker renders *inside* the themed shell, so `--sidebar`
 * here is whatever theme is currently active — the Default tile would show a
 * dark sidebar while a dark theme is selected. `--stock-*` are captured at the
 * root, out of reach of the theme blocks, and still follow light/dark.
 */
export function ShellPreview({
  theme,
  headerThemed,
  glass,
}: {
  theme: ChromeTheme
  headerThemed: boolean
  glass: boolean
}) {
  const stock = theme.group === "default"
  const paint = stock
    ? {
        surface: "var(--stock-sidebar)",
        foreground: "var(--stock-sidebar-foreground)",
        accent: "var(--stock-sidebar-accent)",
        edge: "var(--stock-sidebar-border)",
        header: "var(--stock-background)",
        headerInk: "var(--stock-foreground)",
      }
    : {
        surface: theme.swatch.surface,
        foreground: theme.swatch.foreground,
        accent: theme.swatch.accent,
        edge: theme.swatch.accent,
        // Mirrors the live opt-out: with the header untinted the tile shows
        // the stock strip, so the preview never promises more than you get.
        header: headerThemed ? theme.swatch.surface : "var(--stock-background)",
        headerInk: headerThemed
          ? theme.swatch.foreground
          : "var(--stock-foreground)",
      }

  const ink = (opacity: number) => ({
    backgroundColor: paint.foreground,
    opacity,
  })
  const headerInk = (opacity: number) => ({
    backgroundColor: paint.headerInk,
    opacity,
  })

  // The tile mirrors the live chrome's continuation trick (`L2-UI-44`) in
  // miniature: the gradient is painted once on the whole shell box, and the
  // sidebar column and header strip go transparent to let their own slice of
  // it through. Painting each separately would restart the ramp at the seam.
  const gradient = !stock
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-[104px] overflow-hidden rounded-lg border",
        gradient ? "chrome-gradient" : undefined
      )}
      style={{
        borderColor: paint.edge,
        ...(gradient
          ? {
              backgroundColor: paint.surface,
              ...gradientVars(theme.swatch),
            }
          : null),
      }}
    >
      {/* Sidebar */}
      <span
        className="flex w-[34%] flex-col gap-1.5 p-2"
        style={gradient ? undefined : { backgroundColor: paint.surface }}
      >
        {/* Brand row */}
        <span className="flex items-center gap-1 pb-1">
          <span className="size-2.5 flex-none rounded-[3px]" style={ink(0.9)} />
          <span className="h-1.5 flex-1 rounded-full" style={ink(0.7)} />
        </span>

        {/* Active nav row — the accent surface, as in the real sidebar */}
        <span
          className="flex items-center gap-1 rounded-[3px] px-1 py-1"
          style={{ backgroundColor: paint.accent }}
        >
          <span className="size-1.5 flex-none rounded-[1px]" style={ink(0.9)} />
          <span className="h-1 flex-1 rounded-full" style={ink(0.9)} />
        </span>

        {/* Idle nav rows */}
        {[0.45, 0.45, 0.3].map((opacity, i) => (
          <span key={i} className="flex items-center gap-1 px-1">
            <span
              className="size-1.5 flex-none rounded-[1px]"
              style={ink(opacity)}
            />
            <span
              className={cn("h-1 rounded-full", i === 2 ? "w-1/2" : "flex-1")}
              style={ink(opacity)}
            />
          </span>
        ))}
      </span>

      {/* Content column: themed header strip over neutral page content */}
      <span className="flex min-w-0 flex-1 flex-col">
        <span
          className="flex h-[22px] flex-none items-center gap-1 px-2"
          style={{
            // Glass thins the strip so the surface behind shows through, the
            // one part of `L2-UI-45` a static miniature can honestly show.
            backgroundColor:
              gradient && headerThemed && !glass
                ? "transparent"
                : glass
                  ? `color-mix(in oklab, ${paint.header} 72%, transparent)`
                  : paint.header,
          }}
        >
          <span className="h-1 w-6 rounded-full" style={headerInk(0.5)} />
          <span className="flex-1" />
          <span className="size-1.5 rounded-full" style={headerInk(0.4)} />
          <span className="size-1.5 rounded-full" style={headerInk(0.4)} />
        </span>

        {/* Page content is never tinted by a theme — the stock canvas shows
            that, in every tile. */}
        <span
          className="flex flex-1 flex-col gap-1.5 p-2"
          style={{ backgroundColor: "var(--stock-background)" }}
        >
          <span
            className="h-1.5 w-2/3 rounded-full"
            style={{ backgroundColor: "var(--stock-foreground)", opacity: 0.2 }}
          />
          <span
            className="flex-1 rounded-[3px] border"
            style={{ borderColor: "var(--stock-sidebar-border)" }}
          />
        </span>
      </span>
    </span>
  )
}
