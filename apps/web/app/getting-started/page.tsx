import type { Metadata } from "next"

import { Card } from "@workspace/ui/components/card"

import { SiteFooter } from "../_components/site-footer"
import { SiteHeader } from "../_components/site-header"

export const metadata: Metadata = {
  title: "Getting started",
  description:
    "Guides for configuring and deploying Backflip — from env keys to a live droplet.",
}

const GUIDES = [
  {
    href: "/getting-started/setup-on-digitalocean-droplet",
    title: "Setup on a DigitalOcean droplet",
    body: "Provision a droplet, create the database, fill your env files and ship the first deploy — a step-by-step wizard with copy-ready commands.",
  },
  {
    href: "/getting-started/setup-on-digitalocean-droplet-docker-flavour",
    title: "Droplet setup — Docker flavour",
    body: "Postgres in Docker and Caddy for automatic TLS. Guide in the works while the flow is verified end-to-end.",
    soon: true,
  },
]

export default function GettingStartedPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <SiteHeader />
      <main>
        <section className="border-b">
          <div className="mx-auto max-w-6xl px-6 py-18">
            <span className="font-mono text-xs tracking-[0.08em] text-primary uppercase">
              Getting started
            </span>
            <h1 className="mt-2 text-[clamp(1.75rem,4vw,2.5rem)] font-semibold tracking-tight">
              Configure and ship your Backflip
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Drop in your env keys, pick an AI provider in the admin
              integrations, then take it to production with a guide below.
            </p>
          </div>
        </section>
        <section aria-label="Guides">
          <div className="mx-auto max-w-6xl px-6 py-12">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
              {GUIDES.map((g) => (
                <a key={g.href} href={g.href} className="group">
                  <Card className="h-full p-6 transition-colors group-hover:border-primary/50">
                    <h2 className="text-[1.0625rem] font-semibold">
                      {g.title}
                    </h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {g.body}
                    </p>
                    <span className="mt-4 inline-block text-sm font-medium text-primary">
                      Open guide →
                    </span>
                  </Card>
                </a>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
