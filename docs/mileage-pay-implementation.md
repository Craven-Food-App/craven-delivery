# Mileage Pay for Test Orders

## Overview
Test orders sent from the Live Driver Testing portal now include mileage pay calculations. This ensures that the Gas Money feature accurately reflects earnings from delivery distance.

## Implementation Details

### 1. Mileage Pay Calculation
- **Rate**: $0.67 per mile (IRS standard mileage rate for 2024-2026)
- **Formula**: `mileage_pay_cents = Math.round(distance_miles * 67)`
- **Conversion**: Distance is converted from kilometers to miles (km * 0.621371)

### 2. Database Changes
- **New Column**: `mileage_pay_cents` added to `orders` table
- **Type**: INTEGER, defaults to 0
- **Index**: Added for efficient querying of orders with mileage pay
- **Migration**: `20260201130000_add_mileage_pay_to_orders.sql`

### 3. Edge Function Updates
**File**: `supabase/functions/create-test-order/index.ts`

Changes:
- Calculate mileage pay based on `distanceKm` parameter
- Include `mileage_pay_cents` in order insert
- Add `mileage_pay_cents` to notification payload sent to driver

### 4. Test Order Flow

When sending a test order:
1. Distance is provided (defaults to 3.2 km)
2. Mileage pay is calculated: `3.2 km * 0.621371 * $0.67 = $1.33`
3. Order is created with `mileage_pay_cents` field
4. Driver receives notification with mileage pay info
5. When order is completed, mileage pay should accumulate in `driver_gas_money` table

### 5. Gas Money Integration

The mileage pay from test orders will:
- Show up in the "Gas Money" card on the Earnings Dashboard
- Be stored in the `driver_gas_money` table
- Be transferable to the driver's Feeder card via the transfer modal
- Add to the driver's complete earnings

### 6. Example Calculations

| Distance | Miles | Mileage Pay |
|----------|-------|-------------|
| 1 km     | 0.62  | $0.42       |
| 3.2 km   | 2.0   | $1.34       |
| 5 km     | 3.1   | $2.08       |
| 10 km    | 6.2   | $4.15       |

## Future Enhancements

1. **Order Completion Hook**: Ensure mileage pay is automatically accumulated to `driver_gas_money` when orders are marked as delivered
2. **Real Orders**: Extend mileage pay calculation to all delivery orders, not just test orders
3. **Variable Rates**: Support different mileage rates based on vehicle type or location
4. **Reporting**: Add mileage pay breakdown to driver earnings reports

## Testing

To test mileage pay:
1. Navigate to Testing Portal → Live Driver Testing
2. Select an online driver
3. Send a test order (default 3.2 km)
4. Driver should see mileage pay in the order details
5. After completing the order, check Earnings → Gas Money card
6. Mileage pay should be reflected in the Gas Money balance

## Notes

- Test orders are marked with `is_test: true`
- Mileage pay is separate from base payout
- IRS standard rate as of 2024-2026: $0.67/mile
- Distance is stored in kilometers, but mileage pay uses miles

