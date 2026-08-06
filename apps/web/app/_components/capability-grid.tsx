import type { RemixiconComponentType } from "@remixicon/react"
import {
  RiChat3Line,
  RiKey2Line,
  RiPlugLine,
  RiSlideshowLine,
  RiUserSettingsLine,
} from "@remixicon/react"

import { Card } from "@workspace/ui/components/card"

type Capability = {
  icon: RemixiconComponentType
  title: string
  body: string
}

/**
 * The non-technical counterpart to `FEATURES` in `feature-grid.tsx`: same five
 * slots, but each one answers "what can I do with this?" rather than "what is
 * it built from". Every line maps to something the platform actually ships —
 * keep it that way; this section is not a wish list.
 */
const CAPABILITIES: Capability[] = [
  {
    icon: RiChat3Line,
    title: "Say it, don't code it",
    body: "Describe the feature you want in plain words. The repo ships the instructions Claude Code needs to build it the same way every time.",
  },
  {
    icon: RiSlideshowLine,
    title: "Run it without a developer",
    body: "Your own admin area from the first deploy: see who signed up, change settings, keep an eye on things — no terminal, no code.",
  },
  {
    icon: RiUserSettingsLine,
    title: "Invite your team",
    body: "Add people by email and decide what each of them can touch. Owner, admin, teammate — the permissions are already wired.",
  },
  {
    icon: RiPlugLine,
    title: "Turn things on with a key",
    body: "Paste a key in the admin to switch on AI, email or speech. Keys are stored encrypted; swapping providers takes a minute, not a rewrite.",
  },
  {
    icon: RiKey2Line,
    title: "Own the whole thing",
    body: "Your server, your domain, your database, MIT-licensed code. No seats to buy, no platform to be locked into, nothing to migrate off later.",
  },
]

export function CapabilityGrid() {
  return (
    <section aria-label="What you can do" className="border-b bg-muted">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-9 flex flex-col gap-2">
          <span className="font-mono text-xs tracking-[0.08em] text-primary uppercase">
            No coding required
          </span>
          <h2 className="text-[clamp(1.625rem,3.4vw,2.125rem)] font-semibold tracking-tight">
            What you can do with it, without being a developer
          </h2>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            Set it up once by following the steps. After that it&apos;s your
            product to run, and the building happens in conversation.
          </p>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-4">
          {CAPABILITIES.map(({ icon: Icon, title, body }) => (
            <Card key={title} className="p-5.5">
              <div className="inline-flex size-[42px] items-center justify-center rounded-[10px] border bg-background text-primary">
                <Icon className="size-5" aria-hidden="true" />
              </div>
              <h3 className="mt-4 text-base font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {body}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
