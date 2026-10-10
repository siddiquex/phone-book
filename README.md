# Phone Book

A phone book: Next.js front end, NestJS API, PostgreSQL — a pnpm workspace monorepo.

A contact is a first name, a last name and a phone number. The app is one searchable, sortable
table:

- **Search** matches word prefixes on either name, or digits anywhere in the number, so both
  `grace hop` and `422` narrow the book.
- **Paging** is 20 at a time, fetched as the end of the table comes into view. The footer counts
  the match and the whole book separately, which only differ while a search is narrowing.
- **Writes** land optimistically. A removal is held back until the server confirms it, and stays
  undoable from its toast; a refused save restores the row and says why.
- **A number is unique within a book**, compared by digits, so `+61 400 111 222` and
  `61400111222` are the same number.
- **Ownership** is per browser, explained under [Ownership](#ownership).

## Stack

| Layer | What |
| --- | --- |
| Runtime | Node 26, pnpm 12 workspaces, TypeScript 6 |
| Web | Next.js 16 App Router on Turbopack, React 19, TanStack Query 5 for server state, TanStack Table 9 for the grid, Tailwind v4, shadcn/ui on Base UI, sonner, next-themes |
| API | NestJS 12 on Express, zod at the request edge, Vitest, oxlint |
| Data | Postgres 18, Drizzle ORM with `drizzle-zod`, drizzle-kit migrations |

Shared dependency versions live in the `catalog:` block of `pnpm-workspace.yaml`. TypeScript is
held at 6.x on purpose: `typescript-eslint`, pulled in by `eslint-config-next`, refuses 7 and
fails `pnpm lint`.

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

`apps/api/Dockerfile` and `apps/web/Dockerfile` build from the repo root (their contexts must be
the workspace root, or the pnpm lockfile and `shared/*` won't resolve), and both compile
`shared/db` first — it ships `dist/` only, which `.dockerignore` keeps out of the context.

## API

`/health`, plus `/contacts` scoped to the caller's `owner_id` cookie.

| Method | Path | Body or query |
| --- | --- | --- |
| `GET` | `/health` | — |
| `GET` | `/contacts` | `limit` (1–100, default 25), `cursor`, `search` |
| `POST` | `/contacts` | `firstName`, `lastName`, `phone` → 201 |
| `PATCH` | `/contacts/:id` | any subset of those three |
| `DELETE` | `/contacts/:id` | → 204 |
| `DELETE` | `/contacts` | `ids: [...]` → 204 |

A page is `{ items, nextCursor, total, bookTotal }`. `nextCursor` is opaque — pass it back
untouched, never construct one. `POST` and `PATCH` answer 409 when the number is already in the
book; `PATCH` or `DELETE` on another browser's id answers 404.

## Approaches

Why things are built this way.

### The browser only talks to the web app

`/api/*` is forwarded to the API by the web server, so the browser never learns its address and no
cross-origin permissions are needed.

### Paging remembers where it stopped

Contacts are stored in name order, so paging needs no sorting: each response ends with a bookmark
at the last row sent, and the next request resumes from there, which stays correct even if
contacts are added while you scroll. One extra row in the query says whether another page exists.

### The footer counts two things

Matches for the search, and the size of the whole book. Equal until you search; showing both keeps
the size visible while you narrow it.

### Searching by name or number

Words are split on spaces and all must match; a word matches the start of a first or last name, or
any part of the number, so `grace hop` and `422` both find Grace Hopper where `ace` does not. `%`
and `_` are ordinary text, not wildcards.

### Changes appear before the server replies

Adding, editing and removing update the table at once, and a refused change reverts. A removed row
is hidden rather than discarded — reloading would bring it back — which is what lets the toast
offer Undo.

### One definition of a contact

The table in `shared/db/src/schema.ts` defines a contact. The API and the web app take their types
from it, as do the checks on input; the web app borrows the field limits instead of repeating them.

## Ownership

Every contact belongs to a browser, not an account. On the first request to `/contacts` the API
mints a uuid, returns it as the `owner_id` `httpOnly` cookie, and scopes every read and write by
it — a second browser gets its own empty book. Another browser's contact id is unreachable rather
than refused: `PATCH` and `DELETE` on it return 404.

The web app passes nothing explicitly: requests go to the same origin, so the browser attaches the
cookie on its own.

This is identity by secret, not authentication: no password, no revocation, and clearing cookies
starts a new book. Real auth would replace `apps/api/src/owner.ts` alone — the table and every
query already scope by `ownerId`.

Conventions and gotchas live in `AGENTS.md`.
