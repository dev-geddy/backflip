/**
 * Route → breadcrumb trail for the /backflip surface.
 *
 * One map, two consumers: `site-header.tsx` renders it as the on-page
 * breadcrumb, and each page turns it into the browser title via `titleFor()`.
 * Keeping both off the same source is the point — a tab reading "Settings ›
 * My account" while the header reads something else is the kind of drift
 * nobody notices until it is everywhere.
 *
 * Order matters: the first match wins, so a deeper route has to be listed
 * before the prefix it sits under (`/account/verify-email` before
 * `/account`).
 *
 * @spec L2-UI-52
 */

/**
 * Title separator — U+203A, a single right-pointing angle quote. Narrower than
 * "»" and unlike "/" it does not read as part of a URL, which is the whole
 * reason the tab is being retitled.
 */
export const CRUMB_SEPARATOR = " › "

/** Brand prefix for the tab. Short on purpose: a browser tab truncates fast,
 *  and the trail's leaf is what the reader actually needs to see. */
export const TITLE_PREFIX = "B"

const CRUMBS: { match: (p: string) => boolean; trail: string[] }[] = [
  { match: (p) => p === "/backflip", trail: ["Overview"] },
  { match: (p) => p.startsWith("/backflip/users"), trail: ["Members"] },
  { match: (p) => p.startsWith("/backflip/docs"), trail: ["Platform", "Docs"] },
  {
    match: (p) => p.startsWith("/backflip/ui-samples"),
    trail: ["Platform", "UI samples"],
  },
  {
    match: (p) => p.startsWith("/backflip/account/verify-email"),
    trail: ["Settings", "My account", "Verify email"],
  },
  {
    match: (p) => p.startsWith("/backflip/account"),
    trail: ["Settings", "My account"],
  },
  {
    match: (p) => p.startsWith("/backflip/settings"),
    trail: ["Workspace", "Integrations"],
  },
  {
    match: (p) => p.startsWith("/backflip/connect"),
    trail: ["Connect an app"],
  },
]

/** The trail for a pathname, falling back to the brand for an unmapped route. */
export function crumbsFor(pathname: string): string[] {
  return CRUMBS.find((c) => c.match(pathname))?.trail ?? ["Backflip"]
}

/**
 * The trail as a page title — the path part only. The `/backflip` layout adds
 * the brand through Next.js's `title.template`, so a page that sets
 * `titleFor("/backflip/account")` ends up as "B › Settings › My account".
 */
export function titleFor(pathname: string): string {
  return crumbsFor(pathname).join(CRUMB_SEPARATOR)
}
