import crypto from "node:crypto"

import { expect, test, type APIRequestContext, type Page } from "@playwright/test"
import pg from "pg"

import { BASE_URL, OWNER, TEAMMATE, TEST_DATABASE_URL } from "./env"

/**
 * End-to-end proof of the Claude-compatible MCP connector: the OAuth 2.1
 * authorization server (`/api/oauth/*`, `/.well-known/*`) and the Streamable
 * HTTP resource server (`/api/mcp`) it protects, against a real running app
 * and a real (seeded) `backflip_test` database.
 *
 * Requires `MCP_ENABLED=true` and `AUTH_URL` set to this suite's own origin —
 * both are set in `webServer.env` in `playwright.config.ts` rather than any
 * `.env` file, so the flag and the issuer never leak into a normal dev run.
 *
 * @spec L2-MCP-42, L2-MCP-43, L2-MCP-44, L2-MCP-45, L2-MCP-03
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Same-origin path that no app route answers — good enough as a redirect
 *  target we only ever want to *observe*, never actually load (`L2-MCP-31`
 *  requires `redirect_uri` to be pre-registered, so it must be a real,
 *  reachable-looking URL, not a bogus scheme). */
const REDIRECT_URI = `${BASE_URL}/__e2e_oauth_callback__`

type Account = { email: string; password: string }

type TokenResponse = {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  scope: string
}

function generatePkce(): { verifier: string; challenge: string } {
  // 32 random bytes -> 43-char base64url string, right at RFC 7636's minimum.
  const verifier = crypto.randomBytes(32).toString("base64url")
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url")
  return { verifier, challenge }
}

async function registerClient(
  request: APIRequestContext,
  clientName: string
): Promise<{ clientId: string }> {
  const response = await request.post("/api/oauth/register", {
    data: { client_name: clientName, redirect_uris: [REDIRECT_URI] },
  })
  expect(response.status(), await response.text()).toBe(201)
  const body = await response.json()
  expect(body.token_endpoint_auth_method).toBe("none")
  return { clientId: body.client_id as string }
}

async function login(page: Page, account: Account): Promise<void> {
  await page.goto("/backflip/login")
  await page.getByLabel("Email").fill(account.email)
  await page.getByLabel("Password").fill(account.password)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page).toHaveURL("/backflip")
}

/**
 * Arms a network interceptor for `REDIRECT_URI` and resolves with the
 * captured URL the instant something tries to reach it — a full navigation
 * or a client-side one, `page.route` catches both, and neither ever actually
 * reaches the network (nothing answers that path). Must be called BEFORE
 * whatever triggers the redirect (e.g. before clicking Allow).
 */
function captureRedirect(page: Page): Promise<URL> {
  return new Promise<URL>((resolve) => {
    void page.route(`${REDIRECT_URI}**`, async (route) => {
      const url = new URL(route.request().url())
      await route.fulfill({ status: 200, contentType: "text/plain", body: "captured" })
      resolve(url)
    })
  })
}

/**
 * Drive `/api/oauth/authorize` -> `/backflip/connect` -> Allow, and capture
 * the redirect back to `REDIRECT_URI` (see `captureRedirect`). Assumes the
 * page is already authenticated — callers that need to exercise the
 * logged-out path drive the navigation themselves (see the regression test
 * for the proxy's `from` param below).
 */
async function authorizeAndApprove(
  page: Page,
  opts: {
    clientId: string
    challenge: string
    state: string
    scope?: string
    resource?: string
    onConsentScreen?: () => Promise<void>
  }
): Promise<URL> {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: opts.clientId,
    redirect_uri: REDIRECT_URI,
    code_challenge: opts.challenge,
    code_challenge_method: "S256",
    state: opts.state,
  })
  if (opts.scope) params.set("scope", opts.scope)
  if (opts.resource) params.set("resource", opts.resource)

  const captured = captureRedirect(page)

  await page.goto(`/api/oauth/authorize?${params.toString()}`)
  await expect(page).toHaveURL(/\/backflip\/connect\?/)

  if (opts.onConsentScreen) await opts.onConsentScreen()

  await page.getByRole("button", { name: "Allow" }).click()
  return captured
}

/**
 * Full DCR -> login -> consent -> Allow dance, stopping right after the code
 * lands in the captured redirect. Kept separate from token exchange so tests
 * that need to exchange (or replay) the code themselves can do so explicitly.
 */
type OAuthFlowOptions = {
  clientName: string
  scope?: string
  resource?: string
  onConsentScreen?: () => Promise<void>
}

async function obtainAuthorizationCode(
  page: Page,
  request: APIRequestContext,
  account: Account,
  opts: OAuthFlowOptions
): Promise<{ clientId: string; code: string; verifier: string }> {
  const { clientId } = await registerClient(request, opts.clientName)
  const { verifier, challenge } = generatePkce()
  const state = crypto.randomBytes(8).toString("hex")

  await login(page, account)
  const redirect = await authorizeAndApprove(page, {
    clientId,
    challenge,
    state,
    scope: opts.scope,
    resource: opts.resource,
    onConsentScreen: opts.onConsentScreen,
  })

  expect(redirect.searchParams.get("error")).toBeNull()
  expect(redirect.searchParams.get("state")).toBe(state)
  const code = redirect.searchParams.get("code")
  expect(code).toBeTruthy()

  return { clientId, code: code as string, verifier }
}

function exchangeCode(
  request: APIRequestContext,
  input: { clientId: string; code: string; verifier: string }
) {
  return request.post("/api/oauth/token", {
    form: {
      grant_type: "authorization_code",
      code: input.code,
      redirect_uri: REDIRECT_URI,
      client_id: input.clientId,
      code_verifier: input.verifier,
    },
  })
}

function refreshGrant(
  request: APIRequestContext,
  input: { clientId: string; refreshToken: string }
) {
  return request.post("/api/oauth/token", {
    form: {
      grant_type: "refresh_token",
      refresh_token: input.refreshToken,
      client_id: input.clientId,
    },
  })
}

/** Register + login + consent + exchange, in one call — the common case. */
async function runOAuthFlow(
  page: Page,
  request: APIRequestContext,
  account: Account,
  opts: OAuthFlowOptions
): Promise<{ clientId: string; tokens: TokenResponse }> {
  const { clientId, code, verifier } = await obtainAuthorizationCode(page, request, account, opts)
  const response = await exchangeCode(request, { clientId, code, verifier })
  expect(response.status(), await response.text()).toBe(200)
  const tokens = (await response.json()) as TokenResponse
  return { clientId, tokens }
}

/** A JSON-RPC envelope over `/api/mcp`, Streamable HTTP style. Returns the
 *  raw response (for status/header assertions) alongside the parsed body,
 *  transparently unwrapping an `text/event-stream` response if the SDK opts
 *  into streaming for this exchange. */
async function mcpCall(
  request: APIRequestContext,
  accessToken: string | null,
  method: string,
  params?: Record<string, unknown>
) {
  const response = await request.post("/api/mcp", {
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    data: { jsonrpc: "2.0", id: 1, method, params: params ?? {} },
  })

  const contentType = response.headers()["content-type"] ?? ""
  const text = await response.text()
  let body: {
    result?: { tools?: { name: string }[]; structuredContent?: Record<string, unknown> }
    error?: { code: number; message: string }
  } | null = null

  if (text) {
    if (contentType.includes("text/event-stream")) {
      const dataLines = text
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice("data:".length).trim())
      const last = dataLines[dataLines.length - 1]
      body = last ? JSON.parse(last) : null
    } else {
      body = JSON.parse(text)
    }
  }

  return { response, body }
}

/** Directly bumps `tokenVersion`, exactly what `changePassword` does
 *  (`app/backflip/(protected)/account/_actions.ts`) — the harness-sanctioned
 *  stand-in for driving the password-change UI, so this test doesn't mutate
 *  the shared `OWNER` fixture's password out from under other spec files. */
async function bumpTokenVersion(email: string): Promise<void> {
  const client = new pg.Client({ connectionString: TEST_DATABASE_URL })
  await client.connect()
  try {
    await client.query(
      `update "user" set "tokenVersion" = "tokenVersion" + 1 where email = $1`,
      [email]
    )
  } finally {
    await client.end()
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Claude MCP connector", () => {
  test("discovery: well-known documents advertise a consistent issuer, endpoints and resource", async ({
    request,
  }) => {
    const asResponse = await request.get("/.well-known/oauth-authorization-server")
    expect(asResponse.status()).toBe(200)
    const asBody = await asResponse.json()
    expect(asBody.issuer).toBe(BASE_URL)
    expect(asBody.authorization_endpoint).toBe(`${BASE_URL}/api/oauth/authorize`)
    expect(asBody.token_endpoint).toBe(`${BASE_URL}/api/oauth/token`)
    expect(asBody.registration_endpoint).toBe(`${BASE_URL}/api/oauth/register`)
    expect(asBody.revocation_endpoint).toBe(`${BASE_URL}/api/oauth/revoke`)
    expect(asBody.code_challenge_methods_supported).toEqual(["S256"])
    expect(asBody.token_endpoint_auth_methods_supported).toEqual(["none"])
    expect(asBody.grant_types_supported.sort()).toEqual(
      ["authorization_code", "refresh_token"].sort()
    )

    const prmResponse = await request.get("/.well-known/oauth-protected-resource")
    expect(prmResponse.status()).toBe(200)
    const prmBody = await prmResponse.json()
    expect(prmBody.resource).toBe(`${BASE_URL}/api/mcp`)
    expect(prmBody.authorization_servers).toEqual([BASE_URL])
    expect(prmBody.bearer_methods_supported).toEqual(["header"])

    const prmSuffixedResponse = await request.get(
      "/.well-known/oauth-protected-resource/api/mcp"
    )
    expect(prmSuffixedResponse.status()).toBe(200)
    const prmSuffixedBody = await prmSuffixedResponse.json()
    expect(prmSuffixedBody.resource).toBe(`${BASE_URL}/api/mcp`)
  })

  test("challenge: unauthenticated POST /api/mcp is 401 with a WWW-Authenticate challenge", async ({
    request,
  }) => {
    const { response } = await mcpCall(request, null, "tools/list")

    expect(response.status()).toBe(401)
    const challenge = response.headers()["www-authenticate"] ?? ""
    expect(challenge).toContain("Bearer")
    expect(challenge).toContain('error="invalid_token"')
    expect(challenge).toContain(
      `resource_metadata="${BASE_URL}/.well-known/oauth-protected-resource"`
    )
  })

  test("happy path: DCR, consent, code exchange, and an owner's full tool access", async ({
    page,
    request,
  }) => {
    const requestedScope = "account dashboard users.view settings"

    const { tokens } = await runOAuthFlow(page, request, OWNER, {
      clientName: "E2E Happy Path Connector",
      scope: requestedScope,
      resource: `${BASE_URL}/api/mcp`,
      onConsentScreen: async () => {
        await expect(page.getByText("E2E Happy Path Connector")).toBeVisible()
        await expect(page.getByText(OWNER.email)).toBeVisible()
        await expect(page.getByText("Your account")).toBeVisible()
        await expect(page.getByText("Dashboard summary")).toBeVisible()
        await expect(page.getByText("View users")).toBeVisible()
        await expect(page.getByText("Platform status")).toBeVisible()
      },
    })

    expect(tokens.access_token).toBeTruthy()
    expect(tokens.refresh_token).toBeTruthy()
    expect(tokens.access_token).not.toBe(tokens.refresh_token)
    expect(tokens.token_type).toBe("Bearer")
    expect(tokens.scope.split(" ").sort()).toEqual(requestedScope.split(" ").sort())

    const { response: listResponse, body: listBody } = await mcpCall(
      request,
      tokens.access_token,
      "tools/list"
    )
    expect(listResponse.status()).toBe(200)
    const toolNames = (listBody?.result?.tools ?? []).map((t) => t.name).sort()
    expect(toolNames).toEqual(
      ["get_dashboard_summary", "get_platform_status", "get_user", "list_users", "whoami"].sort()
    )

    const { response: whoamiResponse, body: whoamiBody } = await mcpCall(
      request,
      tokens.access_token,
      "tools/call",
      { name: "whoami", arguments: {} }
    )
    expect(whoamiResponse.status()).toBe(200)
    expect(whoamiBody?.result?.structuredContent).toMatchObject({
      email: OWNER.email,
      role: "owner",
    })
  })

  test("code replay: reusing an authorization code fails and kills the whole grant", async ({
    page,
    request,
  }) => {
    const { clientId, code, verifier } = await obtainAuthorizationCode(page, request, OWNER, {
      clientName: "E2E Replay Connector",
    })

    const first = await exchangeCode(request, { clientId, code, verifier })
    expect(first.status(), await first.text()).toBe(200)
    const firstTokens = (await first.json()) as TokenResponse

    const replay = await exchangeCode(request, { clientId, code, verifier })
    expect(replay.status()).toBe(400)
    const replayBody = await replay.json()
    expect(replayBody.error).toBe("invalid_grant")

    // The replay is treated as an attack: it kills the tokens the FIRST
    // (legitimate) exchange minted too (`L2-MCP-32`), not just the second try.
    const { response: listResponse } = await mcpCall(
      request,
      firstTokens.access_token,
      "tools/list"
    )
    expect(listResponse.status()).toBe(401)
  })

  test("refresh rotation: refresh works once, replaying the old token kills the whole grant", async ({
    page,
    request,
  }) => {
    const { clientId, tokens } = await runOAuthFlow(page, request, OWNER, {
      clientName: "E2E Refresh Connector",
    })

    const rotated = await refreshGrant(request, {
      clientId,
      refreshToken: tokens.refresh_token,
    })
    expect(rotated.status(), await rotated.text()).toBe(200)
    const rotatedTokens = (await rotated.json()) as TokenResponse
    expect(rotatedTokens.access_token).not.toBe(tokens.access_token)
    expect(rotatedTokens.refresh_token).not.toBe(tokens.refresh_token)

    // The rotated (now-consumed) refresh token is replayed — reuse detection
    // must reject it AND tear down the whole family (`L2-MCP-27`).
    const replay = await refreshGrant(request, {
      clientId,
      refreshToken: tokens.refresh_token,
    })
    expect(replay.status()).toBe(400)
    const replayBody = await replay.json()
    expect(replayBody.error).toBe("invalid_grant")

    // Even the token minted by the legitimate rotation is now dead.
    const { response: listResponse } = await mcpCall(
      request,
      rotatedTokens.access_token,
      "tools/list"
    )
    expect(listResponse.status()).toBe(401)
  })

  test("revocation: bumping the connected user's tokenVersion (password change) invalidates the connector immediately", async ({
    page,
    request,
  }) => {
    const { clientId, tokens } = await runOAuthFlow(page, request, OWNER, {
      clientName: "E2E Revocation Connector",
    })

    // Sanity: the grant works before the "password change".
    const before = await mcpCall(request, tokens.access_token, "tools/list")
    expect(before.response.status()).toBe(200)

    await bumpTokenVersion(OWNER.email)

    const after = await mcpCall(request, tokens.access_token, "tools/list")
    expect(after.response.status()).toBe(401)

    const refreshAttempt = await refreshGrant(request, {
      clientId,
      refreshToken: tokens.refresh_token,
    })
    expect(refreshAttempt.status()).toBe(400)
    const refreshBody = await refreshAttempt.json()
    expect(refreshBody.error).toBe("invalid_grant")
  })

  test("least privilege: a teammate sees a strictly smaller tool set than an owner", async ({
    page,
    request,
  }) => {
    const { tokens } = await runOAuthFlow(page, request, TEAMMATE, {
      clientName: "E2E Teammate Connector",
    })

    const { response, body } = await mcpCall(request, tokens.access_token, "tools/list")
    expect(response.status()).toBe(200)
    const toolNames = (body?.result?.tools ?? []).map((t) => t.name).sort()
    expect(toolNames).toEqual(["get_dashboard_summary", "whoami"].sort())
    expect(toolNames).not.toContain("list_users")
    expect(toolNames).not.toContain("get_platform_status")

    // Calling an unregistered tool directly must fail as "unknown tool", not
    // silently succeed (`L2-MCP-20`, `L2-MCP-39`).
    const direct = await mcpCall(request, tokens.access_token, "tools/call", {
      name: "list_users",
      arguments: {},
    })
    expect(direct.response.status()).toBe(200) // JSON-RPC error, not an HTTP error.
    expect(direct.body?.error?.code).toBe(-32602)
  })

  test("logged-out authorize request survives the login round trip with the request intact (regression: proxy.ts `from` param)", async ({
    page,
    request,
  }) => {
    // Deliberately no `login()` here: this test's `page` gets a fresh,
    // unauthenticated browser context by default (`playwright.config.ts`'s
    // `use` block sets no `storageState`), and that default is exactly what
    // this scenario needs — a first-time Claude connection where the visitor
    // has no session yet (`L2-MCP-42`, `docs/notes/mcp.md` steps 3-4).
    const { clientId } = await registerClient(request, "E2E Logged-Out Connector")
    const { verifier, challenge } = generatePkce()
    const state = crypto.randomBytes(8).toString("hex")

    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: REDIRECT_URI,
      code_challenge: challenge,
      code_challenge_method: "S256",
      state,
    })

    await page.goto(`/api/oauth/authorize?${params.toString()}`)

    // The `/backflip` proxy gate must carry the FULL authorize query string in
    // `from`, not just the pathname, or the post-login redirect lands on a
    // bare `/backflip/connect` with nothing to render. This is the assertion
    // that catches the regression: before the fix, `from` was just
    // `/backflip/connect` (no `?...`), so none of these `contain`s would hold.
    await expect(page).toHaveURL(/\/backflip\/login\?from=/)
    const fromParam = new URL(page.url()).searchParams.get("from") ?? ""
    expect(fromParam.startsWith("/backflip/connect?")).toBe(true)
    expect(fromParam).toContain(`client_id=${clientId}`)
    expect(fromParam).toContain(`code_challenge=${challenge}`)

    const redirectCaptured = captureRedirect(page)

    await page.getByLabel("Email").fill(OWNER.email)
    await page.getByLabel("Password").fill(OWNER.password)
    await page.getByRole("button", { name: "Sign in" }).click()

    // Lands on the consent screen WITH the request intact — not the fatal
    // "Missing client_id" error card `/backflip/connect` renders with no
    // params (see `ErrorCard` in `app/backflip/(protected)/connect/page.tsx`).
    await expect(page).toHaveURL(/\/backflip\/connect\?/)
    await expect(page.getByText("E2E Logged-Out Connector")).toBeVisible()
    await expect(page.getByText("Your account")).toBeVisible()
    await expect(page.getByText("Can't authorize this connector")).toBeHidden()

    await page.getByRole("button", { name: "Allow" }).click()
    const redirect = await redirectCaptured

    expect(redirect.searchParams.get("error")).toBeNull()
    expect(redirect.searchParams.get("state")).toBe(state)
    const code = redirect.searchParams.get("code")
    expect(code).toBeTruthy()

    const tokenResponse = await exchangeCode(request, {
      clientId,
      code: code as string,
      verifier,
    })
    expect(tokenResponse.status(), await tokenResponse.text()).toBe(200)
    const tokens = (await tokenResponse.json()) as TokenResponse
    expect(tokens.access_token).toBeTruthy()
  })
})
