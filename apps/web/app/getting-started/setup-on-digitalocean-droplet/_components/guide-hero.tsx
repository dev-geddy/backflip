import { RiBookOpenLine, RiTerminalBoxLine } from "@remixicon/react"

import { Badge } from "@workspace/ui/components/badge"

const DEVOPS_DOC = "https://github.com/dev-geddy/backflip/blob/master/devops.md"

// Server Component. Same stripe-texture backdrop as the homepage hero, shorter.
export function GuideHero() {
  return (
    <section
      aria-label="Introduction"
      className="relative overflow-hidden border-b"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-card [background-image:repeating-linear-gradient(135deg,var(--muted)_0_2px,transparent_2px_22px)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(90deg,var(--background)_0%,var(--background)_34%,transparent_82%),linear-gradient(0deg,var(--background)_2%,transparent_34%)]"
      />

      <div className="relative mx-auto max-w-6xl px-6 pt-16 pb-14">
        <div className="max-w-2xl">
          <Badge variant="outline" className="gap-1.5 rounded-full">
            <RiTerminalBoxLine
              className="size-3.5 text-primary"
              aria-hidden="true"
            />
            Getting started
          </Badge>
          <h1 className="mt-5 text-[clamp(2rem,5vw,3.25rem)] leading-[1.05] font-bold tracking-tight">
            Setup on a
            <br />
            DigitalOcean droplet
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
            A few guided steps from a bare Ubuntu droplet to Backflip live on
            your domain, over HTTPS. Fill in your variables once and copy the
            commands — they run from the repo root on your own machine.
          </p>
          <a
            href={DEVOPS_DOC}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <RiBookOpenLine className="size-4" aria-hidden="true" />
            Full reference: devops.md in the repo
          </a>
        </div>
      </div>
    </section>
  )
}
