import type { Metadata } from "next"

import { Hero } from "./_components/hero"
import { SiteFooter } from "./_components/site-footer"
import { SiteHeader } from "./_components/site-header"

export const metadata: Metadata = {
  title: "Backflip — a batteries-included platform foundation",
  description:
    "Clone it and start building features, not boilerplate. Auth, admin dashboard, Postgres + Drizzle, a shadcn UI system, and AI wiring, ready on day one.",
}

// Server Component (RSC). No client hooks here — the only interactive island is
// the theme toggle inside <SiteHeader />.
export default function HomePage() {
  return (
    <div
      data-surface="public"
      className="min-h-dvh bg-background text-foreground"
    >
      <SiteHeader />
      <main>
        <Hero />
      </main>
      <SiteFooter />
    </div>
  )
}
