# tools.clewis.tech

React + TypeScript launcher page, built with Vite and deployed as a
Cloudflare Worker (static assets).

## One-time setup (new machine / first time only)

```bash
npm install -g wrangler   # Cloudflare's CLI
cd tools-clewis
npm install                # installs React, Vite, the Cloudflare Vite plugin, etc.
npx wrangler login          # opens a browser to authorize your Cloudflare account
```

## Local development

```bash
npm run dev
```
Runs Vite's dev server with hot reload at `http://localhost:5173`.

To test it running exactly as it will on Cloudflare (Worker + static
assets together):
```bash
npm run build
npx wrangler dev
```

## Deploy

```bash
npm run deploy
```
This builds the React app and deploys it in one step. First deploy gives
you a `tools-clewis.<your-subdomain>.workers.dev` URL.

## Point tools.clewis.tech at it

Cloudflare dashboard → Workers & Pages → tools-clewis → Settings →
Domains & Routes → Add Custom Domain → `tools.clewis.tech`.

## Project structure

Feature-based: each tool is a self-contained folder under
`src/features/`, with a shared launcher page and a Cloudflare Worker
backend alongside the frontend. See `AGENTS.md` for the full layout,
conventions for adding a new tool, and Access/auth details — it's kept
up to date and is the source of truth for coding agents working in
this repo.

```
src/
  features/
    launcher/         ← the tools grid page
      data/tools.ts    ← the list of tools shown on the launcher
    <tool-name>/       ← one folder per tool, e.g. bar/
  routes/router.tsx    ← path → page registration
  worker/              ← Cloudflare Worker backend
    index.ts            ← dispatches requests by path prefix
    auth.ts              ← Access-backed session cookie
index.html             ← Vite entry point
wrangler.jsonc         ← Cloudflare Worker config
```

## Adding a new tool card

Add an entry to the `tools` array in
`src/features/launcher/data/tools.ts`:

```ts
{
  ref: 'A4',
  title: 'New Tool',
  description: 'What it does, one line.',
  href: '/new-tool/',
  status: 'Active',
  public: false,
}
```

Each tool's actual app lives in its own `src/features/<name>/` folder
and Worker route once built — this page is just the index.

## Auth in local dev

Cloudflare Access gates the site in production. Locally, `wrangler
dev`/`vite dev` requests hit `src/worker/auth.ts`'s `localhost`
bypass, which sets the session cookie without a real Access login, so
gated routes work without extra setup.
