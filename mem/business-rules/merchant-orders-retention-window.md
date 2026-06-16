---
name: Merchant Orders 30-Day Window
description: Merchant portal Orders tab shows last 30 days + still-active orders only; older archived orders are accessed by Craven admins, not merchants
type: feature
---
The merchant portal Orders tab (`RestaurantCustomerOrderManagement.tsx`) intentionally loads only:
- Orders from the last 30 days (`created_at >= now() - 30d`), OR
- Any order still in an active status (`pending`, `confirmed`, `preparing`, `ready`, `picked_up`, `out_for_delivery`) regardless of age

Hard cap: `.limit(100)` rows. Do NOT remove the window or the limit — it exists to keep the tab fast (previously pulled every historical order + N+1 queries per order).

Merchants are NOT given a date-range picker, archived sub-tab, or older-order search. Anything older than 30 days is accessed by Craven admins via the internal admin portal — it is not the merchant's responsibility.
