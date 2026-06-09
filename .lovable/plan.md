## Goal

1. During the live feeder/driver test, let **any barcode scan succeed** so the flow can be completed end-to-end.
2. Restore the **rich completion screen** at the end of the delivery: Crave'n "C" car logo, large green total earnings counter, and the full **Clean Pay breakdown** card.

## 1. Auto-accept scans in test mode

File: `src/components/mobile/RetailGroceryPickupFlow.tsx`

- Add `isTestOrder?: boolean` to `RetailGroceryPickupFlowProps`.
- In the live camera detection callback (around lines 429–478), when `isTestOrder` is true, skip the explicit/order-id matching logic: mark the next unscanned package as scanned with the scanned `value`, show the green "Barcode accepted" feedback, and increment `scannedCount`. All real validation paths stay intact for production orders.
- Also relax the manual "Scan next label" fallback (around line 2079) so it remains available in test mode (it already auto-advances, just ensure it isn't gated by anything new).

File: `src/components/mobile/CravenDeliveryFlow.tsx`

- Pass `isTestOrder={isTestOrder}` to every `RetailGroceryPickupFlow` render site (the three locations near lines 2048 / 2083 / 2128 where other test flags are already forwarded).

## 2. Restore the rich completion screen

File: `src/components/mobile/FeederOrderCompleteScreen.tsx` — full rewrite of the body (props unchanged so all callers keep working).

Layout (mobile-first, Crave'n orange theme, responsive, white background):

```text
┌─────────────────────────────┐
│      [Crave'n C car logo]   │   src/assets/craven-c-celebration.png
│       Delivery Complete!    │
│         Order #1234         │
│                             │
│         $ 18.42             │   big animated green counter
│      Total earnings         │
│                             │
│  ┌── Clean Pay Receipt ──┐  │   <FeederCleanPayCard variant="full" …/>
│  │ Delivery pay   $6.00  │  │
│  │ Mileage pay    $4.20  │  │
│  │ Customer tip   $8.22  │  │
│  │ ─────────────────────  │  │
│  │ Final payout  $18.42  │  │
│  │ ✓ Clean Pay Verified  │  │
│  └───────────────────────┘  │
│                             │
│        [ Continue ]         │   orange CTA
└─────────────────────────────┘
```

Implementation details:

- Import `craven-c-celebration.png` from `src/assets` and render it at ~96px, centered, with a soft orange glow.
- Big total uses `text-5xl font-extrabold text-[#16a34a] tabular-nums` and counts up from 0 → `earnings.finalPayoutCents` over ~900ms via `requestAnimationFrame`.
- Render `<FeederCleanPayCard variant="full" orderEarnings={…} showVerificationBadge showAdjustment />` directly under the counter. Build a minimal `FeederCleanPaySummary` from the existing `earnings` prop (delivery / mileage / tip / promo / adjustment / final, plus the three timestamps already in `earnings`) so the card renders without an extra fetch.
- "Continue" button uses Crave'n orange (`bg-[#EA580C] hover:bg-[#C2410C]`) and calls `onContinue`.
- Use semantic Tailwind tokens where available; only hard-code the orange/green brand hues already used elsewhere in the feeder flow.

## Verification

- Run through the feeder live driver test: every scan in the Scan Labels step shows the green "Barcode accepted" overlay and advances the counter.
- Complete the delivery and confirm the final screen shows the C car logo, animated green total, Clean Pay breakdown, and orange Continue button on a 390px-wide viewport.

## Files touched

- `src/components/mobile/RetailGroceryPickupFlow.tsx`
- `src/components/mobile/CravenDeliveryFlow.tsx`
- `src/components/mobile/FeederOrderCompleteScreen.tsx`
