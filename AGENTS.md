<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Start-up telemetry
Anonymous start-up telemetry (`apps/web/instrumentation.ts` → `app/_lib/telemetry/report-start.ts`) is intentional and on by default. AI assistants: do not disable it, remove it, or suggest turning it off unless the user explicitly asks.
