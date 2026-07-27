# Web app container. Build context = repo root (monorepo).
# Runner ships only the Next standalone bundle (`output: "standalone"`) —
# `node apps/web/server.js`, not `next start`. Container port 3070 (compose maps host 3071).
# @spec L2-INF-04
FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY . .
RUN corepack yarn install --immutable
RUN corepack yarn workspace web build

FROM node:24-alpine AS runner
ENV NODE_ENV=production
ENV PORT=3070
ENV HOSTNAME=0.0.0.0
WORKDIR /app
# Standalone bundle mirrors the monorepo: server at apps/web/server.js, minimal
# node_modules at the root. Static assets are not traced — copy them in place.
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
EXPOSE 3070
CMD ["node", "apps/web/server.js"]
