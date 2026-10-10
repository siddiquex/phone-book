# Built from the repo root so the pnpm workspace lockfile resolves:
#   docker build -f apps/web/Dockerfile .
FROM node:26-alpine AS base
RUN npm install --global pnpm@12.4.1
WORKDIR /repo

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/
COPY shared/db/package.json shared/db/
COPY shared/config/package.json shared/config/
RUN pnpm install --frozen-lockfile

COPY . .
# The /api rewrite target is baked at build time (it lands in the routes manifest)
ARG API_URL=http://api:5000
# The db package ships dist/ only, which .dockerignore keeps out of the context, and the field
# limits are imported as values — so it has to compile before the web build resolves it
RUN pnpm build:shared && pnpm --filter web build

FROM node:26-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Only the node binary is needed to run — npm/npx are build-time tooling (~16MB)
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /repo/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
