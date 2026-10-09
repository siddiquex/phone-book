# Phone Book

A phone book: Next.js front end, NestJS API, PostgreSQL — a pnpm workspace monorepo.

## Requirements

Node 26+, pnpm 12+, Docker.

## Run locally

```sh
pnpm install
cp .env.example .env
docker compose up -d
pnpm db:migrate
pnpm dev
```

- Web — http://localhost:3000
- API — http://localhost:5000/health

`pnpm test` runs unit tests; `pnpm test:e2e` exercises the API against Postgres, so it needs
`docker compose up -d` and `pnpm db:migrate` first.

`docker compose up -d` starts **Postgres only** — the local development dependency. The app
containers sit behind a profile so they don't fight `pnpm dev` for ports 3000 and 5000:

```sh
docker compose --profile app up --build   # Postgres + api + web, all containerised
```

## Commands

| Command | Description |
| --- | --- |
| `pnpm dev` | Web and API in watch mode |
| `pnpm build` | Build every package |
| `pnpm test` | API tests (Vitest) |
| `pnpm lint` | eslint (web) and oxlint (api) |
| `pnpm typecheck` | `tsc --noEmit` across all packages |
| `pnpm db:generate` | Generate SQL migrations from the Drizzle schema |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:studio` | Open Drizzle Studio |

## Layout

| Path | What it is |
| --- | --- |
| `apps/web` | Next.js 16 App Router, Tailwind v4, shadcn/ui |
| `apps/api` | NestJS 12 on Express |
| `shared/db` | Drizzle schema and Postgres client |
| `shared/config` | Shared tsconfig bases |

`apps/api/Dockerfile` and `apps/web/Dockerfile` build from the repo root (their contexts must be
the workspace root, or the pnpm lockfile and `shared/*` won't resolve).

## Ownership

Every contact belongs to a browser, not an account. On the first request to `/contacts` the API
mints a uuid, returns it as the `owner_id` `httpOnly` cookie, and scopes every read and write by
it — a second browser gets its own empty book. Another browser's contact id is unreachable rather
than refused: `PATCH` and `DELETE` on it return 404.

The web app passes nothing explicitly. It calls the API through its same-origin `/api` rewrite, so
the browser attaches the cookie on its own.

This is identity by secret, not authentication: no password, no revocation, and clearing cookies
starts a new book. Real auth would replace `apps/api/src/owner.ts` alone — the table and every
query already scope by `ownerId`.

Conventions and gotchas live in `AGENTS.md`.
