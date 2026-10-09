# Phone Book

A phone book: Next.js front end, NestJS API, PostgreSQL — a pnpm workspace monorepo.

## Requirements

Node 26+, pnpm 12+, Docker.

## Run locally

```sh
pnpm install
cp .env.example .env
docker compose up -d
pnpm dev
```

- Web — http://localhost:3000
- API — http://localhost:5000/health

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

Conventions and gotchas live in `AGENTS.md`.
