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