import type { RemixiconComponentType } from "@remixicon/react"
import {
  RiDashboardLine,
  RiDatabase2Line,
  RiPaletteLine,
  RiShieldKeyholeLine,
  RiSparkling2Line,
} from "@remixicon/react"

import { Card } from "@workspace/ui/components/card"

type Feature = {
  icon: RemixiconComponentType
  title: string
  body: string
}

const FEATURES: Feature[] = [
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

export function FeatureGrid() {
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
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-4">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <Card key={title} className="p-5.5">
            <div className="inline-flex size-[42px] items-center justify-center rounded-[10px] border bg-muted text-primary">
              <Icon className="size-5" aria-hidden="true" />
            </div>
            <h3 className="mt-4 text-base font-semibold">{title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {body}
            </p>
          </Card>
        ))}
      </div>
    </section>
  )
}
