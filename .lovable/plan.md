

# Unique Feeder Card Numbers + Instant Cashout Option

## What Changes

### 1. Database: Add card_number and cvv to driver_cards

Add two new columns to `driver_cards`:
- `card_number` (text, unique, not null) -- 16-digit number starting with "5", auto-generated via a trigger
- `cvv` (text, not null) -- 3-digit number, auto-generated via a trigger
- `expiry_date` (text, not null, default '12/28') -- for future flexibility

A PostgreSQL trigger will fire on INSERT and auto-generate:
- Card number: `'5' || lpad(floor(random() * 10^15)::text, 15, '0')` with a uniqueness retry loop
- CVV: `lpad(floor(random() * 1000)::text, 3, '0')`

This ensures every feeder gets a unique card number without any frontend logic.

### 2. Auto-provision a card row on feeder signup/first load

Update `fetchCardData` in `EarningsDashboard.tsx` to:
- Query `driver_cards` for the current user
- If no row exists, insert one (with a placeholder `issuing_card_id`) -- the trigger auto-fills `card_number`, `cvv`, `expiry_date`
- Display the DB-sourced card number, CVV, and expiry on the Feeder Card UI

Replace the hardcoded values:
```
// BEFORE (hardcoded)
const cardNumber = '5399283309390129';
const expiryDate = '12/28';
const cvv = '847';

// AFTER (from DB)
const [cardNumber, setCardNumber] = useState('');
const [expiryDate, setExpiryDate] = useState('');
const [cvv, setCvv] = useState('');
```

### 3. Instant Cashout to Debit Card on File

Add a compact row directly below the Feeder Card (no extra spacing), containing:
- A small "Instant Cashout" button/link with a credit card icon
- Tapping it opens a modal similar to the earnings cashout but transfers from Feeder Card balance to the feeder's debit card on file (from `payment_methods` table)
- Shows current Feeder Card balance, amount input, and destination (last 4 of debit card)

## Technical Details

### Database Migration SQL

```sql
-- Add columns
ALTER TABLE driver_cards
  ADD COLUMN IF NOT EXISTS card_number text,
  ADD COLUMN IF NOT EXISTS cvv text,
  ADD COLUMN IF NOT EXISTS expiry_date text NOT NULL DEFAULT '12/28';

-- Auto-generate trigger function
CREATE OR REPLACE FUNCTION generate_card_credentials()
RETURNS TRIGGER AS $$
DECLARE
  new_number text;
  attempts int := 0;
BEGIN
  -- Generate unique 16-digit card number starting with 5
  LOOP
    new_number := '5' || lpad(floor(random() * 999999999999999)::bigint::text, 15, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM driver_cards WHERE card_number = new_number);
    attempts := attempts + 1;
    IF attempts > 10 THEN EXIT; END IF;
  END LOOP;
  NEW.card_number := new_number;
  
  -- Generate 3-digit CVV
  NEW.cvv := lpad(floor(random() * 1000)::int::text, 3, '0');
  
  -- Set expiry 4 years from now
  NEW.expiry_date := to_char(now() + interval '4 years', 'MM/YY');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_card_credentials
  BEFORE INSERT ON driver_cards
  FOR EACH ROW
  EXECUTE FUNCTION generate_card_credentials();

-- Add unique constraint
ALTER TABLE driver_cards ADD CONSTRAINT driver_cards_card_number_unique UNIQUE (card_number);
```

### EarningsDashboard.tsx Changes

1. Replace hardcoded card number/cvv/expiry with state variables populated from `driver_cards` query
2. In `fetchCardData`, query `driver_cards` and auto-insert if missing
3. Add instant cashout row right after the card div (line ~755), compact with no extra margin:

```tsx
{/* Instant Cashout Option */}
<div 
  className="flex items-center justify-between px-4 py-2 cursor-pointer"
  onClick={() => setShowInstantCashoutModal(true)}
>
  <div className="flex items-center gap-2">
    <CreditCard className="w-4 h-4 text-orange-500" />
    <span className="text-sm font-medium text-gray-700">
      Instant Cashout to Debit Card
    </span>
  </div>
  <ChevronRight className="w-4 h-4 text-gray-400" />
</div>
```

4. Add a simple modal for instant cashout (amount input, destination card display, confirm button)

### Files Modified

| File | Change |
|------|--------|
| `src/components/mobile/EarningsDashboard.tsx` | Replace hardcoded card data with DB query; add instant cashout row + modal |
| Database migration | Add `card_number`, `cvv`, `expiry_date` columns + auto-generation trigger |

