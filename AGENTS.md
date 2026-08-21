# AGENTS.md

## Cursor Cloud specific instructions

This repo is a **polyglot monorepo** for the "Crave'N" food/grocery/retail/courier delivery
marketplace. The primary product is the **root web app** (React 18 + Vite 7 + TypeScript) served
from `/workspace` (`src/`). Optional satellite pieces live under `apps/*` (Capacitor apps),
`server/` (Express API sidecar), `chat-backend/` (Flask), and `chat-frontend/` (CRA).

Node 22 and npm 10 work fine. Dependencies are installed at the repo root by the startup update
script (`npm install`); nested `apps/*`, `chat-frontend`, and `chat-backend` have their own
manifests and are NOT installed by default.

### Main web app (primary dev target)
- Run: `npm run dev` → Vite dev server on `http://localhost:8080` (see `vite.config.ts`).
- It talks to a **hosted Supabase** project whose URL + anon key are hardcoded in
  `src/integrations/supabase/client.ts`, so it works out of the box with **no env vars / no local
  backend**. Email signup on this hosted project **auto-confirms** (a new account is immediately
  logged in and redirected to `/restaurants`).
- The marketplace data on the hosted project is largely empty — restaurants render as
  "Not on Crave'n yet" placeholders and most category pages are empty. This is expected repo
  state, not a bug. The customer landing page is `/`; the browse marketplace is `/restaurants`;
  auth is `/auth`.

### Optional Express API server (`server/`)
- Run alongside the web app with `npm run dev:all`, or standalone with `npm run dev:server`
  (port 3001; Vite proxies `/api/*` → `localhost:3001`). Needed only for `/api/*` features
  (documents, hub invites, support/Stripe webhook, mail sync).
- Gotcha: the server calls `assertMailCredentialsKeyConfigured()` on boot and **throws unless
  `MAIL_CREDENTIALS_KEY` is set**. For local dev, put `MAIL_CREDENTIALS_KEY=<any-long-random-string>`
  in a root `.env` (loaded via `server/env.ts`) before starting it. Full mail/Stripe features need
  additional SMTP/Supabase/Stripe env vars.

### Lint / type-check / test (standard scripts in `package.json`)
- `npm run lint` currently reports thousands of **pre-existing** errors across the repo
  (including generated `supabase/functions/*` and `temp_*.tsx` files). Treat this as known repo
  state; the CI pipeline (`.github/workflows/production-deploy.yml`) runs tests with
  `continue-on-error: true`.
- `npm run type-check` (tsc `--noEmit`) passes.
- `npm run test:unit` (Vitest) — the tooling works, but 3 suites fail on a fresh checkout for
  pre-existing reasons: two `tests/*.spec.ts` files are Playwright e2e specs (import
  `@playwright/test`, which is not installed) that Vitest tries to collect, and
  `src/__tests__/MobileDriverDashboard.test.tsx` references `jest.fn()` in a Vitest environment.
  `npm run test:e2e` (`playwright test`) requires Playwright, which is not a dependency.

### Notes
- `.npmrc` sets `ignore-scripts=true`, so the `postinstall` step (a `cap sync android` for
  `apps/feeder`) is skipped during install — this is desirable in this environment.
- Both `bun.lock*` and `package-lock.json` exist; use **npm** (matches `.npmrc` and CI).
