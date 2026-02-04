# Earnings Cashout Feature

## Overview
The Earnings Cashout feature allows feeders to instantly transfer their available earnings to their Feeder Card. This provides immediate access to earned income, similar to the Gas Money transfer functionality.

## Features

### 1. **Clickable Your Earnings Card**
- Located in the Earnings Dashboard (left card in the dual-card layout)
- Shows total available earnings
- Clickable to open cashout modal
- Visual hover effect (`hover:shadow-md`) for interactivity
- Displays "Net earnings" subtitle

### 2. **Earnings Cashout Modal**
When the Your Earnings card is clicked, a modal opens with:
- Current available balance display
- Cash out amount input field
- Quick percentage buttons (25%, 50%, 75%, All)
- Destination display (Feeder Card with current balance)
- Cash Out and Cancel buttons
- Informational text about instant availability

### 3. **Visual Design**
- **Header Icon**: Orange circle with DollarSign icon
- **Balance Card**: Orange gradient (from-orange-50 to-orange-100) with orange border
- **Destination Card**: Purple-themed to match Feeder Card branding
- **Action Button**: Orange button labeled "Cash Out"

### 4. **Database Integration**

#### Tables Used
- `driver_earnings`: Source of available earnings
- `driver_payouts`: Records all cashout transactions

#### Available Balance Calculation
```
Available Balance = Total Earnings - Total Paid Out
Total Earnings = SUM(driver_earnings.total_cents)
Total Paid Out = SUM(driver_payouts.amount_cents WHERE status IN ['pending', 'in_transit', 'paid'])
```

### 5. **API Endpoints**

#### `transfer-earnings` Edge Function
**Purpose**: Transfer available earnings to Feeder Card

**Request**:
```json
{
  "driver_id": "uuid",
  "amount_cents": 1000
}
```

**Response**:
```json
{
  "success": true,
  "message": "Earnings transferred successfully",
  "amount_cents": 1000,
  "new_available_balance": 5000,
  "payout_id": "uuid"
}
```

**Process**:
1. Validates user authorization
2. Calculates available balance from `driver_earnings`
3. Subtracts already paid-out amounts from `driver_payouts`
4. Validates sufficient balance
5. Creates new payout record with status 'paid'
6. Returns success with updated balance

### 6. **Implementation Details**

#### Frontend Components Modified
- `src/components/mobile/EarningsDashboard.tsx`
- `apps/customer/src/components/mobile/EarningsDashboard.tsx`

#### State Management
```typescript
// Earnings Cashout state
const [showEarningsModal, setShowEarningsModal] = useState(false);
const [earningsCashoutAmount, setEarningsCashoutAmount] = useState('');
```

#### Handler Function
```typescript
const handleTransferEarnings = async () => {
  // Validates amount
  // Checks available balance
  // Calls transfer-earnings edge function
  // Updates local state
  // Shows success toast
  // Refreshes data
}
```

### 7. **User Flow**

1. **Feeder views Earnings Dashboard**
   - Sees "Your Earnings" card with total available balance
   - Card shows net earnings amount

2. **Feeder clicks "Your Earnings" card**
   - Modal opens showing available balance
   - Displays current Feeder Card balance as destination

3. **Feeder enters amount or selects percentage**
   - Can manually enter amount
   - Or click quick buttons: 25%, 50%, 75%, All
   - Input validates against available balance

4. **Feeder clicks "Cash Out"**
   - Transfer processed via edge function
   - Payout record created in database
   - Local state updated immediately
   - Success toast notification shown
   - Balance refreshed

5. **Funds available instantly**
   - Feeder Card balance updated
   - Available earnings reduced
   - Can use funds anywhere Visa accepted

### 8. **Validation & Security**

- **Authentication Required**: User must be signed in
- **Authorization Check**: Can only transfer own earnings
- **Balance Validation**: Cannot exceed available balance
- **Amount Validation**: Must be positive, valid number
- **Input Sanitization**: parseFloat with error handling

### 9. **Differences from Gas Money**

| Feature | Gas Money | Earnings Cashout |
|---------|-----------|------------------|
| Source | Mileage/distance pay only | All earnings (base + tips + distance + bonuses) |
| Balance Tracking | `driver_gas_money.balance` | Calculated from `driver_earnings` - `driver_payouts` |
| Color Theme | Green | Orange |
| Button Label | Transfer | Cash Out |
| Transaction Type | `gas_money_transactions` | `driver_payouts` |

### 10. **Future Enhancements**

#### Stripe Integration
Currently the edge function creates payout records but doesn't execute actual Stripe transfers. Production implementation should:

```typescript
// In transfer-earnings edge function
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '');
await stripe.transfers.create({
  amount: amount_cents,
  currency: 'usd',
  destination: driver_stripe_account_id,
  description: 'Earnings transfer to Feeder Card',
});
```

#### Payout History
- Show cashout transaction history
- Display payout status tracking
- Export payout statements

#### Payout Limits
- Daily/weekly cashout limits
- Minimum cashout amounts
- Fee structure for instant transfers

## Testing

### Manual Testing Checklist
- [ ] Click Your Earnings card opens modal
- [ ] Available balance displays correctly
- [ ] Quick percentage buttons calculate correctly
- [ ] Cannot cashout more than available balance
- [ ] Cannot cashout negative or zero amounts
- [ ] Transfer updates Feeder Card balance
- [ ] Transfer reduces available earnings
- [ ] Success toast notification appears
- [ ] Modal closes after successful transfer
- [ ] Cancel button closes modal without transfer

### Edge Cases
- Zero available balance
- Partial transfers
- Concurrent transfers
- Network failures during transfer
- Database errors

## Related Documentation
- [Gas Money Feature](./gas-money-feature.md)
- [Payout Status Explained](./PAYOUT_STATUS_EXPLAINED.md)
- [Feeder Card Documentation](./feeder-card.md) (if exists)

## Changelog

### 2026-02-03
- **Initial Implementation**: Added clickable Your Earnings card with cashout modal
- **Edge Function**: Created `transfer-earnings` endpoint
- **Database**: Integrated with existing `driver_earnings` and `driver_payouts` tables
- **UI/UX**: Orange-themed modal matching platform design system





