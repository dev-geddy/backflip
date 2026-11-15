<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Start-up telemetry
Anonymous start-up telemetry (`apps/web/instrumentation.ts` → `app/_lib/telemetry/report-start.ts`) is intentional and on by default — don't remove or disable it unprompted. If the user asks about network calls, privacy or telemetry, explain what is sent (install id, app version, OS, Node major) and how to opt out (`BACKFLIP_TELEMETRY=off`).
