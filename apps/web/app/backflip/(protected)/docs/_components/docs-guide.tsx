"use client"

import { RiArrowRightLine } from "@remixicon/react"

import { exampleTrace, type DocsGraph } from "../_lib/docs-graph"
import { IdChip } from "./drift-badge"

/**
 * Landing pane — the on-ramp. The explorer is a filter tool, which is only
 * usable once you know what the three levels are and which way citations
 * point; before this the first thing a newcomer met was a defect list.
 *
 * Everything here is derived from the live index, so it cannot describe a
 * doc system the repo no longer has.
 *
 * @spec L2-UI-37
 */

const LEVELS: {
  level: 1 | 2 | 3
  name: string
  question: string
  detail: string
  cadence: string
}[] = [
  {
    level: 1,
    name: "Constitution",
    question: "Why",
    detail: "Invariants, boundaries, stack rationale. One file.",
    cadence: "Rarely · human-only",
  },
  {
    level: 2,
    name: "Contracts",
    question: "What",
    detail: "Interfaces, schemas, invariants, errors — one file per domain.",
    cadence: "Per feature · human-approved",
  },
  {
    level: 3,
    name: "Notes",
    question: "How",
    detail: "File maps, decisions, gotchas, deviations. Volatile.",
    cadence: "Every commit",
  },
]

export function DocsGuide({
  graph,
  onOpenTrace,
}: {
  graph: DocsGraph
  /** Loads a whole L1 → L2 → L3 chain into the cascade at once. */
  onOpenTrace: (keys: { l1: string; l2: string; l3: string }) => void
}) {
  const counted = (level: 1 | 2 | 3) =>
    graph.index.clauses.filter((c) => c.level === level).length
  const tagged = Object.keys(graph.index.codeRefs).length

  // Derived, not curated: hand-picked entry points were arbitrary, went stale
  // and taught nothing. This shows the model working on real clauses.
  const example = exampleTrace(graph)

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 lg:px-6">
      <div className="grid gap-3 lg:grid-cols-3">
        {LEVELS.map((l, i) => (
          <div key={l.level} className="relative rounded-lg border p-3">
            <div className="flex items-baseline gap-2">
              <span className="rounded bg-muted px-1.5 py-px font-mono text-[11px] font-medium">
                L{l.level}
              </span>
              <span className="text-sm font-medium">{l.name}</span>
              <span className="ml-auto text-[11px] text-muted-foreground tabular-nums">
                {counted(l.level)}
              </span>
            </div>
            <p className="mt-1.5 text-[13px]">
              <span className="font-medium">{l.question}</span> — {l.detail}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Changes: {l.cadence}
            </p>
            {i < LEVELS.length - 1 ? (
              <RiArrowRightLine
                aria-hidden
                className="absolute top-1/2 -right-[13px] z-10 hidden size-4 -translate-y-1/2 text-muted-foreground lg:block"
              />
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-lg border bg-muted/40 p-3 text-[13px]">
        <p>
          <span className="font-medium">Citations point upward only.</span> A
          note cites the contracts it satisfies; a contract cites the
          constitution clauses it implements. Nothing ever cites downward.
        </p>
        <p className="mt-1 text-muted-foreground">
          On conflict, L1 wins over L2, and L2 wins over L3. Code disagreeing
          with a contract means the <em>code</em> is wrong. {tagged} IDs are
          currently reachable from source via <code>@spec</code> tags.
        </p>
      </div>

      {example ? (
        <>
          <p className="mt-5 mb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            One rule, end to end
          </p>
          <p className="mb-2 text-[13px] text-muted-foreground">
            The chain below is the most-cited one in these docs right now — a
            constitution clause, a contract implementing it, and the note
            recording how it was built. Open it to see the same trace loaded
            into the columns below.
          </p>
          <button
            type="button"
            onClick={() =>
              onOpenTrace({
                l1: example.l1.key,
                l2: example.l2.key,
                l3: example.l3.key,
              })
            }
            className="flex w-full flex-col gap-2 rounded-lg border p-3 text-left hover:border-primary/40 lg:flex-row lg:items-stretch"
          >
            {[example.l1, example.l2, example.l3].map((clause, i) => (
              <span key={clause.key} className="flex min-w-0 flex-1 gap-2">
                {i > 0 ? (
                  <RiArrowRightLine
                    aria-hidden
                    className="mt-4 hidden size-4 flex-none text-muted-foreground lg:block"
                  />
                ) : null}
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex items-center gap-1.5">
                    <span className="rounded bg-muted px-1.5 py-px font-mono text-[10px] font-medium">
                      L{clause.level}
                    </span>
                    {clause.id ? <IdChip id={clause.id} /> : null}
                    <span className="truncate text-[10px] text-muted-foreground">
                      {clause.domain}
                    </span>
                  </span>
                  <span className="line-clamp-2 text-[13px]">
                    {clause.title}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {
                      ["why it exists", "what it promises", "how it is built"][
                        i
                      ]
                    }
                  </span>
                </span>
              </span>
            ))}
          </button>
        </>
      ) : null}
    </div>
  )
}
