# Project

## Documentation discipline
This repo uses a **three-level doc system**: L1 Constitution (`/docs/constitution.md`, why/invariants), L2 Contracts (`/docs/contracts/<domain>.md`, what/interfaces), L3 Notes (`/docs/notes/`, how/volatile).

Rules: cite upward only (L3→L2→L1, by stable ID); conflict order L1>L2>L3; promote up by human decision, regenerate down automatically.

**Every code change loads the `docs-sync` skill and maintains docs as part of the change** — not just reads them:
- Before: read L1 + touched L2.
- During/after: update L3 live; new feature → update/propose L2; new domain → new L2 + L3; deleted code → prune docs.
- **Halt for approval on any L2 change** (never edit L1).
- Not done until docs current — no code lands with stale docs.

If `/docs/constitution.md` missing, run skill Bootstrap first.

## Code placement (colocation)
Non-route code — components, hooks, utils, contexts, etc. — goes in **underscore-prefixed dirs**: `_components`, `_hooks`, `_utils`, `_contexts`, `_lib`, … (underscore = Next.js private folder, excluded from routing).

Colocate by **scope proximity**:
- App-wide → `app/_components/…` (in the app's `app/` root).
- Layout-scoped → in that layout's dir.
- Page-scoped → in that page's dir.
- Cross-app / shared → `packages/*`.

Invariants: `L1-ARCH-07`, `L1-ARCH-08`.