# Two-stage Feeder Status + Verified Handoff Reveal

Right now, the merchant sees "En route" the instant a Feeder accepts an order, the handoff code is visible to the merchant before anything is verified, and the Feeder's photo / car details are always visible. This plan introduces:

1. A real **Start Route** action so the merchant first sees "Feeder assigned" and only flips to "En route" when the Feeder taps Start Route.
2. A generated **6-digit handoff code** shown right above the QR in the Feeder app, scannable (QR) **or** typed/entered by the merchant.
3. A **handoff verification gate** — nothing in the pickup flow proceeds until the code is scanned/entered by the merchant.
4. After verification, the **Feeder photo, name, and vehicle details are revealed** to the merchant for visual confirmation.

---

## What changes

### Database (`orders` table)
- Add `feeder_route_started_at timestamptz` — set when Feeder taps Start Route.
- Ensure `pickup_code` is a 6-digit numeric string (generated automatically when an order moves to `confirmed`/`preparing` if missing).
- Ensure `pickup_confirmed_at` represents merchant verification (already exists, reused).

### Feeder app — `CravenDeliveryFlow` + `DeliveryFlowStepTwo`
- Step One ("Head to merchant") gets an explicit **Start Route** slide/button. Until it's tapped, status stays "assigned"; tapping it:
  - writes `feeder_route_started_at`
  - logs `en_route_to_store` forensic event
  - advances UI to navigation view
- Step Two ("At merchant") shows the **6-digit code above the QR** with copy + a "Show to merchant or let them scan" caption. Items checklist + Start Hand-off Check stays disabled until `pickup_confirmed_at` is set.

### Merchant portal — `MerchantLiveOrders`
- Feeder card / modal badge logic:
  - has driver, no `feeder_route_started_at` → **"Feeder assigned"** (gray/blue)
  - has `feeder_route_started_at`, no `driver_arrived_at` → **"En route"**
  - has `driver_arrived_at`, no `pickup_confirmed_at` → **"At store"**
  - has `pickup_confirmed_at` → **"Handoff verified"**
- Replace the always-visible Feeder block until handoff verified with a **"Verify handoff" panel**:
  - 6-digit code input + "Scan QR" button (camera modal using existing `DeliveryCamera`/`html5-qrcode` if present, else manual entry only)
  - On match, writes `pickup_confirmed_at = now()`, logs `support_action` w/ `merchant_handoff_verified`, and the Feeder identity card (photo, name, make/model/plate) replaces the input panel.
- "Confirm Feeder pickup" CTA stays, but is only enabled after handoff verified.

### Forensics
- New tracking events: `route_started`, `handoff_code_verified`, `handoff_code_failed` (logged via existing `logOrderEvent`).

---

## Out of scope (ask if you want it)
- Native QR scanner for merchant tablet beyond camera-based decode (uses `BarcodeDetector` API w/ manual fallback).
- Driver identity reveal to the customer (this plan reveals it only to merchant).
- Changing how `pickup_code` is generated for already-existing orders mid-flight (a one-time backfill can be added).

Ready to build — confirm and I'll ship it.
