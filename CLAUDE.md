# Ship Planner

Collaborative 2D graph-paper blueprint editor for ship layouts. Multi-floor
(levels) support, multi-user editing, client polls the server every 1s for
near-real-time sync.

## Stack
- React 19 + Vite 8 + TypeScript, Tailwind CSS v4 (`src/styles/main.css`,
  `@theme` tokens), React Router v7.
- Backend: Hono 4 on Cloudflare Pages Functions (`functions/api/[[path]].ts`
  → `functions/src/index.ts`), D1 + Drizzle ORM (`functions/src/db/schema.ts`).
- Auth: planned as custom email/password, D1-backed (only a `users` table
  stub exists so far — no login flow yet).

## Directory conventions
- `src/components/`: reusable UI. `src/pages/`: composed views.
- `src/lib/api.ts`: fetch wrapper for the `/api` backend.
- `functions/src/routes/`: add modular Hono route groups here as features grow.
- `functions/src/db/schema.ts`: Drizzle schema; run `npm run db:generate` after
  edits, then `npm run db:migrate:local` (or `:remote`) to apply.

## D1 database
- Dev database: `ship-planner-dev` (binding `DB` in `wrangler.toml`,
  `migrations_dir = "drizzle"`).
- `wrangler.toml` is intentionally committed — Cloudflare Pages requires it
  present to manage bindings; it holds no secrets (D1 `database_id` is not
  sensitive). Real secrets go through `wrangler pages secret` / `.dev.vars`
  (gitignored) — see `.dev.vars.example` / `.env.example` for the expected keys.

## Dev commands
- `npm run dev` — frontend only (Vite).
- `npm run dev:backend` — builds and serves the full stack (Hono API + static
  frontend) via `wrangler pages dev dist`. The `-- npx vite` proxy mode is
  deprecated/flaky in Wrangler 4.105 (port autodetection fails); this script
  intentionally builds first and serves `dist/` instead.
- `npm run build` — `tsc -b && vite build`. Note `tsc -b` only covers the
  frontend (`tsconfig.app.json`/`tsconfig.node.json`); `functions/` has its
  own `functions/tsconfig.json` — run `npx tsc --noEmit -p functions/tsconfig.json`
  to typecheck the backend separately.
- `npm run lint` — oxlint.

## Not yet built
Ships/layouts CRUD, floors/levels, invites, the blueprint canvas editor, and
the 1s-interval polling sync loop are all out of scope for the initial
scaffold and are the next work to pick up.
