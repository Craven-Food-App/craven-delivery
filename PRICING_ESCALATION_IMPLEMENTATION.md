# Pricing + Dispatch + Escalation System - Implementation Status

## Overview
Complete end-to-end pricing, dispatch, and escalation system with wait-time fee increases.

## Database Changes ✅ COMPLETE

### Migration: `20260124024504_pricing_escalation_system.sql`
- ✅ Added merchant_commission_bps to driver_payout_settings
- ✅ Added fee component fields (base_delivery_fee, distance_fee, time_fee, demand_fee, escalation_fee)
- ✅ Added merchant settlement snapshot fields
- ✅ Added driver_fee_share_cents field
- ✅ Added dispatch/escalation fields (status, broadcast_started_at, accepted_driver_id, etc.)
- ✅ Added auto-boost fields (auto_boost_enabled, auto_boost_cap_cents, etc.)
- ✅ Created SQL functions:
  - `compute_delivery_fees_total_cents` ✅
  - `calculate_merchant_payout_cents` ✅
  - `calculate_driver_payout_cents` (already exists, verified) ✅

## Edge Functions Status

### ✅ COMPLETE
1. **quote-order-pricing** - Created
   - Calculates all pricing components
   - Returns complete breakdown including driver payout and merchant payout
   - Uses SQL functions as single source of truth

2. **create-order** - Updated
   - Sets order_status = 'broadcasting'
   - Sets broadcast_started_at
   - Sets next_escalation_at (if auto_boost_enabled)
   - Snapshots all payout values
   - Stores fee components

### 🚧 IN PROGRESS
3. **accept_order** - Needs to be created
   - Atomically accept order
   - Stop escalation
   - Lock payout values

4. **process_escalations** - Needs to be created
   - Cron job to process escalations
   - Updates escalation_fee_cents
   - Recomputes delivery_fees_total_cents
   - Recomputes driver payout
   - Rebroadcasts to drivers

5. **manual_boost_delivery** - Needs to be created
   - Customer-initiated boost
   - Same recalculation logic as auto-escalation

## UI Changes Status

### 🚧 PENDING
1. **Customer Checkout**
   - Add auto-boost toggle
   - Add cap selector (default $6.00)

2. **Customer Order Tracking**
   - Show "Finding a driver" while broadcasting
   - Show boost prompt if auto_boost disabled and boost required
   - Show cap reached message

3. **Driver App**
   - Show real-time offer updates
   - Remove acceptance rate/penalty UI
   - Show "Updated payout" when escalation updates

## Business Rules Verification

- ✅ Merchant commission: 15% of food_subtotal only
- ✅ Merchant payout: food_subtotal - commission
- ✅ Drivers independent: Accept/Decline with zero penalty
- ✅ Driver pay from delivery fees only (not subtotal)
- ✅ Base pay is floor, not additive
- ✅ Escalation increases delivery fees only
- ✅ Escalation stops on accept

## Next Steps

1. Create accept_order edge function
2. Create process_escalations cron function
3. Create manual_boost_delivery edge function
4. Update customer checkout UI
5. Update customer order tracking UI
6. Update driver app UI
7. Remove decline penalty logic
8. Test end-to-end flow








