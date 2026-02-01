# Gas Money Feature

## Overview
The Gas Money feature allows feeders to track and manage their mileage earnings separately. This accumulated amount from distance pay can be transferred to their Feeder Card or kept as a dedicated fund for fuel expenses.

## Features

### 1. **Gas Money Display**
- Located next to "Your Earnings" in the Earnings Dashboard
- Shows accumulated mileage pay in a green-themed card
- Clickable to open transfer modal
- Visual distinction from regular earnings

### 2. **Transfer Modal**
When clicked, the Gas Money card opens a modal with:
- Current gas money balance display
- Transfer amount input field
- Quick percentage buttons (25%, 50%, 75%, All)
- Destination display (Feeder Card)
- Transfer and Cancel buttons
- Informational text about gas money usage

### 3. **Database Schema**

#### `driver_gas_money` Table
- `id`: UUID primary key
- `driver_id`: UUID reference to auth.users
- `balance`: INTEGER (cents) - current available balance
- `total_accumulated`: INTEGER (cents) - lifetime accumulated
- `total_transferred`: INTEGER (cents) - lifetime transferred
- `created_at`, `updated_at`: Timestamps

#### `gas_money_transactions` Table
- `id`: UUID primary key
- `driver_id`: UUID reference to auth.users
- `amount_cents`: INTEGER
- `transaction_type`: TEXT ('accumulate', 'transfer', 'adjustment')
- `destination`: TEXT ('feeder_card', 'bank', etc.)
- `status`: TEXT ('pending', 'completed', 'failed')
- `notes`: TEXT
- `created_at`: Timestamp

### 4. **API Endpoints**

#### `transfer-gas-money` Edge Function
**Purpose**: Transfer gas money to Feeder Card

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
  "message": "Gas money transferred successfully",
  "amount_cents": 1000,
  "new_balance": 5000
}
```

### 5. **Functions**

#### `accumulate_gas_money(p_driver_id UUID, p_amount_cents INTEGER)`
- Automatically accumulates gas money from distance pay
- Creates transaction record
- Updates driver balance

## Usage Flow

1. **Accumulation**: Distance pay automatically accumulates in gas money balance
2. **View**: Feeder sees gas money total next to earnings
3. **Transfer**: Click gas money card to open modal
4. **Select Amount**: Enter custom amount or use quick percentage buttons
5. **Confirm**: Transfer to Feeder Card instantly
6. **Use**: Funds available on Feeder Card for any purpose

## Business Logic

- Gas money = Distance Pay earnings
- Still counts toward total earnings
- Can be transferred to Feeder Card at any time
- Transfer is instant and free
- Tracks lifetime accumulation and transfers
- RLS policies ensure drivers only access their own data

## Security

- Row Level Security (RLS) enabled on all tables
- Drivers can only view/update their own gas money
- Transfer function validates user authorization
- All transactions logged for audit trail

## Future Enhancements

1. Direct bank transfer option
2. Gas station integration for direct payment
3. Automatic transfer rules (e.g., transfer 50% weekly)
4. Tax reporting for mileage deductions
5. Fuel price alerts and recommendations
6. Integration with gas rewards programs

## Technical Notes

- All amounts stored in cents (INTEGER) for precision
- Timestamps use TIMESTAMPTZ for timezone awareness
- Unique constraint on driver_id in driver_gas_money
- Indexes on driver_id and created_at for performance
- Edge function uses Deno and Supabase client
- CORS headers configured for web access

## Testing Checklist

- [ ] Gas money displays correctly next to earnings
- [ ] Click opens transfer modal
- [ ] Balance shows accumulated distance pay
- [ ] Transfer amount validation works
- [ ] Percentage buttons calculate correctly
- [ ] Transfer updates both gas money and card balance
- [ ] Transaction history records transfers
- [ ] RLS policies prevent unauthorized access
- [ ] Error handling for insufficient balance
- [ ] Toast notifications display correctly

