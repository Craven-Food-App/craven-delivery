# Gas Money Complete Implementation

## Overview
Complete implementation of the Gas Money feature that tracks mileage earnings (distance pay) from all completed deliveries and allows drivers to transfer funds to their Feeder card at any time, even while actively feeding.

## Key Features

### 1. Mileage Pay = Distance Pay
- **Same Thing**: Mileage earnings and distance pay are the same concept
- **Calculation**: $0.67 per mile (IRS standard rate)
- **Applied To**: All deliveries, including test orders from the testing portal

### 2. Gas Money Accumulation
- **Source**: Total accumulated mileage pay from ALL completed deliveries
- **Storage**: `driver_gas_money` table tracks the balance per driver
- **Automatic**: Triggers accumulate mileage pay when order status changes to 'delivered'

### 3. Transfer Anytime (Unlike DoorDash)
- **No Restrictions**: Drivers can transfer funds WITHOUT ending their feeding session
- **Flexible**: Transfer any amount available, not just the full balance
- **Instant Access**: Click "Your Earnings" or "Gas Money" card anytime to transfer

## Database Schema

### Tables

#### `orders` table
```sql
mileage_pay_cents INTEGER DEFAULT 0
```
- Stores the mileage pay for each order
- Calculated at order creation: `distance_miles * 67 cents`

#### `driver_gas_money` table
```sql
driver_id UUID PRIMARY KEY
balance INTEGER NOT NULL DEFAULT 0
last_earned_at TIMESTAMP
updated_at TIMESTAMP
```
- Tracks accumulated mileage pay per driver
- Balance in cents

#### `gas_money_transactions` table
```sql
driver_id UUID
order_id UUID (nullable)
amount_cents INTEGER
transaction_type TEXT ('earned' | 'transfer')
description TEXT
created_at TIMESTAMP
```
- Logs all gas money activity
- Tracks both earnings and transfers

### Triggers

#### `trigger_accumulate_mileage_pay`
- **Event**: AFTER UPDATE OF order_status ON orders
- **Condition**: When order_status changes to 'delivered'
- **Action**: 
  1. Add `mileage_pay_cents` to `driver_gas_money.balance`
  2. Log transaction in `gas_money_transactions`

#### `trigger_accumulate_mileage_pay_on_insert`
- **Event**: AFTER INSERT ON orders
- **Condition**: When order is created with status 'delivered'
- **Action**: Same as update trigger (handles edge cases)

## Frontend Implementation

### EarningsDashboard.tsx

#### Gas Money Display
```javascript
// Shows accumulated mileage earnings
<div className="bg-white rounded-2xl p-6 shadow-sm cursor-pointer">
  <p className="text-sm text-gray-500 mb-1">Gas Money</p>
  <p className="text-3xl font-bold text-gray-900 mb-1">{formatCurrency(gasMoney)}</p>
  <p className="text-xs text-gray-400">Mileage earnings</p>
</div>
```

#### Distance Pay Calculation
```javascript
earnings.forEach((earning: any) => {
  basePay += (earning.amount_cents || 0) / 100;
  tips += (earning.tip_cents || 0) / 100;
  
  // Add mileage pay (distance pay) from the order
  const order = earning.orders;
  if (order?.mileage_pay_cents) {
    distancePay += order.mileage_pay_cents / 100;
  }
});
```

#### Transfer Modal
- Opens when clicking "Gas Money" card
- Shows current balance
- Allows custom amount or quick transfer buttons
- Calls `transfer-gas-money` Edge Function
- No restrictions while feeding

### MobileDriverDashboard.tsx

#### Order Assignment Payload
```javascript
setCurrentOrderAssignment({
  // ... other fields
  mileage_pay_cents: payload.payload.mileage_pay_cents || 0,
});
```
- Receives mileage pay from test order notifications
- Displays in NewDeliveryRequest component

## Backend Implementation

### Edge Function: create-test-order

#### Mileage Pay Calculation
```typescript
// Calculate mileage pay: $0.67 per mile (IRS standard rate)
const distanceMiles = distanceKm * 0.621371;
const mileagePayCents = Math.round(distanceMiles * 67); // $0.67 per mile = 67 cents
```

#### Order Creation
```typescript
const { data: order, error: orderErr } = await service
  .from("orders")
  .insert({
    // ... other fields
    mileage_pay_cents: mileagePayCents,
  });
```

#### Notification Payload
```typescript
const notificationPayload = {
  // ... other fields
  mileage_pay_cents: mileagePayCents,
};
```

### Edge Function: transfer-gas-money

#### Transfer Logic
1. Validate driver has sufficient gas money balance
2. Deduct from `driver_gas_money.balance`
3. Add to driver's Stripe balance (Feeder card)
4. Log transaction in `gas_money_transactions`

## User Flow

### Earning Mileage Pay

1. Driver accepts and completes a delivery
2. Order status changes to 'delivered'
3. Database trigger fires automatically
4. `mileage_pay_cents` added to `driver_gas_money.balance`
5. Transaction logged in `gas_money_transactions`
6. Gas Money card updates in real-time

### Transferring to Feeder Card

1. Driver clicks "Gas Money" card (anytime, even while feeding)
2. Transfer modal opens showing current balance
3. Driver enters amount or uses quick transfer button
4. Confirms transfer
5. Edge Function processes transfer:
   - Deducts from gas money balance
   - Adds to Feeder card balance
   - Logs transaction
6. Both balances update immediately
7. Driver continues feeding (no interruption)

## Test Order Flow

### From Testing Portal

1. Admin selects online driver
2. Clicks "Send Test Order"
3. `create-test-order` Edge Function:
   - Calculates mileage pay based on distance (default 3.2 km = $1.34)
   - Creates order with `mileage_pay_cents` field
   - Includes mileage pay in notification payload
4. Driver receives notification with mileage pay shown
5. Driver accepts order
6. Driver completes delivery
7. Mileage pay automatically accumulates to Gas Money

## Example Calculations

### Test Order (3.2 km)
```
Distance: 3.2 km = 2.0 miles
Mileage Pay: 2.0 miles × $0.67 = $1.34
```

### Real Delivery (8 km)
```
Distance: 8 km = 4.97 miles
Mileage Pay: 4.97 miles × $0.67 = $3.33
```

### Daily Accumulation
```
Delivery 1: 3.2 km = $1.34
Delivery 2: 5.0 km = $2.08
Delivery 3: 2.5 km = $1.04
Delivery 4: 6.0 km = $2.49
Total Gas Money: $6.95
```

## Key Differences from DoorDash

| Feature | DoorDash | Craven Feeder |
|---------|----------|---------------|
| Access Earnings | Must end dash | Anytime, even while feeding |
| Transfer Restrictions | Full session only | Any amount, anytime |
| Mileage Tracking | Hidden in earnings | Separate "Gas Money" card |
| Transfer Destination | Bank account | Feeder card (instant) |
| Minimum Balance | Usually $25 | No minimum |

## Files Modified

### Frontend
- `src/components/mobile/EarningsDashboard.tsx`
- `apps/customer/src/components/mobile/EarningsDashboard.tsx`
- `src/components/mobile/MobileDriverDashboard.tsx`
- `apps/customer/src/components/mobile/MobileDriverDashboard.tsx`

### Backend
- `supabase/functions/create-test-order/index.ts`

### Database Migrations
- `20260201130000_add_mileage_pay_to_orders.sql`
- `20260201140000_accumulate_mileage_on_delivery.sql`

## Testing Checklist

- [x] Test orders include mileage pay calculation
- [x] Mileage pay appears in notification payload
- [x] Distance Pay shows in Earnings Breakdown
- [x] Gas Money card displays accumulated balance
- [x] Transfer modal opens when clicking Gas Money card
- [x] Transfer works while actively feeding
- [x] Database triggers accumulate mileage pay on delivery
- [x] Transactions are logged correctly
- [ ] End-to-end test: Send test order → Complete → Verify Gas Money → Transfer

## Future Enhancements

1. **Variable Rates**: Support different mileage rates by vehicle type or location
2. **Tax Reporting**: Generate mileage reports for tax purposes
3. **Analytics**: Show mileage trends and fuel efficiency metrics
4. **Notifications**: Alert when gas money reaches certain thresholds
5. **Auto-Transfer**: Option to automatically transfer gas money weekly

