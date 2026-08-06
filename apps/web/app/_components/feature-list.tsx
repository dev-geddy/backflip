import {
  RiDashboardLine,
  RiDatabase2Line,
  RiPaletteLine,
  RiShieldKeyholeLine,
  RiSparkling2Line,
} from "@remixicon/react"

import { type NumberedItem, NumberedList } from "./numbered-list"

const FEATURES: NumberedItem[] = [
  {
    icon: RiShieldKeyholeLine,
    title: "Auth, built in",
    body: "Google OAuth and email + password, sessions and guards already configured.",
  },
  {
    icon: RiDashboardLine,
    title: "Admin dashboard",
    body: "A working admin surface for users, records, and settings out of the box.",
  },
  {
    icon: RiDatabase2Line,
    title: "Postgres + Drizzle",
    body: "Typed schema, migrations, and a query layer — a real database from commit one.",
  },
  {
    icon: RiPaletteLine,
    title: "shadcn UI system",
    body: "Base UI components, theme tokens, and dark mode — consistent from the start.",
  },
  {
    icon: RiSparkling2Line,
    title: "AI, ready to call",
    body: "Provider config and typed helpers — swap models without rewiring your app.",
  },
]

export function FeatureList() {
  return (
    <section
      aria-label="What's included"
      className="mx-auto max-w-6xl px-6 py-20"
    >
      <div className="mb-9 flex flex-col gap-2">
        <span className="font-mono text-xs tracking-[0.08em] text-primary uppercase">
          Included
        </span>
        <h2 className="text-[clamp(1.625rem,3.4vw,2.125rem)] font-semibold tracking-tight">
          Everything wired, nothing in your way
        </h2>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
          Every initiative — an internal tool or a public product — starts from
          the same wired baseline instead of another round of setup decisions.
          Bring more people in and they land in a codebase they already
          recognise, so the work goes into the feature, not the scaffolding
          under it.
        </p>
      </div>
      <NumberedList items={FEATURES} />
    </section>
  )
}
