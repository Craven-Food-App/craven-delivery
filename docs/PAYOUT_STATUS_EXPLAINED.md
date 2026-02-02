# Payout Status - How It Works

## Overview
The Payout Status section in the Earnings Dashboard tracks the lifecycle of driver earnings from earned → available → pending → paid.

## Three Status Categories

### 1. Available for Payout
**What it is:** Earnings that have been completed but not yet paid out

**Calculation:**
```
Available = Total Earnings - (Paid + Pending)
```

**Includes:**
- Base pay from completed deliveries
- Distance pay (mileage earnings)
- Tips from customers
- Bonuses and adjustments
- **Test order earnings** (immediately available)

**When it updates:**
- Immediately when a delivery is completed
- Immediately when test orders are created (marked as "delivered")
- When mileage pay is added to earnings

### 2. Pending
**What it is:** Earnings that are being processed for payout

**Status values:** `pending` in `driver_payouts` table

**When it happens:**
- When a payout is initiated but not yet completed
- During bank transfer processing (typically 1-3 business days)
- During Stripe transfer processing

**When it updates:**
- When driver requests a cash-out/payout
- When automated daily payouts are processed
- When payout status changes from pending → completed

### 3. Paid
**What it is:** Earnings that have been successfully paid out to the driver

**Status values:** `completed` or `sent` in `driver_payouts` table

**When it updates:**
- When bank transfer completes
- When Stripe payout arrives in driver's account
- When payout batch is marked as completed

## Database Schema

### driver_earnings
```sql
CREATE TABLE driver_earnings (
  id UUID,
  driver_id UUID,
  order_id UUID,
  amount_cents INTEGER,     -- Base pay
  tip_cents INTEGER,        -- Tips
  total_cents INTEGER,      -- Total payout (includes mileage)
  payout_cents INTEGER,     -- Final driver payout
  earned_at TIMESTAMP
)
```

### driver_payouts
```sql
CREATE TABLE driver_payouts (
  id UUID,
  driver_id UUID,
  amount DECIMAL(10,2),      -- Payout amount in dollars
  status TEXT,               -- 'pending', 'sent', 'completed', 'failed'
  batch_id UUID,
  processed_at TIMESTAMP,
  created_at TIMESTAMP
)
```

## How Test Orders Work

### Immediate Earnings
Test orders create `driver_earnings` records immediately:
```typescript
{
  amount_cents: 500,              // $5.00 base pay
  tip_cents: randomTip,           // 10-25% of subtotal
  total_cents: 500 + mileage + tip,
  payout_cents: 500 + mileage + tip
}
```

### Immediate Availability
- Test orders are marked as `order_status = "delivered"` immediately
- Triggers fire automatically to accumulate mileage pay
- Earnings show as **Available for Payout** right away
- No need to complete delivery flow

### Gas Money Integration
- Mileage pay goes to Gas Money balance
- Still counts toward Total Earnings
- Available for transfer to Feeder card anytime

## Example Calculation

### Scenario
- Driver completes 3 test orders
- Total Earnings: $21.50
  - Base Pay: $15.00 ($5 × 3)
  - Distance Pay: $3.50 (mileage from 3 deliveries)
  - Tips: $3.00
- No payouts yet

### Payout Status Shows
```
Available for Payout: $21.50
Pending: $0.00
Paid: $0.00
```

### After Requesting $10 Cash-Out
```
Available for Payout: $11.50  ($21.50 - $10.00)
Pending: $10.00               (being processed)
Paid: $0.00
```

### After Payout Completes
```
Available for Payout: $11.50
Pending: $0.00
Paid: $10.00                  (successfully paid)
```

## Implementation Details

### Data Flow
1. Order completed → `driver_earnings` created
2. Mileage pay → `driver_gas_money` accumulated (via trigger)
3. Total earnings calculated from `driver_earnings.total_cents`
4. Payout status calculated from `driver_payouts` table
5. Available = Total - (Pending + Paid)

### Real-time Updates
- Payout Status refreshes when:
  - Earnings page loads
  - Time range changes (Today, This Week, Last Week)
  - After completing a delivery
  - After test order is created

### Error Handling
- If `driver_payouts` table query fails, defaults to:
  - Available: Total Earnings
  - Pending: $0.00
  - Paid: $0.00
- Gracefully handles missing records
- Never shows negative amounts (uses `Math.max(0, ...)`)

## Troubleshooting

### Issue: Available for Payout shows $0.00 but earnings exist

**Check:**
1. Verify `driver_earnings` records exist for the driver
2. Check if earnings fall within selected time range
3. Verify payouts aren't incorrectly marked as completed
4. Check browser console for query errors

**Fix:**
```sql
-- Check earnings
SELECT * FROM driver_earnings WHERE driver_id = 'USER_ID';

-- Check payouts
SELECT * FROM driver_payouts WHERE driver_id = 'USER_ID';

-- Calculate expected available
SELECT 
  (SELECT COALESCE(SUM(total_cents), 0) / 100.0 FROM driver_earnings WHERE driver_id = 'USER_ID') AS total_earned,
  (SELECT COALESCE(SUM(amount), 0) FROM driver_payouts WHERE driver_id = 'USER_ID' AND status IN ('completed', 'sent')) AS paid,
  (SELECT COALESCE(SUM(amount), 0) FROM driver_payouts WHERE driver_id = 'USER_ID' AND status = 'pending') AS pending;
```

### Issue: Pending amount stuck

**Possible causes:**
- Payout status not updated after completion
- Bank transfer delayed
- Stripe webhook not received

**Fix:**
- Check payout status in Stripe Dashboard
- Update status in database manually if needed
- Verify webhook endpoints are configured

### Issue: Paid amount doesn't match bank deposits

**Check:**
- Stripe fees or platform fees deducted
- Multiple payouts to different accounts
- Failed payouts that were reversed

## Future Enhancements

### Planned Features
- [ ] Automatic daily payouts
- [ ] Instant cash-out (Express Payout via Stripe)
- [ ] Payout history with transaction details
- [ ] Push notifications when payouts complete
- [ ] Payout preferences (daily, weekly, on-demand)
- [ ] Minimum payout threshold settings

### Gas Money Transfer
- Transfer from Gas Money → Feeder Card
- Transfer from Available → Bank Account
- Transfer from Available → Gas Money (if needed for gas)

