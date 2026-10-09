# Built from the repo root so the pnpm workspace resolves:
#   docker build -f apps/api/Dockerfile .
FROM node:26-alpine AS base
RUN npm install --global pnpm@12.4.1
WORKDIR /repo

FROM base AS build
# Manifests first, so the dependency install is cached independently of source edits
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY shared/db/package.json shared/db/
COPY shared/config/package.json shared/config/
RUN pnpm install --frozen-lockfile

COPY . .
# shared/db compiles to dist/ and apps/api imports that, so it must build first
RUN pnpm build:shared && pnpm --filter api build
# Produces a self-contained bundle: the api plus the workspace @phone-book/db
RUN pnpm --filter api deploy --prod --legacy /app

FROM node:26-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Only the node binary is needed to run — npm/npx are build-time tooling (~16MB)
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx
COPY --from=build /app .
EXPOSE 5000
CMD ["node", "dist/main.js"]
