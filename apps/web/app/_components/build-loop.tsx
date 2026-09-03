/**
 * The pitch, as a transcript: four prompts between a clean machine and a
 * running product. It is the shortest honest description of what this
 * foundation is for, so it renders on both surfaces (`L1-ARCH-01`) — the
 * public homepage and the admin Overview — from one source.
 *
 * Deliberately not a terminal mock: no traffic lights, no fake window chrome.
 * The repo's aesthetic is flat and hairline, and a skeuomorphic window would
 * be the loudest thing on either page.
 *
 * @spec L2-UI-48
 */

/** One line per prompt. Kept here so all three surfaces cannot drift apart. */
export const BUILD_LOOP_PROMPTS = [
  "clone github.com/dev-geddy/backflip",
  "set up and run this project locally",
  "create a user for me and give me the login URL",
  "build feature <...>",
]

export const BUILD_LOOP_PRELUDE = "You have Docker and dev tools ready."
export const BUILD_LOOP_CLOSER = "That's how you start a project now."

/**
 * The transcript on its own, with no section chrome — the admin Overview drops
 * it straight into a card, the homepage wraps it in `BuildLoop`.
 */
export function BuildLoopTranscript({ compact }: { compact?: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      <p
        className={
          compact
            ? "text-xs text-muted-foreground"
            : "text-sm text-muted-foreground"
        }
      >
        {BUILD_LOOP_PRELUDE}
      </p>

      <div
        className={
          compact
            ? "flex flex-col gap-1.5 font-mono text-xs"
            : "flex flex-col gap-2 font-mono text-[0.8125rem] sm:text-sm"
        }
      >
        {BUILD_LOOP_PROMPTS.map((prompt) => (
          <div key={prompt} className="flex gap-2.5">
            {/* `select-none` so copying the block gives you the prompts, not
                a column of markers you then have to strip. */}
            <span aria-hidden className="flex-none text-primary select-none">
              Prompt:
            </span>
            <span className="min-w-0">{prompt}</span>
          </div>
        ))}
        <div aria-hidden className="pl-[4.4em] text-muted-foreground/60">
          …
        </div>
      </div>

      {/* Admin only. On the homepage the four prompts land harder without a
          sentence explaining them — the sections around it already carry the
          pitch, so the closer was restating a claim the page had made twice.
          In the Overview card it stays: there it is the only line giving the
          transcript a point. */}
      {compact ? (
        <p className="text-xs font-medium">{BUILD_LOOP_CLOSER}</p>
      ) : null}
    </div>
  )
}

/** Homepage section: same eyebrow + heading rhythm as the sections around it. */
export function BuildLoop() {
  return (
    <section
      aria-label="How you build with this foundation"
      className="border-b"
    >
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center lg:gap-14">
          <div className="flex flex-col gap-2">
            <span className="font-mono text-xs tracking-[0.08em] text-primary uppercase">
              The whole workflow
            </span>
            <h2 className="text-[clamp(1.625rem,3.4vw,2.125rem)] font-semibold tracking-tight">
              Four prompts from empty folder to running product
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Auth, database, admin console and UI system are already wired, so
              there is no boilerplate left to describe. You start at the
              feature.
            </p>
          </div>

          <div className="rounded-xl border bg-card p-6 sm:p-7">
            <BuildLoopTranscript />
          </div>
        </div>
      </div>
    </section>
  )
}
