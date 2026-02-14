
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

-- Drop trigger if exists to avoid errors
DROP TRIGGER IF EXISTS trg_generate_card_credentials ON driver_cards;

CREATE TRIGGER trg_generate_card_credentials
  BEFORE INSERT ON driver_cards
  FOR EACH ROW
  EXECUTE FUNCTION generate_card_credentials();

-- Add unique constraint
ALTER TABLE driver_cards ADD CONSTRAINT driver_cards_card_number_unique UNIQUE (card_number);
