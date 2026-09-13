import "server-only"

/**
 * ClickUp connection probe. Called server-side with the decrypted personal API
 * token — the token never reaches the client, only the resolved identity does.
 * `GET /api/v2/user` is the cheapest authenticated call ClickUp offers;
 * `GET /api/v2/team` names the workspaces the token can reach.
 *
 * @spec L2-CLICKUP-03
 */

const API = "https://api.clickup.com/api/v2"
const TIMEOUT_MS = 10_000

export type ClickupIdentity = {
  /** ClickUp user shown back to the operator as proof the token works. */
  username: string
  email: string | null
  /** Workspaces (teams) the token can see — id + name, for the team picker. */
  teams: { id: string; name: string }[]
}

async function call(path: string, token: string): Promise<unknown> {
  const res = await fetch(`${API}${path}`, {
    // ClickUp personal tokens go in `Authorization` raw — no `Bearer` prefix.
    headers: { Authorization: token },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  })
  if (!res.ok) {
    throw new Error(`clickup responded ${res.status}`)
  }
  return res.json()
}

export async function fetchClickupIdentity(
  token: string
): Promise<ClickupIdentity> {
  const [userBody, teamBody] = await Promise.all([
    call("/user", token) as Promise<{
      user?: { username?: string; email?: string }
    }>,
    // A token without team scope still authenticates; treat a failing team
    // lookup as "no teams" rather than a failed connection.
    (
      call("/team", token) as Promise<{
        teams?: { id?: string; name?: string }[]
      }>
    ).catch(() => ({ teams: [] })),
  ])

  const username = userBody.user?.username
  if (!username) {
    throw new Error("clickup returned no user")
  }

  return {
    username,
    email: userBody.user?.email ?? null,
    teams: (teamBody.teams ?? [])
      .filter((t): t is { id: string; name: string } => Boolean(t.id && t.name))
      .map((t) => ({ id: t.id, name: t.name })),
  }
}
