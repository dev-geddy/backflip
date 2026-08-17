# Notes (L3) — mcp

> L3 = how / volatile. AI writes free. Cites L2 IDs up. Matches code as-is.

## What this is
A Claude-compatible **remote MCP connector**: a read-only tool surface at `/api/mcp` (Streamable HTTP, `L2-MCP-01`) protected by an in-app **OAuth 2.1 authorization server** (`/api/oauth/*` + `/.well-known/*`, `L2-MCP-10`–`L2-MCP-17`). Lets a Claude client (claude.ai custom connector, Claude Desktop, Claude Code) authenticate as a Backflip admin user and call a handful of dashboard/user/settings-read tools, scoped to that user's role. No write tools in this phase (`L2-MCP-09`).

Whole domain is opt-in and off by default: `MCP_ENABLED` unset → every connector route 404s (`L2-MCP-37`, `L2-INF-17`).

## File map
Everything below exists on disk — the domain landed in one change (schema + migration `0009`, OAuth server, MCP endpoint + tools, consent + account UI, edge config).

- `apps/web/app/api/mcp/route.ts` — the MCP endpoint. `POST` = JSON-RPC over Streamable HTTP; `GET`/`DELETE` answered by the SDK handler. Stateless: a fresh `McpServer` per request (no MCP session id) — simplest match for Next's request-scoped model. `runtime="nodejs"` (needs `pg`). Satisfies `L2-MCP-01`.
- `apps/web/app/_lib/mcp/server.ts` — `buildMcpServer(ctx: McpAuthContext)` factory. Registers only the tools in the scopes ∩ capability intersection (`L2-MCP-02`, `L2-MCP-20`) — an unauthorized tool is never registered, so it can't appear in `tools/list` or be called.
- `apps/web/app/_lib/mcp/tools/*.ts` — one file per tool: `whoami`, `list_users`, `get_user`, `get_platform_status`, `get_dashboard_summary` (`L2-MCP-04`–`L2-MCP-08`). Each declares `{readOnlyHint:true, destructiveHint:false, openWorldHint:false}` (`L2-MCP-09`).
- `apps/web/app/_lib/oauth/types.ts` — Shared types: `MCP_SCOPES` (`L2-MCP-18`), `McpAuthContext` (`L2-MCP-19`), `OAuthGrant`, `AuthorizationRequest`, `OAuthErrorCode`/`OAuthFailure`, `IssuedTokens`. Pure, no runtime deps — safe from routes, libs, tools, tests. `@spec L2-MCP-18, L2-MCP-19`.
- `apps/web/app/_lib/oauth/config.ts` — `MCP_ENABLED` read, issuer/resource URL derivation from `AUTH_URL`, token/code TTL constants (`L2-MCP-24`, `L2-MCP-25`).
- `apps/web/app/_lib/oauth/scopes.ts` — scope ↔ capability identity (`L2-MCP-18`) plus human-readable labels for the consent screen (`L2-MCP-14`).
- `apps/web/app/_lib/oauth/clients.ts` — DCR registration (`L2-MCP-12`) and exact-match redirect-URI validation (`L2-MCP-31`).
- `apps/web/app/_lib/oauth/codes.ts` — authorization-code issue/consume, PKCE `S256` check (`L2-MCP-26`), single-use + 60 s TTL (`L2-MCP-22`, `L2-MCP-32`).
- `apps/web/app/_lib/oauth/tokens.ts` — access/refresh issue, rotation with reuse detection (`L2-MCP-27`), revocation, per-user grant listing for the account UI (`L2-MCP-17`).
- `apps/web/app/_lib/oauth/bearer.ts` — `requireBearer(request)` → `McpAuthContext | Response`. Resolves the live role from the DB (`L2-MCP-19`), checks `userTokenVersion` against `user.tokenVersion` (`L2-MCP-29`) and `resource` audience (`L2-MCP-33`). Failure → `401` + `WWW-Authenticate` (`L2-MCP-03`, `L2-MCP-39`).
- `apps/web/app/_lib/oauth/authorize.ts` — `/authorize` request validation: client + redirect URI first, then PKCE params, before any redirect happens (`L2-MCP-13`, `L2-MCP-31`).
- `apps/web/app/_lib/oauth/errors.ts` — RFC 6749 error shaping — redirect-with-error vs on-origin error page vs token-endpoint `400` body (`L2-MCP-40`, `L2-MCP-41`).
- `apps/web/app/_lib/oauth/limits.ts` — in-process rate limiters (register/token/mcp) + `clientIp` helper (`L2-MCP-30`).
- `apps/web/app/api/oauth/register/route.ts` — `POST`, DCR (`L2-MCP-12`).
- `apps/web/app/api/oauth/token/route.ts` — `POST`, form-encoded only, `authorization_code` + `refresh_token` grants (`L2-MCP-15`).
- `apps/web/app/api/oauth/revoke/route.ts` — `POST`, RFC 7009 (`L2-MCP-16`).
- `apps/web/app/api/oauth/authorize/route.ts` — `GET`, hands off to consent (`L2-MCP-13`).
- `apps/web/app/api/oauth/authorization-server-metadata/route.ts` — RFC 8414 metadata (`L2-MCP-10`).
- `apps/web/app/api/oauth/protected-resource-metadata/route.ts` — RFC 9728 metadata (`L2-MCP-11`).
- `apps/web/next.config.ts` — `rewrites()` maps `/.well-known/oauth-authorization-server` and `/.well-known/oauth-protected-resource` (bare **and** `/:path*`-suffixed, so the `/api/mcp` form resolves) onto the two metadata routes above. The App Router does not route dot-prefixed folders, so the documents cannot live at `app/.well-known/…` — this rewrite is the reason the well-known URLs work.
- `apps/web/app/backflip/(protected)/connect/` — consent screen + `_actions.ts` (`approveAuthorization`, `denyAuthorization`) (`L2-MCP-14`).
- `apps/web/app/backflip/(protected)/account/_components/connections-section.tsx` — connected-clients list + Disconnect, on the existing self-service account page (`account/_actions.ts` already hosts `saveProfile`/`changePassword`/email-change per `L2-AUTH-27` — this adds a grants section alongside; capability `account`, `L2-MCP-17`).
- `packages/db/src/schema.ts` — new tables `oauth_client`, `oauth_auth_code`, `oauth_token` (`L2-MCP-21`/`L2-MCP-22`/`L2-MCP-23`, `db` counterparts `L2-DB-25`/`L2-DB-26`/`L2-DB-27`).

## Running it locally
1. `MCP_ENABLED=true` in root `.env.local` (default is off, `L2-MCP-25`, `L2-INF-17`) — without it every route in this domain 404s, including the well-known documents, so a "connector not found" symptom is usually just this flag.
2. `AUTH_URL` must be the origin the Claude client will actually hit — it's both the Auth.js issuer/canonical-URL var (`L2-AUTH-07`) and the OAuth `issuer`/PRM `resource` origin (`L2-MCP-10`, `L2-MCP-11`, `L2-MCP-25`). A mismatch between what's advertised and what's called breaks the resource-audience check (`L2-MCP-33`).
3. `corepack yarn dev` (app on 3070, `L2-INF-03`) or the docker `web` profile (3071, `L2-INF-01`) — db must be up either way.
4. `db:migrate` to create `oauth_client`/`oauth_auth_code`/`oauth_token` (migration `0009`, `L2-DB-08`). Locally `AUTH_URL` may be left unset — `issuerOrigin()` falls back to `http://localhost:3070` outside production.
5. Sanity check without a Claude client: `curl <origin>/.well-known/oauth-authorization-server` and `.../.well-known/oauth-protected-resource` should return metadata (not 404) once `MCP_ENABLED=true`.

## Adding it to Claude
Claude's custom-connector UI needs a **publicly reachable https origin** — plain `localhost` doesn't work for claude.ai (Claude Desktop/Code may differ; verify per client). For local testing, tunnel 3070/3071 (ngrok, cloudflared, etc.) and point `AUTH_URL` at the tunnel's https URL *before* starting the app, since the issuer identity is baked into every token's `resource` claim (`L2-MCP-33`).

1. claude.ai → Settings → Connectors → Add custom connector → `https://<origin>/api/mcp`.
2. Claude reads `WWW-Authenticate` off an unauthenticated probe (`L2-MCP-03`), fetches the protected-resource + authorization-server metadata (`L2-MCP-10`, `L2-MCP-11`), then DCRs itself via `POST /api/oauth/register` (`L2-MCP-12`).
3. Claude opens `/api/oauth/authorize` in a browser tab. No Backflip session → redirected to `/backflip/login?from=…` (`L2-MCP-13`, the standard `/backflip` gate, `L2-AUTH-01`).
4. After login, lands on `/backflip/connect` — consent screen: client name, requested scopes in plain language, the signed-in account, Allow/Deny (`L2-MCP-14`).
5. Allow → `approveAuthorization` mints a single-use authorization code, redirects back to Claude's `redirect_uri` (`L2-MCP-32`).
6. Claude exchanges the code at `/api/oauth/token` with its PKCE `code_verifier` (`L2-MCP-15`, `L2-MCP-26`) → access + refresh token pair (`L2-MCP-24` lifetimes).
7. Every `/api/mcp` call carries `Authorization: Bearer <access_token>`; `requireBearer` validates it and resolves `McpAuthContext` live (`L2-MCP-03`, `L2-MCP-19`).
8. `tools/list` returns exactly the tools in scopes ∩ role-capability (`L2-MCP-20`) — acceptance case `L2-MCP-42`/`L2-MCP-43`.

## OAuth flow at a glance
`register → authorize → consent → code → token → bearer → tools`

| Step | Endpoint / actor | Key IDs |
|---|---|---|
| register | `POST /api/oauth/register` (DCR, open but rate-limited) | `L2-MCP-12`, `L2-MCP-30` |
| authorize | `GET /api/oauth/authorize` (client + redirect-URI + PKCE validated before any redirect) | `L2-MCP-13`, `L2-MCP-26`, `L2-MCP-31` |
| consent | `/backflip/connect` (Allow/Deny, inside the `/backflip` auth gate) | `L2-MCP-14` |
| code | single-use auth code, 60 s TTL, hash-only stored | `L2-MCP-22`, `L2-MCP-28`, `L2-MCP-32` |
| token | `POST /api/oauth/token` (form-encoded, PKCE verifier, `no-store`) | `L2-MCP-15`, `L2-MCP-24` |
| bearer | `Authorization: Bearer …` on every `/api/mcp` call | `L2-MCP-03`, `L2-MCP-29`, `L2-MCP-33` |
| tools | `tools/list`/`tools/call` filtered by scope ∩ capability | `L2-MCP-20`, `L2-MCP-34` |

Refresh follows the same `token` endpoint with `grant_type=refresh_token`; rotation + reuse detection apply (`L2-MCP-27`).

## Scope ↔ capability ↔ tool mapping
Scopes ARE capabilities (`L2-MCP-18`) — there's no separate connector permission model. A scope is only ever offered on the consent screen if the signed-in user's role already holds that capability (`L2-AUTH-21`).

| Scope (= capability) | Tool(s) gated | Roles that can grant it |
|---|---|---|
| `account` | `whoami` | owner, admin, teammate |
| `dashboard` | `get_dashboard_summary` | owner, admin, teammate |
| `users.view` | `list_users`, `get_user` | owner, admin |
| `settings` | `get_platform_status` | owner |

`users.edit` is deliberately never in `MCP_SCOPES` — no write tools in this phase (`L2-MCP-18`).

## Adding a new tool
1. New file under `apps/web/app/_lib/mcp/tools/`. Pick its scope from the *existing* `MCP_SCOPES` — introducing a brand-new grantable scope means editing `MCP_SCOPES` (`oauth/types.ts`) and confirming it maps 1:1 onto an existing `Capability` (`L2-AUTH-19`); a scope that isn't a capability breaks the `L2-MCP-18` identity.
2. Keep `readOnlyHint:true, destructiveHint:false, openWorldHint:false` unless this phase's read-only constraint (`L2-MCP-09`) is being lifted by a human decision — that's an L1/L2-level call, not a code call.
3. Bound any list result (`limit` ≤ 100, default 25) — `L2-MCP-36`.
4. Never return secrets — no `passwordHash`, `apiKeyEnc`, token hashes, or `tokenVersion` (`L2-MCP-35`).
5. Register it in `server.ts`'s `buildMcpServer` gated by the scope ∩ capability check (`L2-MCP-20`); don't hand-roll a second gate.
6. Tag the tool module `@spec L2-MCP-<NN>` — but a *new* tool is a new interface, which is an **L2 change**: propose the `mcp.md` diff (new `L2-MCP-*` iface ID) and get it approved before the ID exists to tag against (per `docs-sync`, halt-on-L2-change).
7. Update this file's tool list + the scope/tool table above.

## Gotchas
- **`MCP_ENABLED` off looks like the feature doesn't exist, not like an auth error** — every route including the well-known documents 404s (`L2-MCP-37`). Check this first before debugging OAuth.
- **Stateless MCP server**: a fresh `McpServer` is built per request, no session id (`L2-MCP-01`) — don't reach for server-side conversation state across calls.
- **Redirect URI matching is exact-string**, no prefix/wildcard, `https` required except `localhost`/`127.0.0.1` (`L2-MCP-31`). A mismatch never redirects to the bad URI — the error renders on our own origin, so it can look like the flow silently stalled rather than errored.
- **Refresh rotation is all-or-nothing**: reusing an already-rotated or revoked refresh token kills the *entire* token family, access included (`L2-MCP-27`). Two racing refreshes (e.g. a client retry) can look like a spurious full logout.
- **Role is live, not frozen**: `McpAuthContext.role` is read from the DB on every call (`L2-MCP-19`); a demotion takes effect on the very next tool call even though the access token itself is still cryptographically valid (`L2-MCP-34`). This differs from a typical "token = fixed grant" mental model.
- **Unauthorized ≠ rejected, it's invisible**: a tool outside scope ∩ capability isn't registered at all (`L2-MCP-20`) — it's simply absent from `tools/list`. "Why can't Claude see my tool" is almost always this intersection, not a bug.
- **In-process rate limiters don't survive multi-instance** deployment (`L2-MCP-30`) — same caveat as the login throttle (`L2-AUTH-40`); a horizontally scaled deployment needs a shared store.
- **Local testing needs a public https tunnel** for the Claude client, and `AUTH_URL` must match the tunnel's origin *before* the app starts, or the resource-audience check rejects every token (`L2-MCP-33`).
- **Adding a tool or scope is an L2 change**, not a drop-in code change — see "Adding a new tool" above.

## State
Implemented end to end. On disk: the three tables + migration `0009_curious_rumiko_fujikawa.sql` (applied locally), the full `_lib/oauth/*` module set, the six `/api/oauth/*` route handlers, the `.well-known` rewrites in `next.config.ts`, `/api/mcp` + `_lib/mcp/*` with five read-only tools, `/backflip/connect`, the account connections section, and the nginx/Caddy edge config.

The L2 contract (`docs/contracts/mcp.md`) and the `db`/`auth`/`devops`/`infra` additions are still status **PROPOSED** — they need human approval, per `L1-CON-04`.

### Unit tests
Colocated vitest, no database — pure logic is factored out so it is testable without postgres:
- `_lib/oauth/*.test.ts` — PKCE `S256` verification, scope parsing + `grantableScopes`, redirect-URI validation and exact matching, authorize-request validation, RFC 6749 error shaping, metadata-document shape + issuer/resource/PRM agreement.
- `_lib/mcp/tools/*.test.ts` — the scope ∩ capability tool-visibility filter, `list_users` bounds/defaults, the `get_user` exactly-one-selector rule, and serializer shape tests proving `apiKeyEnc` never reaches a tool result.

### Deviations from the contract worth knowing
- `consumeAuthorizationCode` also returns `familyId` (the auth-code row's `id` doubles as the token family root, so a replayed code revokes exactly the tokens minted from it — `L2-MCP-32`).
- `issueTokenPair` re-narrows scopes against the user's live role at issue time, so the granted `scope` can be narrower than requested (`L2-MCP-34` applied at issue as well as at use).
- `OAuthErrorCode` has no `unsupported_response_type`/`invalid_target`, so a non-`code` `response_type` and a wrong `resource` both surface as `invalid_request`.
- `/api/oauth/revoke` is deliberately not rate-limited: the response is constant for known and unknown tokens (no oracle), and sharing the token bucket would throttle legitimate refreshes.
- DCR errors use the RFC 7591 vocabulary (`invalid_redirect_uri`, `invalid_client_metadata`), not the RFC 6749 set.
- `redirect_uri` is mandatory at authorize — no "single registered URI" fallback. Smaller attack surface; Claude always sends it.
- `issuerOrigin()` falls back to `http://localhost:3070` when `AUTH_URL` is unset outside production, and throws in production. Every URL (issuer, resource, PRM, the audience check) derives from that one helper so they cannot disagree.

### Security review — what was found and what remains
An adversarial review ran over the whole domain before it landed. Fixed in place:
- **Forged `X-Forwarded-For` bypassed every per-IP limit.** Both edge flavours *append* the peer they observed, so the first hop is attacker-controlled; the app read it. Now reads the **last** hop (`_lib/oauth/limits.ts`, and the same defect fixed in the login throttle, `_lib/auth/index.ts` / `L2-AUTH-40`). Assumes exactly one trusted proxy — an added CDN layer collapses all callers onto one bucket, which fails closed, never open.
- **The kill switch didn't cover the consent server actions.** A server action is directly POST-invocable by its action id and does not inherit the page's `notFound()`. With `MCP_ENABLED` off, an authenticated user could still mint an authorization code. All three actions now assert `requireConnectorEnabled()` first (`L2-MCP-37`).
- **The logged-out handshake dead-ended.** `proxy.ts` put only `pathname` in `from`, dropping the entire authorize request; after login the consent page rendered a fatal "Missing client_id". Now carries the query string (`L2-MCP-42`).
- **Token-family resurrection race** — a `revokeGrant` landing between the rotation CAS and the insert left the new pair un-revoked, so Disconnect could be survived. Mitigated by a post-issue re-check that kills the fresh pair and fails closed. Note this is a *narrowed* window, not a lock: closing it fully needs `SELECT … FOR UPDATE` on the family.
- **Client-existence oracle on the token endpoint** — an unsupported `grant_type` now answers identically whether or not the `client_id` exists (`L2-MCP-41`).

Accepted, not defects:
- `/api/oauth/authorize` is an unauthenticated redirector to any registered `redirect_uri`, and DCR is open by design — so anyone can register `https://evil.example` and get a redirect off this domain. RFC 6749 §4.1.2.1 behaviour, shared by every OAuth AS; worth knowing as a phishing primitive on your domain.
- Clickjacking is already covered — `next.config.ts` applies `X-Frame-Options: DENY` + CSP `frame-ancestors 'none'` to `/:path*`, which includes `/backflip/connect`.
- Consent CSRF is covered by Next's server-action origin check; nginx passes `Host` and sets no `X-Forwarded-Host`.

## TODO
- Get the `mcp.md` L2 contract and the `db`/`auth`/`devops`/`infra` additions approved (currently `PROPOSED`).
- Close the rotation race properly (family row lock or a family-level revoked flag + migration) if connectors ever hold write scopes.
- Verify the full `register → … → tools` flow against a real Claude client over a public https origin — the local suite proves the protocol, not the claude.ai UI.
- `L2-MCP-38` (consent reuse per user/client/scope set) is only partly realised: the consent screen re-prompts every time rather than short-circuiting an identical existing grant.
- Rate limits stay in-process (`L2-MCP-30`) — a horizontally-scaled deployment needs a shared store, same caveat as `L2-AUTH-40`.
- The docker/Caddy flavour has no edge rate-limit equivalent, so `/api/oauth/register` (unauthenticated by design) relies solely on the in-process limiter there.
- Write tools are out of scope for this phase (`L2-MCP-09`); adding any is an L2 change.

## Pending L1 proposal (human decision)
Not applied — constitution is human-only (`L1-CON-04`). Ready-to-paste lines for a human to add to `/docs/constitution.md`:

**Governed domains (L2)** — add to the list:
```
- `mcp` → `/docs/contracts/mcp.md`
```

**Stack + rationale** — new line:
```
- `L1-STACK-12` — Model Context Protocol SDK (`@modelcontextprotocol/server`) — remote MCP connector surface, Streamable HTTP, OAuth 2.1 protected.
```

**Constraints (non-negotiable)** — new line:
```
- `L1-CON-06` — Connector access is read-only and opt-in (`MCP_ENABLED`, default off); it grants no capability the connected user's role does not already hold.
```
