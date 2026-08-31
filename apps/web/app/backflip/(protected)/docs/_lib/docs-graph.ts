import type { DocClause, DocLevel, DocsIndex } from "./parse-docs"

/**
 * Client-safe derivations over the docs index: cite edges in both directions,
 * the cascade's visible sets, and the drift badges. Pure — the route hands the
 * index to the explorer and everything below is computed from it.
 *
 * @spec L2-UI-23
 */

export type DriftBadge = "orphan" | "no-code" | "needs-confirm" | "broken-ref"

export type DocsGraph = {
  index: DocsIndex
  byKey: Map<string, DocClause>
  byId: Map<string, DocClause>
  /** L1 ID → L2 clauses implementing it. */
  implementers: Map<string, DocClause[]>
  /** L2 ID → L3 sections citing it. */
  notes: Map<string, DocClause[]>
  /** L3 clause key → L1 IDs reached through its L2 citations. */
  l1OfNote: Map<string, string[]>
  badges: Map<string, DriftBadge[]>
}

export function buildGraph(index: DocsIndex): DocsGraph {
  const byKey = new Map(index.clauses.map((c) => [c.key, c]))
  const byId = new Map(index.clauses.filter((c) => c.id).map((c) => [c.id!, c]))

  const implementers = new Map<string, DocClause[]>()
  const notes = new Map<string, DocClause[]>()
  const l1OfNote = new Map<string, string[]>()

  for (const clause of index.clauses) {
    if (clause.level === 2) {
      for (const l1 of clause.citesUp) push(implementers, l1, clause)
    }
    if (clause.level === 3) {
      const reached = new Set<string>()
      for (const l2 of clause.citesUp) {
        push(notes, l2, clause)
        for (const l1 of byId.get(l2)?.citesUp ?? []) reached.add(l1)
      }
      l1OfNote.set(clause.key, [...reached])
    }
  }

  const broken = new Set(index.brokenRefs)
  const badges = new Map<string, DriftBadge[]>()
  for (const clause of index.clauses) {
    const list: DriftBadge[] = []
    if (clause.needsConfirm) list.push("needs-confirm")
    if (clause.id) {
      // Both L2 signals are scoped to interface/schema clauses: notes record
      // how an interface is built, not that an invariant still holds.
      if (clause.level === 2 && carriesCode(clause)) {
        if (!notes.has(clause.id)) list.push("orphan")
        if (!index.codeRefs[clause.id]) list.push("no-code")
      }
      if (clause.level === 1 && !implementers.has(clause.id))
        list.push("orphan")
    }
    if ([...clause.citesUp, ...clause.dependsOn].some((id) => broken.has(id))) {
      list.push("broken-ref")
    }
    if (list.length) badges.set(clause.key, list)
  }

  return { index, byKey, byId, implementers, notes, l1OfNote, badges }
}

/**
 * Only interface/schema clauses are expected to name an owning module — the
 * doc rules say not to force `@spec` onto pure invariant/error/acceptance IDs,
 * so flagging those as untagged would be noise, not drift.
 */
const CODE_SECTIONS = new Set(["Owns", "Interfaces", "Schemas"])
const KIND_TAG = /_\((iface|schema|inv|err|accept)\)_/

function carriesCode(clause: DocClause): boolean {
  const kind = KIND_TAG.exec(clause.body)?.[1]
  if (kind) return kind === "iface" || kind === "schema"
  return CODE_SECTIONS.has(clause.section)
}

function push<T>(map: Map<string, T[]>, key: string, value: T) {
  const list = map.get(key)
  if (list) list.push(value)
  else map.set(key, [value])
}

export type Selection = {
  l1: string | null
  l2: string | null
  l3: string | null
}

export const NO_SELECTION: Selection = { l1: null, l2: null, l3: null }

export type Columns = {
  l1: DocClause[]
  l2: DocClause[]
  l3: DocClause[]
}

/**
 * The cascade. Every selection constrains the other two columns — pick an L1
 * and contracts narrow to its implementers; pick a note and the columns above
 * narrow to what it cites. Domain chips constrain all three at once (L1 stays
 * cross-cutting: it narrows to the clauses that domain's contracts implement).
 */
export function visibleColumns(
  graph: DocsGraph,
  domain: string | null,
  selection: Selection
): Columns {
  const { index, byKey, byId } = graph
  const all = index.clauses
  const inDomain = (c: DocClause) => !domain || c.domain === domain

  const selectedL1 = selection.l1 ? byKey.get(selection.l1) : null
  const selectedL2 = selection.l2 ? byKey.get(selection.l2) : null
  const selectedL3 = selection.l3 ? byKey.get(selection.l3) : null

  const l2 = all.filter((c) => {
    if (c.level !== 2 || !inDomain(c)) return false
    if (selectedL1?.id && !c.citesUp.includes(selectedL1.id)) return false
    if (selectedL3 && !(c.id && selectedL3.citesUp.includes(c.id))) return false
    return true
  })

  const l3 = all.filter((c) => {
    if (c.level !== 3 || !inDomain(c)) return false
    if (selectedL2?.id && !c.citesUp.includes(selectedL2.id)) return false
    if (
      selectedL1?.id &&
      !(graph.l1OfNote.get(c.key) ?? []).includes(selectedL1.id)
    ) {
      return false
    }
    return true
  })

  // L1 has no domain of its own: when a domain (or a lower selection) is
  // active, show the invariants that domain's contracts actually implement.
  const reachableL1 = new Set(
    l2.flatMap((c) => c.citesUp).filter((id) => byId.has(id))
  )
  const constrainL1 = Boolean(domain || selectedL2 || selectedL3)
  const l1 = all.filter((c) => {
    if (c.level !== 1) return false
    if (selectedL2?.id && !(c.id && selectedL2.citesUp.includes(c.id))) {
      return false
    }
    if (!constrainL1) return true
    return c.id ? reachableL1.has(c.id) : false
  })

  return { l1, l2, l3 }
}

/** Rows show how many clauses one level down hang off them. */
export function childCount(
  graph: DocsGraph,
  clause: DocClause,
  domain: string | null
): number {
  const inDomain = (c: DocClause) => !domain || c.domain === domain
  if (clause.level === 1 && clause.id) {
    return (graph.implementers.get(clause.id) ?? []).filter(inDomain).length
  }
  if (clause.level === 2 && clause.id) {
    return (graph.notes.get(clause.id) ?? []).length
  }
  if (clause.level === 3) return clause.citesUp.length
  return 0
}

/** Worst first, so the landing list leads with what actually needs a human. */
export const BADGE_ORDER: DriftBadge[] = [
  "broken-ref",
  "needs-confirm",
  "orphan",
  "no-code",
]

export function severity(badges: DriftBadge[]): number {
  return Math.min(
    ...badges.map((b) => BADGE_ORDER.indexOf(b)),
    BADGE_ORDER.length
  )
}

export const BADGE_LABELS: Record<DriftBadge, string> = {
  orphan: "orphan",
  "no-code": "no code",
  "needs-confirm": "needs confirm",
  "broken-ref": "broken ref",
}

export const BADGE_HELP: Record<DriftBadge, string> = {
  orphan: "No L3 note cites this ID — nothing records how it is built.",
  "no-code":
    "No file carries an @spec tag for this ID — untagged, or not built yet.",
  "needs-confirm":
    "Marked [NEEDS HUMAN CONFIRMATION] — a human must confirm or rewrite it.",
  "broken-ref": "Cites an ID that no doc defines.",
}

/**
 * Free-text match over a clause: ID, title and body. Cheap `includes` on a
 * lowercased haystack — the whole index is ~450 clauses, so anything smarter
 * would cost more to maintain than it saves.
 *
 * @spec L2-UI-35
 */
export function matchesQuery(clause: DocClause, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (
    (clause.id ?? "").toLowerCase().includes(q) ||
    clause.title.toLowerCase().includes(q) ||
    clause.body.toLowerCase().includes(q) ||
    clause.domain.toLowerCase().includes(q)
  )
}

/**
 * What is currently narrowing one column — the other levels' selections, named
 * so a column header can say why its list shrank instead of shrinking silently.
 *
 * @spec L2-UI-36
 */
export function constraintsOn(
  level: DocLevel,
  selection: Selection,
  byKey: Map<string, DocClause>
): { key: string; level: DocLevel; label: string }[] {
  const out: { key: string; level: DocLevel; label: string }[] = []
  for (const [lvl, key] of [
    [1, selection.l1],
    [2, selection.l2],
    [3, selection.l3],
  ] as const) {
    if (!key || lvl === level) continue
    const clause = byKey.get(key)
    if (!clause) continue
    out.push({ key, level: lvl, label: clause.id ?? clause.title })
  }
  return out
}

/**
 * One complete L1 → L2 → L3 chain, picked from the index, for the Guide to
 * demonstrate the citation model with real clauses rather than prose.
 *
 * Chosen by richness, not by hand: the L1 clause with the most implementing
 * contracts, then that contract with the most notes citing it. Deterministic
 * for a given index, and it cannot name a clause the repo no longer has.
 *
 * @spec L2-UI-40
 */
const GENERIC_NOTES = new Set([
  "File map",
  "State",
  "TODO",
  "Notes / deviations",
  "Gotchas",
  "ADR",
])

export function exampleTrace(
  graph: DocsGraph
): { l1: DocClause; l2: DocClause; l3: DocClause } | null {
  const l1s = graph.index.clauses
    .filter((c) => c.level === 1 && c.id && graph.implementers.has(c.id))
    .sort(
      (a, b) =>
        (graph.implementers.get(b.id!)?.length ?? 0) -
          (graph.implementers.get(a.id!)?.length ?? 0) ||
        a.id!.localeCompare(b.id!)
    )

  for (const l1 of l1s) {
    const contracts = [...(graph.implementers.get(l1.id!) ?? [])]
      .filter((c) => c.id && graph.notes.has(c.id))
      .sort(
        (a, b) =>
          (graph.notes.get(b.id!)?.length ?? 0) -
            (graph.notes.get(a.id!)?.length ?? 0) || a.id!.localeCompare(b.id!)
      )
    const l2 = contracts[0]
    // Prefer a note section whose heading says something — every domain has a
    // "File map", and it makes a poor demonstration of what notes are for.
    const l3 = l2?.id
      ? [...(graph.notes.get(l2.id) ?? [])].sort(
          (a, b) =>
            Number(GENERIC_NOTES.has(a.title)) -
            Number(GENERIC_NOTES.has(b.title))
        )[0]
      : undefined
    if (l2 && l3) return { l1, l2, l3 }
  }
  return null
}
