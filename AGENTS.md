# Phone Book

pnpm workspace monorepo. Node 26, pnpm 12.

| Path | Package | What it is |
| --- | --- | --- |
| `apps/web` | `web` | Next.js 16 App Router, React 19, Tailwind v4, shadcn/ui |
| `apps/api` | `api` | NestJS 12 on Express, Vitest, oxlint |
| `shared/db` | `@phone-book/db` | Drizzle schema + client (Postgres), migrations |
| `shared/config` | `@phone-book/config` | tsconfig bases |

`apps/web` calls `apps/api` through its own `/api/*` rewrite (`next.config.ts`), so the browser
stays same-origin and the API needs no CORS — the target comes from `API_URL`, baked at build
time. Web never touches the database; `apps/api` is the only Drizzle client.
`docker compose up -d` starts Postgres.

Every command is a script in the relevant `package.json`; root scripts aggregate them
(`dev`, `build`, `test`, `lint`, `typecheck`, `db:*`).

## Conventions

- Shared dep versions come from `catalog:` in `pnpm-workspace.yaml` — reference it, don't pin again.
- **TypeScript stays on 6.x.** `typescript-eslint`, pulled in by `eslint-config-next`, refuses
  TS 7 and fails `pnpm lint`. Bump once it supports >= 7.1.
- The Drizzle schema is the single source of truth for data shapes: write the table in
  `shared/db/src/schema.ts`, then derive row types (`typeof table.$inferSelect`) and validators
  (`drizzle-zod`'s `createInsertSchema`) from it rather than hand-writing either.
- Contacts are owner-scoped: `owner_id` comes from the `owner_id` cookie
  (`apps/api/src/owner.ts`), never from the request body, and every query filters by it.
- `shared/db` compiles to `dist/` — run `pnpm build:shared` after editing it.
- Schema changes: edit `shared/db/src/schema.ts`, then `pnpm db:generate`, and commit the SQL it
  writes to `shared/db/drizzle/`. Never hand-edit those files.
- shadcn components live in `apps/web/components/ui`; add with `pnpm dlx shadcn@latest add <component>`.
  They import `cn` from the `cn` package, not a local helper.
- Use Tailwind's scale utilities (`text-sm`, `py-2`, `leading-none`, `tracking-tight`). Arbitrary
  values like `text-[15px]` or `mt-[13px]` are a last resort — if no scale equivalent exists,
  add a named `@utility` in `globals.css` instead of brackets in markup.
- One root `.env` (copy `.env.example`). `apps/api` reads it through `apps/api/src/env.ts`;
  `shared/db` takes the URL as an argument.
- Docker: `docker compose up -d` is the Postgres-only dev dependency; the app containers are
  behind the `app` profile (`docker compose --profile app up --build`). Both Dockerfiles take
  the **repo root** as build context — a per-app context can't see the workspace lockfile or
  `shared/*`. The api image uses `pnpm deploy` (which packs like npm, so `apps/api/package.json`
  keeps a `files: ["dist"]` list) and the web image relies on `output: "standalone"`.
- Style focus with the ring utilities (`focus-visible:border-ring focus-visible:ring-3
  focus-visible:ring-ring/50`), as shadcn's `Button` does. Do **not** pair `outline-none` with
  `focus-visible:outline-*` — `outline-none` sets `--tw-outline-style: none`, which the outline
  utilities read back, so the focus ring silently never renders.
- Commit only when explicitly asked.

## This is NOT the Next.js you know

`apps/web` runs a Next.js with breaking changes — APIs and file structure may differ from your
training data. Read `apps/web/node_modules/next/dist/docs/` before writing code there.

`apps/web/AGENTS.md` is written by `next dev` on every boot, so it can't be deleted — it's
gitignored, and this file is the copy that counts.
