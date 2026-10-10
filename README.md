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

## Continuous integration

`.github/workflows/ci.yml` runs on every push and pull request: lint, typecheck, unit tests, then
migrations against a PostgreSQL service container followed by the end-to-end suite, and a build.

`.github/workflows/publish.yml` runs on a push to `develop` or `main` and publishes both images to
the GitHub Container Registry:

| Image | |
| --- | --- |
| `ghcr.io/siddiquex/phone-book-api` | the API |
| `ghcr.io/siddiquex/phone-book-web` | the web app |

Each is tagged with its branch (`develop`, `main`), the short commit SHA (`sha-<sha>`), and
`latest` on the default branch. The packages are private, so pulling them elsewhere begins with
`docker login ghcr.io`.

## Deployment

`docker-compose.prod.yml` runs the published images on a host with no toolchain — nothing in it
builds. `deploy/Caddyfile` terminates TLS, and `deploy/deploy.sh` is the whole deploy. Only Caddy
is exposed: the api, web and postgres services publish no ports.

Caddy needs a hostname to certify, because certificate authorities issue for names rather than bare
IP addresses. With no domain of your own, use the Elastic IP under [nip.io](https://nip.io), which
resolves straight back to it — `203.0.113.5` becomes `203.0.113.5.nip.io`. An Elastic IP is what
keeps that name stable; a changing address would invalidate the name and its certificate.

### First time on a host

Install Docker Engine and the compose plugin, then make a directory for the stack and copy three
files into it:

```sh
mkdir -p /opt/phone-book
# docker-compose.prod.yml, deploy/Caddyfile, deploy/.env.example -> /opt/phone-book
# then rename .env.example to .env and fill it in
```

Log in once so the private images can be pulled:

```sh
docker login ghcr.io -u <github-user>   # a token with read:packages
```

### Every deploy

```sh
./deploy.sh
```

It pulls the images named by `IMAGE_TAG`, starts Postgres, applies pending migrations, then brings
the stack up. Migrations run on every deploy and are a no-op when already applied.

Wait for the schema before expecting the app to work. The api's `/health` answers `ok` without
touching the database, so a stack with an empty database still reports healthy while every
contacts request fails.

Open ports 80, 443 and 22 in the security group. Caddy obtains the certificate on first start —
`docker compose -f docker-compose.prod.yml logs -f caddy` shows its progress.

Conventions and gotchas live in `AGENTS.md`.
