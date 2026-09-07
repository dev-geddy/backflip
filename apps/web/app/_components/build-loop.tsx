/**
 * The pitch, as a transcript: four prompts between a clean machine and a
 * running product. It is the shortest honest description of what this
 * foundation is for.
 *
 * The admin Overview is now its only mount: the public homepage was cut back
 * to header / hero / footer, so the `BuildLoop` section that wrapped this
 * went with it. The transcript itself stays here rather than moving into the
 * Overview, because `README.md` repeats the same four lines by hand and this
 * is the copy they are checked against.
 *
 * Deliberately not a terminal mock: no traffic lights, no fake window chrome.
 * The repo's aesthetic is flat and hairline, and a skeuomorphic window would
 * be the loudest thing on either page.
 *
 * @spec L2-UI-48
 */

/** One line per prompt. Kept here so the surfaces cannot drift apart. */
export const BUILD_LOOP_PROMPTS = [
  "clone github.com/dev-geddy/backflip",
  "set up and run this project locally",
  "create a user for me and give me the login URL",
  "build feature <...>",
]

export const BUILD_LOOP_PRELUDE = "You have Docker and dev tools ready."

/**
 * The transcript on its own, with no section chrome — the admin Overview drops
 * it straight into a card.
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
    </div>
  )
}
