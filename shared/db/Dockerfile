# A one-shot image whose only job is `drizzle-kit migrate`. Built from the repo root:
#   docker build -f shared/db/Dockerfile .
#
# The api image cannot apply migrations: drizzle-kit is a devDependency, so
# `pnpm deploy --prod` leaves it out, and the runtime stage deletes npm so it cannot be
# installed there either. This image installs the whole development dependency set instead.
FROM node:26-alpine
RUN npm install --global pnpm@12.4.1
WORKDIR /repo

# Every workspace manifest has to be present or the frozen lockfile check fails, but only
# this package's dependencies need installing.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY shared/db/package.json shared/db/
COPY shared/config/package.json shared/config/
RUN pnpm install --frozen-lockfile --filter @phone-book/db

# drizzle.config.ts reads DATABASE_URL from the environment and points at ./drizzle for
# the migrations and ./src/schema.ts for the schema, so both come along.
COPY shared/db shared/db

WORKDIR /repo/shared/db

# Reads DATABASE_URL from the environment the compose service provides.
CMD ["pnpm", "migrate"]
