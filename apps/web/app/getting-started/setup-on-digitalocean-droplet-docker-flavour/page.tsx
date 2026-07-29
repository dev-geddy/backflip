import type { Metadata } from "next"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"

import { SiteFooter } from "../../_components/site-footer"
import { SiteHeader } from "../../_components/site-header"

export const metadata: Metadata = {
  title: "Setup on a DigitalOcean droplet — Docker flavour",
  description:
    "Deploy Backflip to a DigitalOcean droplet with the Docker flavour: Postgres in Docker and Caddy for TLS. Guide coming soon.",
}

// Placeholder — the guide gets built once the docker-flavour setup/deploy
// scripts (setup-droplet-for-docker.sh + deploy-for-docker.sh) are verified
// end-to-end. Until then it points at the pm2-flavour walkthrough.
export default function SetupOnDropletDockerFlavourPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <SiteHeader />
      <main>
        <section className="border-b">
          <div className="mx-auto max-w-6xl px-6 py-18">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs tracking-[0.08em] text-primary uppercase">
                Getting started
              </span>
              <Badge variant="secondary">Coming soon</Badge>
            </div>
            <h1 className="mt-2 text-[clamp(1.75rem,4vw,2.5rem)] font-semibold tracking-tight">
              Setup on a DigitalOcean droplet — Docker flavour
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
              The Docker flavour runs Postgres in a container and fronts the
              app with Caddy for automatic TLS. This walkthrough is being
              verified end-to-end and will land here.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button render={<a href="/getting-started/setup-on-digitalocean-droplet" />}>
                Use the pm2 flavour guide
              </Button>
              <Button
                variant="outline"
                render={<a href="/getting-started" />}
              >
                All guides
              </Button>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
