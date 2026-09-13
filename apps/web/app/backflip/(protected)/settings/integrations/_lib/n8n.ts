import "server-only"

/**
 * n8n connection probe. Runs server-side with the decrypted public-API key
 * (`X-N8N-API-KEY`); only the workflow count comes back to the UI.
 *
 * @spec L2-N8N-03
 */

const TIMEOUT_MS = 10_000

export type N8nStatus = {
  /**
   * Whether the key can see at least one workflow. Deliberately not a count —
   * the probe asks for a single row, so a number here would be a lie.
   */
  hasWorkflows: boolean
}

/**
 * Normalize an operator-typed instance URL to a bare origin. Anything that
 * isn't http(s) is rejected — the value is used to build API calls.
 */
export function normalizeN8nBaseUrl(input: string): string | null {
  const raw = input.trim()
  if (!raw) return null
  try {
    const parsed = new URL(raw)
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null
    // Keep any sub-path (n8n is often mounted under one), drop trailing slash.
    const path = parsed.pathname.replace(/\/+$/, "")
    return `${parsed.origin}${path}`
  } catch {
    return null
  }
}

export async function fetchN8nStatus(
  baseUrl: string,
  apiKey: string
): Promise<N8nStatus> {
  const res = await fetch(`${baseUrl}/api/v1/workflows?limit=1`, {
    headers: { "X-N8N-API-KEY": apiKey, Accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  })
  if (!res.ok) {
    throw new Error(`n8n responded ${res.status}`)
  }
  const body = (await res.json()) as { data?: unknown[] }
  if (!Array.isArray(body.data)) {
    throw new Error("n8n returned an unexpected body")
  }
  return { hasWorkflows: body.data.length > 0 }
}
