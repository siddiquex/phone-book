# Phone Book

A phone book: Next.js front end, NestJS API, PostgreSQL — a pnpm workspace monorepo.

A contact is a first name, a last name and a phone number. The app is one searchable, sortable
table: search matches name prefixes or digits in the number, pages load as you reach the end, and
add, edit and remove are immediate. Each browser keeps its own book.

How it is built, and why, is in [DESIGN.md](DESIGN.md).

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

Both servers read `PORT`, which `pnpm dev` shares, so set it only when running one of them. The
container mappings take `WEB_PORT` and `API_PORT` instead.

`pnpm test` runs unit tests; `pnpm test:e2e` exercises the API against Postgres, so it needs
`docker compose up -d` and `pnpm db:migrate` first.

`docker compose up -d` starts **Postgres only** — the local development dependency. The app
containers sit behind a profile so they don't fight `pnpm dev` for ports 3000 and 5000:

```sh
docker compose --profile app up --build   # Postgres + api + web, all containerised
```

Set `COOKIE_SECURE=false` for that if you reach it over plain HTTP. In production it defaults to
true, and a browser silently drops a `Secure` cookie over `http://` — every request would then
look like a new browser and the book would come back empty.

## Commands

| Command | Description |
| --- | --- |
| `pnpm dev` | Web and API in watch mode |
| `pnpm build` | Build every package |
| `pnpm test` | API tests (Vitest) |
| `pnpm test:e2e` | API end-to-end tests against Postgres |
| `pnpm lint` | eslint (web) and oxlint (api) |
| `pnpm typecheck` | `tsc --noEmit` across all packages |
| `pnpm db:generate` | Generate SQL migrations from the Drizzle schema |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:studio` | Open Drizzle Studio |

## Layout

| Path | What it is |
| --- | --- |
| `apps/web` | Next.js 16 App Router, Tailwind v4, shadcn/ui. The table, dialogs and toast live in `components/`; the API client, paging and formatting in `lib/` |
| `apps/api` | NestJS 12 on Express |
| `shared/db` | Drizzle schema and Postgres client |
| `shared/config` | Shared tsconfig bases |

Conventions and gotchas live in `AGENTS.md`.
