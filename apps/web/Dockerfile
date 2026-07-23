# Web app container. Build context = repo root (monorepo).
# Serves the production build on container port 3070 (compose maps host 3071).
FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY . .
RUN corepack yarn install --immutable
RUN corepack yarn workspace web build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /repo /repo
EXPOSE 3070
CMD ["corepack", "yarn", "workspace", "web", "start"]
