import type { Metadata } from "next"

import { SiteFooter } from "../../_components/site-footer"
import { SiteHeader } from "../../_components/site-header"
import { GuideHero } from "./_components/guide-hero"
import { SetupGuide } from "./_components/setup-guide"

export const metadata: Metadata = {
  title: "Setup on a DigitalOcean droplet",
  description:
    "A guided, five-step walkthrough for deploying Backflip to a DigitalOcean droplet — fill in your variables and copy the ready-made commands.",
}

// Server Component (RSC) shell around the client guide island. The guide is
// interactive but purely local: the operator's values never leave the browser.
export default function SetupOnDigitalOceanDropletPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <SiteHeader />
      <main>
        <GuideHero />
        <SetupGuide />
      </main>
      <SiteFooter />
    </div>
  )
}
