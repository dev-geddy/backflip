"use client"

import { cn } from "@workspace/ui/lib/utils"
import { RiArrowRightLine } from "@remixicon/react"

import type { DocsGraph } from "../_lib/docs-graph"
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
  onPickClause,
  onPickDomain,
}: {
  graph: DocsGraph
  onPickClause: (key: string) => void
  onPickDomain: (domain: string) => void
}) {
  const counted = (level: 1 | 2 | 3) =>
    graph.index.clauses.filter((c) => c.level === level).length
  const tagged = Object.keys(graph.index.codeRefs).length

  // Worked entry points, checked against the live index so a retired ID never
  // renders as a dead link.
  const starts = [
    { id: "L1-ARCH-01", why: "The two surfaces this platform is built from" },
    { id: "L1-CON-06", why: "What the MCP connector is allowed to do" },
    { id: "L2-AUTH-01", why: "How the admin gate actually works" },
    { id: "L2-DB-16", why: "How secrets are stored" },
  ].filter((s) => graph.byId.has(s.id))

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

      {starts.length ? (
        <>
          <p className="mt-5 mb-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Start here
          </p>
          <ul className="divide-y rounded-lg border">
            {starts.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onPickClause(s.id)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] hover:bg-muted/50"
                >
                  <IdChip id={s.id} />
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">
                    {s.why}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <p className="mt-5 mb-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        Domains ({graph.index.domains.length})
      </p>
      <div className="flex flex-wrap gap-1.5">
        {graph.index.domains.map((d) => (
          <button
            key={d.key}
            type="button"
            onClick={() => onPickDomain(d.key)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs text-muted-foreground",
              "hover:border-primary/30 hover:text-foreground"
            )}
          >
            {d.label}
            <span className="ml-1 tabular-nums opacity-60">{d.contracts}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
