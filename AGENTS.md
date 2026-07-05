# AGENTS.md

Instructions for AI coding agents (Claude Code, Codex, Cursor, etc.)
working in this repository.

## What this project is

`tools.clewis.tech` — a personal, single-user tools launcher deployed as
a Cloudflare Worker. React + TypeScript frontend (Vite), Worker backend
in the same repo. Not public-facing except for specific carved-out paths
(e.g. `/bar`, a guest-facing drink-ordering page).

There is exactly one user: the repo owner. Do not add multi-user
features, signup flows, or generalize this into a product unless
explicitly asked.

## Stack

- React 18 + TypeScript, built with Vite
- `@cloudflare/vite-plugin` + `wrangler` for the Cloudflare Worker
- `react-router-dom` for client-side routing
- Cloudflare D1 for any tool that needs persistent storage
- Cloudflare Access (Zero Trust) gates the whole zone by default; public
  exceptions are carved out per-path with a Bypass policy

## Commands

```bash
npm install        # install deps
npm run dev         # Vite dev server, hot reload
npm run build       # tsc -b && vite build
npm run deploy      # build + wrangler deploy
npx wrangler dev    # run built output as a real Worker locally
```

Always run `npm run build` before considering a change complete — this
project uses `tsc -b` as part of the build, so type errors will surface
here even if the dev server looks fine.

## Project structure

Feature-based. Each tool is a self-contained domain under `features/`.

```
src/
├── components/
│   └── ui/             # ONLY truly generic shared UI (no domain logic)
├── features/
│   ├── launcher/       # the tools grid page
│   │   ├── LauncherPage.tsx
│   │   ├── components/   # ToolCard.tsx
│   │   ├── data/          # tools.ts — list of cards shown on the launcher
│   │   └── index.ts       # public exports for the feature
│   └── <tool-name>/    # one folder per tool, e.g. bar/
│       ├── components/
│       ├── hooks/
│       ├── services/     # calls to that tool's own API routes
│       ├── types/
│       └── index.ts       # public exports for the feature
├── hooks/               # shared, non-domain hooks (e.g. useAuthStatus)
├── layouts/             # shared structural wrappers (e.g. a gated-page shell)
├── routes/
│   ├── paths.ts          # central map of frontend paths and backend API paths
│   └── router.tsx         # path → page registration
├── styles/              # global styles (tokens.css, base.css, layout.css, index.css)
├── worker/              # Cloudflare Worker backend, separate from frontend
│   ├── index.ts          # dispatches by path prefix, falls back to static assets
│   ├── auth.ts            # session-cookie auth, seeded from Cloudflare Access
│   └── <tool-name>.ts    # one file per tool that needs a backend
├── App.tsx              # mounts the router
└── main.tsx              # DOM entry point
```

A feature's `index.ts` should only export what other code needs to
import it from `routes/router.tsx` (typically just its page
component). New frontend and API paths should be added to
`routes/paths.ts` rather than hardcoded inline.

## Conventions when adding a new tool

1. Create `src/features/<name>/` with only the subfolders it actually
   needs (`components/`, `hooks/`, `services/`, `types/`).
2. Add its page component and register the route in
   `src/routes/router.tsx`.
3. Add one card to the array in `src/features/launcher/data/tools.ts`.
4. If it needs a backend: create `src/worker/<name>.ts`, export a
   handler, and dispatch to it from `src/worker/index.ts` by matching
   on the path prefix (e.g. `/  <name>/api/*`). Do not add logic
   directly into `worker/index.ts` beyond the dispatch itself.
5. If it needs storage, prefer reusing the existing D1 database with a
   new table over introducing a new storage mechanism (KV, R2, etc.)
   unless there's a concrete reason (e.g. binary file storage → R2).
6. Do not touch other tools' folders to add a new one. Each feature
   folder should be deletable on its own without breaking the others.

## Access / auth conventions

- The default posture is: everything under `tools.clewis.tech/*`
  requires login (Cloudflare Access, email OTP).
- Public paths are the exception, not the rule, and must be
  deliberately carved out as a separate, more specific Cloudflare
  Access application with a Bypass policy (e.g. `tools.clewis.tech/bar`
  is public; `tools.clewis.tech/bar/orders` and `.../bar/recipes` are
  not, and inherit the default login requirement).
- App-level session state is a lightweight cookie (`tc_owner`, set by
  `src/worker/auth.ts`) rather than checking the Access header on every
  request. `/auth/login` reads
  `Cf-Access-Authenticated-User-Email` once and, if present, sets the
  session cookie; `/api/auth/status` and `/api/auth/logout` then just
  read/clear that cookie. Do not build a second, parallel auth system —
  extend `worker/auth.ts` instead.
- `worker/auth.ts` has a `localhost` bypass in `handleAuthLogin` that
  sets the session cookie without checking the Access header, so local
  dev works without a real Access login. Do not remove this without
  replacing it with another way to test gated routes locally.
- On the frontend, use the `useAuthStatus` hook (`src/hooks/`) to read
  login state — don't call `/api/auth/status` directly from feature
  code.
- Never make a new path public by default. If a tool has both a public
  and a private surface, keep them on visibly distinct paths (e.g.
  `/bar` vs `/bar/orders`) so the Access policy split stays obvious
  from the URL alone.

## What not to do

- Don't add a build step, framework, or dependency not already in
  `package.json` without asking first.
- Don't restructure the feature-folder layout — it was chosen
  deliberately over a flatter structure because this project is
  several independent tools sharing one shell, not one cohesive app.
- Don't commit secrets, API tokens, or `.dev.vars` files.
- Don't deploy (`npm run deploy` / `wrangler deploy`) without being
  asked to — building and testing locally is fine and encouraged, but
  pushing live changes to a running Worker is an explicit action, not
  a default.
- Don't add tracking, analytics, or telemetry — this is a private,
  single-user tool.
