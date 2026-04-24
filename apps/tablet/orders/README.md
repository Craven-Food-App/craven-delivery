# Crave'n Tablet Live Orders App

Standalone tablet app for the merchant operations workspace (Live Orders).

## Run

- `npm install`
- `npm run dev`

## Build

- `npm run build`

## Android (Capacitor)

First time only:

- `npx cap add android`

Then for updates:

- `npm run build`
- `npm run sync`
- `npm run open:android`

## Routes

- `/restaurant/auth` merchant sign-in for Live Orders app
- `/live-orders` tablet operations workspace
- `/merchant-portal` existing merchant portal (shared)
