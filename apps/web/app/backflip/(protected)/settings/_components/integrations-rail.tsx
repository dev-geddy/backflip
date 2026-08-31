import { SectionLabel } from "../../_components/page-heading"

type AboutLink = { label: string; href: string }

type RailSelection =
  | "ai"
  | "email"
  | "analytics"
  | "speech"
  | "connectors"
  | "clickup"
  | "slack"
  | "n8n"

const ABOUT: Record<
  RailSelection,
  { title: string; body: string; links: AboutLink[] }
> = {
  ai: {
    title: "About AI providers",
    body: "Backflip talks to model providers through the Vercel AI SDK. Set one provider as default; enable the ones you want available.",
    links: [{ label: "AI SDK docs", href: "https://ai-sdk.dev/docs" }],
  },
  email: {
    title: "About Resend",
    body: "Transactional email is sent via Resend. Add your API key and a verified from-address to start sending.",
    links: [
      { label: "Resend docs", href: "https://resend.com/docs" },
      { label: "Resend dashboard", href: "https://resend.com/api-keys" },
    ],
  },
  speech: {
    title: "About Deepgram",
    body: "Speech-to-text and text-to-speech run through Deepgram. Add your API key, then pick default STT and TTS models from the live catalog.",
    links: [
      { label: "Deepgram docs", href: "https://developers.deepgram.com/docs" },
      { label: "Deepgram console", href: "https://console.deepgram.com" },
    ],
  },
  analytics: {
    title: "About Google Analytics",
    body: "gtag.js runs on public pages only — never in this admin. With the cookie banner on, the script is not loaded until a visitor accepts.",
    links: [
      {
        label: "GA4 docs",
        href: "https://developers.google.com/analytics/devguides/collection/ga4",
      },
    ],
  },
  clickup: {
    title: "About ClickUp",
    body: "A personal API token authenticates as the ClickUp user who created it — it inherits that user's access, so use a service account for shared automation. Testing only reads the account.",
    links: [
      { label: "ClickUp API docs", href: "https://developer.clickup.com/docs" },
      {
        label: "Generate a token",
        href: "https://app.clickup.com/settings/apps",
      },
    ],
  },
  slack: {
    title: "About Slack",
    body: "Bot tokens post as your app anywhere it is invited; incoming webhooks are post-only URLs bound to one channel. Add as many of each as you need — testing a webhook posts a real message.",
    links: [
      { label: "Slack API docs", href: "https://api.slack.com/docs" },
      { label: "Your Slack apps", href: "https://api.slack.com/apps" },
    ],
  },
  n8n: {
    title: "About n8n",
    body: "One instance, reached over the n8n public API with an X-N8N-API-KEY header. The key inherits the permissions of the user who created it. Testing only lists workflows — it runs nothing.",
    links: [
      {
        label: "n8n API docs",
        href: "https://docs.n8n.io/api/",
      },
    ],
  },
  connectors: {
    title: "About the MCP connector",
    body: "A Claude client authenticates over OAuth and talks to a read-only MCP tool surface, scoped to the signed-in user's role and the token's granted scopes.",
    links: [
      {
        label: "Connector docs",
        href: "https://github.com/dev-geddy/backflip/blob/master/docs/notes/mcp.md",
      },
    ],
  },
}

/** Context rail for the integrations detail: about the service + a security note. */
export function IntegrationsRail({ selection }: { selection: RailSelection }) {
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
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            {about.links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium underline underline-offset-2"
              >
                {link.label} →
              </a>
            ))}
          </div>
        </div>
      </section>

      <div className="flex gap-3 rounded-xl border bg-card p-4">
        <div className="flex size-7 flex-none items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
          i
        </div>
        {selection === "analytics" ? (
          <div>
            <div className="text-sm font-medium">Nothing secret here</div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              A measurement ID is a public identifier, not a credential — it is
              stored as-is and served to every visitor of the public site.
            </p>
          </div>
        ) : selection === "connectors" ? (
          <div>
            <div className="text-sm font-medium">Secrets shown once</div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Only a bcrypt hash of a client secret is stored — the raw value is
              shown right after creation and never again.
            </p>
          </div>
        ) : (
          <div>
            <div className="text-sm font-medium">Keys encrypted at rest</div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Secrets are AES-256-GCM encrypted before storage and never sent
              back to the browser — you’ll only ever see a masked preview.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
