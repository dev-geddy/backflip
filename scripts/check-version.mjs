#!/usr/bin/env node
/**
 * Release-version guard: the root `package.json` version is what the running
 * app reports (`NEXT_PUBLIC_APP_VERSION`, `L2-UI-19`), so it must never sit
 * behind the newest git tag — otherwise a deployed instance names an older
 * release than the one it is actually serving. That is exactly what happened
 * to v1.2.0: the tag was cut without bumping the file first.
 *
 * Passes when the version is equal to or ahead of the newest tag (ahead is a
 * normal pre-release state). Skips when tags are unavailable — CI checkouts
 * are often shallow, and a guard that fails spuriously gets disabled.
 *
 * @spec L2-DEVOPS-28
 */
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import path from "node:path"

const root = path.resolve(import.meta.dirname, "..")
const { version } = JSON.parse(
  readFileSync(path.join(root, "package.json"), "utf8")
)

function latestTag() {
  try {
    return execFileSync("git", ["describe", "--tags", "--abbrev=0"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim()
  } catch {
    return null
  }
}

/** -1 / 0 / 1, comparing dot-separated numeric parts. Pre-release tags are not used here. */
function compare(a, b) {
  const pa = a.split(".").map(Number)
  const pb = b.split(".").map(Number)
  for (let i = 0; i < 3; i += 1) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (diff !== 0) return Math.sign(diff)
  }
  return 0
}

const tag = latestTag()
if (!tag) {
  console.log("version check: no tags reachable — skipped.")
  process.exit(0)
}

const tagged = tag.replace(/^v/, "")
if (!/^\d+\.\d+\.\d+$/.test(tagged)) {
  console.log(`version check: latest tag ${tag} is not a release tag — skipped.`)
  process.exit(0)
}

if (compare(version, tagged) < 0) {
  console.error(
    `version check FAILED: package.json is ${version}, but ${tag} is tagged.\n` +
      `The app reports package.json, so a deploy from here would announce v${version}.\n` +
      `Fix: bump the root package.json to ${tagged} (or newer), commit, then tag.`
  )
  process.exit(1)
}

console.log(`version check: package.json ${version} >= latest tag ${tag}.`)
