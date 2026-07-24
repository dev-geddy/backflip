import { SectionLabel } from "../../_components/page-heading"

const ABOUT = {
  ai: {
    title: "About AI providers",
    body: "Backflip talks to model providers through the Vercel AI SDK. Set one provider as default; enable the ones you want available.",
    docsLabel: "AI SDK docs",
    docsHref: "https://ai-sdk.dev/docs",
  },
  email: {
    title: "About Resend",
    body: "Transactional email is sent via Resend. Add your API key and a verified from-address to start sending.",
    docsLabel: "Resend docs",
    docsHref: "https://resend.com/docs",
  },
} as const

/** Context rail for the integrations detail: about the service + a security note. */
export function IntegrationsRail({ selection }: { selection: "ai" | "email" }) {
  const about = ABOUT[selection]
  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-3">
        <SectionLabel>About</SectionLabel>
        <div className="rounded-xl border bg-card p-4">
          <div className="text-sm font-medium">{about.title}</div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {about.body}
          </p>
          <a
            href={about.docsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-xs font-medium underline underline-offset-2"
          >
            {about.docsLabel} →
          </a>
        </div>
      </section>

      <div className="flex gap-3 rounded-xl border bg-card p-4">
        <div className="flex size-7 flex-none items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
          i
        </div>
        <div>
          <div className="text-sm font-medium">Keys encrypted at rest</div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Secrets are AES-256-GCM encrypted before storage and never sent back
            to the browser — you’ll only ever see a masked preview.
          </p>
        </div>
      </div>
    </div>
  )
}
