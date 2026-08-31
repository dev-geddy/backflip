"use client"

import { useMemo } from "react"

import { Button } from "@workspace/ui/components/button"
import {
  RiArrowLeftLine,
  RiExternalLinkLine,
  RiFilter2Line,
} from "@remixicon/react"

import { Markdown } from "../../_components/markdown"
import type { DocClause } from "../_lib/parse-docs"
import { BADGE_HELP, type DocsGraph } from "../_lib/docs-graph"
import { DriftBadgePill, IdChip } from "./drift-badge"

const REPO_BLOB = "https://github.com/dev-geddy/backflip/blob/master/"

const LEVEL_NAMES = ["", "Constitution", "Contract", "Notes"] as const

/** Notes sections run long; when a contract is selected, offer just its lines. */
function focusLines(body: string, id: string): string {
  const kept = body.split("\n").filter((line) => line.includes(id))
  return kept.length ? kept.join("\n") : body
}

/** The header already carries the ID chip — drop it from the rendered clause. */
function stripLead(body: string, id: string | null): string {
  if (!id) return body
  return body.replace(
    new RegExp(`^-\\s+\`${id}\`\\s*(_\\([a-z]+\\)_)?\\s*(?:—|-|–)?\\s*`),
    ""
  )
}

export function ClauseDetail({
  clause,
  graph,
  focusId,
  focused,
  onToggleFocus,
  onPick,
  onBack,
}: {
  clause: DocClause
  graph: DocsGraph
  /** Contract ID the cascade is currently filtered by, if any. */
  focusId: string | null
  focused: boolean
  onToggleFocus: () => void
  onPick: (key: string) => void
  /** Returns to the drift overview — the pane this one replaced. */
  onBack: () => void
}) {
  const badges = graph.badges.get(clause.key) ?? []
  const down = useMemo(() => {
    if (clause.level === 1 && clause.id) {
      return graph.implementers.get(clause.id) ?? []
    }
    if (clause.level === 2 && clause.id) return graph.notes.get(clause.id) ?? []
    return []
  }, [clause, graph])

  const up = clause.citesUp
    .map((id) => graph.byId.get(id))
    .filter(Boolean) as DocClause[]
  const codeRefs = clause.id ? (graph.index.codeRefs[clause.id] ?? []) : []
  const canFocus =
    clause.level === 3 && focusId !== null && clause.citesUp.includes(focusId)
  const body =
    canFocus && focused && focusId
      ? focusLines(clause.body, focusId)
      : stripLead(clause.body, clause.id)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2.5">
        {/* Opening a clause replaces the overview pane outright, so without
            this there is no way back to the drift list — the cascade above
            only ever swaps one detail for another. */}
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 h-7 gap-1 px-2 text-xs text-muted-foreground"
          onClick={onBack}
        >
          <RiArrowLeftLine className="size-3.5" />
          Overview
        </Button>
        <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          L{clause.level} · {LEVEL_NAMES[clause.level]}
        </span>
        {clause.id ? <IdChip id={clause.id} /> : null}
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {clause.title}
        </span>
        {badges.map((badge) => (
          <DriftBadgePill key={badge} badge={badge} />
        ))}
        <div className="ml-auto flex items-center gap-2">
          {canFocus ? (
            <Button
              variant={focused ? "secondary" : "ghost"}
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={onToggleFocus}
            >
              <RiFilter2Line className="size-3.5" />
              Only {focusId} lines
            </Button>
          ) : null}
          <a
            href={`${REPO_BLOB}${clause.source}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground hover:text-foreground"
          >
            {clause.source}
            <RiExternalLinkLine className="size-3" />
          </a>
        </div>
      </div>

      {/* The trace is the most-used control on this pane — it used to sit in a
          260px right rail, below the fold on narrow screens. It now runs
          directly under the title, where the reading order puts it
          (`L2-UI-39`). */}
      <div className="flex flex-none flex-col gap-1.5 border-b bg-muted/30 px-4 py-2.5">
        <TraceRow
          label={clause.level === 3 ? "Implements ↑" : "Implements (L1) ↑"}
          empty={
            clause.level === 1 ? "Top of the tree." : "No upward citation."
          }
          items={up}
          onPick={onPick}
        />
        <TraceRow
          label={clause.level === 1 ? "Contracts ↓" : "Notes ↓"}
          empty={
            clause.level === 3
              ? "Notes are the bottom level."
              : "Nothing cites this yet."
          }
          items={down}
          onPick={onPick}
        />
        <div className="flex items-center gap-2">
          <span className="w-28 flex-none text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Code (@spec)
            {codeRefs.length ? (
              <span className="ml-1 tabular-nums">({codeRefs.length})</span>
            ) : null}
          </span>
          {codeRefs.length ? (
            <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-0.5">
              {codeRefs.map((path) => (
                <a
                  key={path}
                  href={`${REPO_BLOB}${path}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-44 flex-none truncate rounded border bg-background px-1.5 py-0.5 text-right font-mono text-[11px] text-muted-foreground hover:text-foreground"
                  title={path}
                  dir="rtl"
                >
                  {path}
                </a>
              ))}
            </div>
          ) : (
            <span className="text-[11px] text-muted-foreground">
              {clause.level === 2
                ? BADGE_HELP["no-code"]
                : "Tags are carried by contract IDs."}
            </span>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 text-[13px] leading-relaxed">
        <Markdown>{body}</Markdown>
      </div>
    </div>
  )
}

/** One horizontal trace line: label, then clickable clause chips. */
function TraceRow({
  label,
  items,
  empty,
  onPick,
}: {
  label: string
  items: DocClause[]
  empty: string
  onPick: (key: string) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-28 flex-none text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
        {items.length ? (
          <span className="ml-1 tabular-nums">({items.length})</span>
        ) : null}
      </span>
      {items.length ? (
        <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-0.5">
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onPick(item.key)}
              className="flex w-44 flex-none items-center gap-1.5 rounded border bg-background px-1.5 py-0.5 text-left text-[11px] hover:border-primary/40"
              title={item.title}
            >
              {item.id ? (
                <span className="flex-none font-mono text-muted-foreground">
                  {item.id}
                </span>
              ) : null}
              <span className="truncate">{item.title}</span>
            </button>
          ))}
        </div>
      ) : (
        <span className="text-[11px] text-muted-foreground">{empty}</span>
      )}
    </div>
  )
}
