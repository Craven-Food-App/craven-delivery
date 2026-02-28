# Feeder dev server (optional)

Run the Feeder app dev server from this folder:

```bash
cd apps/feeder
npm install   # once
npm run dev
```

Then open **http://localhost:5174** (port 5174 to avoid clashing with root on 8080).

## What was added (can remove after verifying)

- `package.json` – scripts: `dev`, `build`, `preview`; deps for Feeder UI
- `vite.config.ts` – alias `@` → root `src`, port 5174
- `index.html` – entry HTML
- `src/main.tsx` – Feeder-only routes (same as App.tsx feeder subdomain block)
- `tsconfig.json` – path `@/*` → `../../src/*`
- `postcss.config.js` – Tailwind + autoprefixer
- `tailwind.config.ts` – content includes `../../src/**` so root components get Tailwind

**Root and Android app are unchanged.** The Android Feeder app still uses the root build + `npm run feeder:build` / `feeder:sync` from the repo root. This setup is for local web-only development.
