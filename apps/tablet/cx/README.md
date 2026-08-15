# Crave'n CX Tablet

Ops-first tablet app for Crave'n Express (CX) courier merchants: post jobs, active board, realtime alerts.

## Run

- `npm install` (from this folder)
- `npm run dev` (port 8094)
- Or from repo root: `npm run tablet:cx:dev`

## Build

- `npm run build`
- Or: `npm run tablet:cx:build`

## Android (Capacitor)

First time only (after a successful build):

- `npx cap add android`

Then for updates:

- `npm run build`
- `npm run sync`
- `npm run open:android`

## Routes

- `/restaurant/auth` — CX courier sign-in
- `/cx-ops` — ops workspace (post / active / alerts)
- `/merchant-portal` — full courier portal (billing, documents, etc.)
