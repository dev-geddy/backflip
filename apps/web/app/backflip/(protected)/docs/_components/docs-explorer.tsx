"use client"

import { useEffect, useMemo, useState, useSyncExternalStore } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  RiArrowRightSLine,
  RiCloseLine,
  RiExternalLinkLine,
  RiSearchLine,
} from "@remixicon/react"

import {
  BADGE_HELP,
  BADGE_ORDER,
  buildGraph,
  childCount,
  constraintsOn,
  matchesQuery,
  severity,
  visibleColumns,
  type DocsGraph,
  type DriftBadge,
  type Selection,
} from "../_lib/docs-graph"
import type { DocClause, DocsIndex, DocLevel } from "../_lib/parse-docs"
import { ClauseDetail } from "./clause-detail"
import { DocsGuide } from "./docs-guide"
import { DriftBadgePill, IdChip } from "./drift-badge"

/**
 * Docs explorer: a three-level cascade (L1 Constitution | L2 Contracts |
 * L3 Notes) over a markdown reading pane. Selections filter in both directions
 * — an invariant narrows the contracts implementing it, a note narrows the
 * contracts it cites — and the domain chips constrain all three columns.
 *
 * Read-only by contract (`L2-UI-22`): nothing here writes to /docs.
 *
 * @spec L2-UI-20, L2-UI-22
 */
const COLUMN_META: { level: DocLevel; title: string; hint: string }[] = [
  { level: 1, title: "L1 · Constitution", hint: "why · invariants" },
  { level: 2, title: "L2 · Contracts", hint: "what · interfaces" },
  { level: 3, title: "L3 · Notes", hint: "how · volatile" },
]

const LEVEL_KEYS = { 1: "l1", 2: "l2", 3: "l3" } as const

export function DocsExplorer({ index }: { index: DocsIndex }) {
  const graph = useMemo(() => buildGraph(index), [index])
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  // Every navigable piece of state lives in the URL: back/forward work, a
  // reload keeps your place, and a clause can be linked to (`L2-UI-38`).
  const domain = params.get("domain")
  const detailKey = params.get("clause")
  const view = params.get("view") === "health" ? "health" : "guide"
  const query = params.get("q") ?? ""
  const selection: Selection = useMemo(
    () => ({
      l1: params.get("l1"),
      l2: params.get("l2"),
      l3: params.get("l3"),
    }),
    [params]
  )

  const [focused, setFocused] = useState(false)
  // The input is local so typing stays responsive; the URL catches up on a
  // short debounce, and `replace` keeps keystrokes out of session history.
  const [draft, setDraft] = useState(query)
  // Adjust during render rather than in an effect: back/forward changes `query`
  // externally and the input has to follow, without a second render pass.
  const [lastQuery, setLastQuery] = useState(query)
  if (query !== lastQuery) {
    setLastQuery(query)
    setDraft(query)
  }
  useEffect(() => {
    if (draft === query) return
    const id = setTimeout(() => navigate({ q: draft || null }, "replace"), 200)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft])

  function navigate(
    next: Record<string, string | null>,
    mode: "push" | "replace" = "push"
  ) {
    const sp = new URLSearchParams(params.toString())
    for (const [key, value] of Object.entries(next)) {
      if (value) sp.set(key, value)
      else sp.delete(key)
    }
    const qs = sp.toString()
    router[mode](qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  const columns = useMemo(() => {
    const cols = visibleColumns(graph, domain, selection)
    if (!query.trim()) return cols
    return {
      l1: cols.l1.filter((c) => matchesQuery(c, query)),
      l2: cols.l2.filter((c) => matchesQuery(c, query)),
      l3: cols.l3.filter((c) => matchesQuery(c, query)),
    }
  }, [graph, domain, selection, query])
  const detail = detailKey ? graph.byKey.get(detailKey) : null
  const focusId = selection.l2
    ? (graph.byKey.get(selection.l2)?.id ?? null)
    : null

  function pick(clause: DocClause) {
    const key = LEVEL_KEYS[clause.level]
    const deselect = selection[key] === clause.key
    navigate({
      [key]: deselect ? null : clause.key,
      clause: deselect ? null : clause.key,
    })
    setFocused(false)
  }

  /** Trace links in the detail pane jump without disturbing the cascade. */
  function jump(key: string) {
    navigate({ clause: key })
    setFocused(false)
  }

  function pickDomain(next: string | null) {
    // Contract/notes selections are domain-scoped; drop the ones that fell out.
    const keep = (key: string | null) => {
      const clause = key ? graph.byKey.get(key) : null
      return clause && (!next || clause.domain === next) ? key : null
    }
    const droppedDetail =
      detailKey && !keep(detailKey) && graph.byKey.get(detailKey)?.level !== 1
    navigate({
      domain: next,
      l2: keep(selection.l2),
      l3: keep(selection.l3),
      clause: droppedDetail ? null : detailKey,
    })
  }

  /** Drop one hop of the current trace from the breadcrumb. */
  function clearLevel(level: DocLevel) {
    const key = LEVEL_KEYS[level]
    navigate({
      [key]: null,
      clause: detailKey === selection[key] ? null : detailKey,
    })
  }

  // `detailKey` counts: a clause opened straight from the drift list sets no
  // selection, and without it Reset stayed hidden on the one screen that most
  // needed a way out.
  const trail = ([1, 2, 3] as DocLevel[])
    .map((level) => ({
      level,
      clause: graph.byKey.get(selection[LEVEL_KEYS[level]] ?? "") ?? null,
    }))
    .filter((hop) => hop.clause)

  const filtering =
    domain !== null ||
    selection.l1 ||
    selection.l2 ||
    selection.l3 ||
    detailKey !== null ||
    query !== ""

  return (
    <div className="flex h-[calc(100svh-var(--header-height))] min-h-0 flex-col bg-card">
      <header className="flex flex-wrap items-end justify-between gap-3 px-4 pt-4 pb-3 lg:px-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Docs</h1>
          <p className="text-sm text-muted-foreground">
            Constitution, contracts and notes as they sit in the repo. Pick any
            level to trace it up and down.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <RiSearchLine className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Search IDs, titles, text…"
              aria-label="Search docs"
              className="h-8 w-48 pl-7 text-xs sm:w-64"
            />
          </div>
          <a
            href="https://github.com/dev-geddy/backflip#readme"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            README
            <RiExternalLinkLine className="size-3.5" />
          </a>
        </div>
      </header>

      <OrientationStrip />

      <div className="flex min-h-0 flex-1 flex-col">
        {detail ? (
          <ClauseDetail
            clause={detail}
            graph={graph}
            focusId={focusId}
            focused={focused}
            onToggleFocus={() => setFocused((v) => !v)}
            onPick={jump}
            onBack={() => navigate({ clause: null })}
          />
        ) : (
          <>
            <div className="flex items-center gap-1 border-b px-4 py-1.5 lg:px-6">
              {(["guide", "health"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() =>
                    navigate({ view: tab === "guide" ? null : tab })
                  }
                  className={cn(
                    "rounded-md px-2 py-1 text-xs transition-colors",
                    view === tab
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab === "guide" ? "Guide" : "Health"}
                </button>
              ))}
            </div>
            {view === "guide" ? (
              <DocsGuide
                graph={graph}
                onOpenTrace={(keys) =>
                  navigate({ ...keys, clause: keys.l1, domain: null })
                }
              />
            ) : (
              <IndexSummary graph={graph} onPick={jump} />
            )}
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 border-t border-b px-4 pt-3 pb-3 lg:px-6">
        <Chip active={domain === null} onClick={() => pickDomain(null)}>
          All domains
        </Chip>
        {graph.index.domains.map((d) => (
          <Chip
            key={d.key}
            active={domain === d.key}
            onClick={() => pickDomain(domain === d.key ? null : d.key)}
          >
            {d.label}
            <span className="ml-1 tabular-nums opacity-60">{d.contracts}</span>
          </Chip>
        ))}
        {filtering ? (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-7 shrink-0 gap-1 text-xs text-muted-foreground"
            onClick={() =>
              navigate({
                domain: null,
                l1: null,
                l2: null,
                l3: null,
                clause: null,
                q: null,
              })
            }
          >
            <RiCloseLine className="size-3.5" />
            Reset
          </Button>
        ) : null}
      </div>

      {trail.length ? (
        <div className="flex flex-wrap items-center gap-1.5 border-b bg-muted/30 px-4 py-2 lg:px-6">
          <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Trace
          </span>
          {trail.map((hop, i) => (
            <span key={hop.level} className="flex items-center gap-1.5">
              {i > 0 ? (
                <RiArrowRightSLine
                  aria-hidden
                  className="size-3.5 text-muted-foreground"
                />
              ) : null}
              <span className="flex items-center gap-1 rounded-full border bg-background py-0.5 pr-1 pl-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => jump(hop.clause!.key)}
                  className="max-w-48 truncate hover:text-foreground"
                  title={hop.clause!.title}
                >
                  <span className="font-mono opacity-70">L{hop.level}</span>{" "}
                  {hop.clause!.id ?? hop.clause!.title}
                </button>
                <button
                  type="button"
                  onClick={() => clearLevel(hop.level)}
                  aria-label={`Remove L${hop.level} from the trace`}
                  className="rounded-full p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <RiCloseLine className="size-3" />
                </button>
              </span>
            </span>
          ))}
        </div>
      ) : null}

      <div className="grid min-h-0 shrink-0 grid-cols-1 md:h-[46%] md:grid-cols-3">
        {COLUMN_META.map((meta) => {
          const items = columns[LEVEL_KEYS[meta.level]]
          const selectedKey = selection[LEVEL_KEYS[meta.level]]
          return (
            <section
              key={meta.level}
              className="flex max-h-72 min-h-0 flex-col border-b bg-background md:max-h-none md:border-b-0 md:not-last:border-r"
            >
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 border-b px-3 py-2">
                <span className="text-[11px] font-medium tracking-wide uppercase">
                  {meta.title}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {meta.hint}
                </span>
                <span className="ml-auto text-[11px] text-muted-foreground tabular-nums">
                  {items.length}
                </span>
                {/* Says why this list shrank, instead of shrinking silently. */}
                {constraintsOn(meta.level, selection, graph.byKey).map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => clearLevel(c.level)}
                    className="flex w-full items-center gap-1 text-left text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    filtered by
                    <span className="truncate font-mono">{c.label}</span>
                    <RiCloseLine className="size-3 shrink-0" />
                  </button>
                ))}
              </div>
              <ul className="min-h-0 flex-1 overflow-y-auto">
                {items.map((clause) => (
                  <ClauseRow
                    key={clause.key}
                    clause={clause}
                    count={childCount(graph, clause, domain)}
                    badges={graph.badges.get(clause.key) ?? []}
                    selected={selectedKey === clause.key}
                    reading={detailKey === clause.key}
                    showDomain={meta.level !== 1 && domain === null}
                    onClick={() => pick(clause)}
                  />
                ))}
                {items.length === 0 ? (
                  <li className="px-3 py-6 text-center text-xs text-muted-foreground">
                    Nothing at this level for the current filter.
                  </li>
                ) : null}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-2.5 py-1 text-xs transition-colors",
        active
          ? "border-primary/30 bg-primary/10 text-foreground"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  )
}

function ClauseRow({
  clause,
  count,
  badges,
  selected,
  reading,
  showDomain,
  onClick,
}: {
  clause: DocClause
  count: number
  badges: DriftBadge[]
  selected: boolean
  reading: boolean
  showDomain: boolean
  onClick: () => void
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex w-full items-center gap-2 border-l-2 px-3 py-1.5 text-left text-[13px]",
          selected
            ? "border-l-primary bg-muted"
            : reading
              ? "border-l-transparent bg-muted/50"
              : "border-l-transparent hover:bg-muted/50"
        )}
      >
        {clause.id ? (
          <IdChip id={clause.id} className="shrink-0" />
        ) : (
          <span className="shrink-0 rounded border border-dashed px-1 py-px font-mono text-[10px] leading-4 text-muted-foreground">
            {showDomain ? clause.domain : "prose"}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate" title={clause.title}>
          {clause.title}
        </span>
        {badges.map((badge) => (
          <DriftBadgePill key={badge} badge={badge} />
        ))}
        {count > 0 ? (
          <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
            {count}
          </span>
        ) : null}
      </button>
    </li>
  )
}

/** Landing state: what the index knows, and where it is drifting. */
function IndexSummary({
  graph,
  onPick,
}: {
  graph: DocsGraph
  onPick: (key: string) => void
}) {
  const { clauses, codeRefs, brokenRefs } = graph.index
  const counted = (level: DocLevel) =>
    clauses.filter((c) => c.level === level).length
  const drifting = clauses
    .filter((c) => graph.badges.has(c.key))
    .sort(
      (a, b) =>
        severity(graph.badges.get(a.key) ?? []) -
        severity(graph.badges.get(b.key) ?? [])
    )
  // Every badge is listed, zeros included: the block doubles as the key to
  // the pills on the rows below, and "orphan 0" is worth seeing.
  const tally = BADGE_ORDER.map((badge) => ({
    badge,
    count: drifting.filter((c) => graph.badges.get(c.key)?.includes(badge))
      .length,
  }))
  const tagged = Object.keys(codeRefs).length

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 lg:px-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Constitution" value={counted(1)} hint="L1 clauses" />
        <Stat label="Contracts" value={counted(2)} hint="L2 clauses" />
        <Stat label="Notes" value={counted(3)} hint="L3 sections" />
        <Stat label="Spec-tagged IDs" value={tagged} hint="found in code" />
      </div>

      <div className="mt-5 mb-3">
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          Drift ({drifting.length})
        </p>
        <ul className="mt-2 flex flex-col gap-1">
          {tally.map((t) => (
            <li
              key={t.badge}
              className={cn(
                "flex items-baseline gap-2 text-[11px] leading-5",
                t.count === 0 && "opacity-45"
              )}
            >
              <DriftBadgePill badge={t.badge} className="self-center" />
              <span className="w-6 flex-none text-right font-medium tabular-nums">
                {t.count}
              </span>
              <span className="min-w-0 text-muted-foreground">
                {BADGE_HELP[t.badge]}
              </span>
            </li>
          ))}
        </ul>
      </div>
      {brokenRefs.length ? (
        <p className="mb-2 text-xs text-muted-foreground">
          Cited but never defined:{" "}
          {brokenRefs.map((id) => (
            <IdChip key={id} id={id} className="mr-1" />
          ))}
        </p>
      ) : null}
      <ul className="divide-y rounded-lg border">
        {drifting.slice(0, 40).map((clause) => (
          <li key={clause.key}>
            <button
              type="button"
              onClick={() => onPick(clause.key)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] hover:bg-muted/50"
            >
              {clause.id ? <IdChip id={clause.id} /> : null}
              <span className="min-w-0 flex-1 truncate">{clause.title}</span>
              {(graph.badges.get(clause.key) ?? []).map((badge) => (
                <DriftBadgePill key={badge} badge={badge} />
              ))}
            </button>
          </li>
        ))}
      </ul>
      {drifting.length > 40 ? (
        <p className="mt-2 text-[11px] text-muted-foreground">
          + {drifting.length - 40} more — filter by domain to narrow.
        </p>
      ) : null}
    </div>
  )
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string
  value: number
  hint: string
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-[11px] text-muted-foreground">{hint}</p>
    </div>
  )
}

const ORIENTATION_KEY = "backflip.docs.orientation"

/**
 * `localStorage` as an external store, so the strip reads its state during
 * render instead of flipping it in an effect. Server snapshot is "not
 * dismissed" — the strip is the safe default for anyone the store can't
 * answer for.
 */
const orientationStore = {
  listeners: new Set<() => void>(),
  subscribe(listener: () => void) {
    orientationStore.listeners.add(listener)
    return () => orientationStore.listeners.delete(listener)
  },
  dismissed() {
    try {
      return window.localStorage.getItem(ORIENTATION_KEY) === "dismissed"
    } catch {
      // A browser refusing storage just means the strip returns next visit.
      return false
    }
  },
  dismiss() {
    try {
      window.localStorage.setItem(ORIENTATION_KEY, "dismissed")
    } catch {
      // Ignored for the same reason.
    }
    for (const listener of orientationStore.listeners) listener()
  },
}

function OrientationStrip() {
  const dismissed = useSyncExternalStore(
    orientationStore.subscribe,
    orientationStore.dismissed,
    () => false
  )

  if (dismissed) return null

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b bg-muted/40 px-4 py-2 text-[11px] lg:px-6">
      {[
        { level: 1, name: "Constitution", question: "why" },
        { level: 2, name: "Contracts", question: "what" },
        { level: 3, name: "Notes", question: "how" },
      ].map((l, i) => (
        <span key={l.level} className="flex items-center gap-1.5">
          {i > 0 ? (
            <RiArrowRightSLine
              aria-hidden
              className="size-3.5 text-muted-foreground"
            />
          ) : null}
          <span className="rounded bg-background px-1.5 py-px font-mono font-medium">
            L{l.level}
          </span>
          <span>{l.name}</span>
          <span className="text-muted-foreground">· {l.question}</span>
        </span>
      ))}
      <span className="text-muted-foreground">
        — notes cite contracts, contracts cite the constitution. Never the other
        way. On conflict L1 &gt; L2 &gt; L3.
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={orientationStore.dismiss}
        className="ml-auto h-6 px-1.5 text-[11px] text-muted-foreground"
      >
        Got it
      </Button>
    </div>
  )
}
