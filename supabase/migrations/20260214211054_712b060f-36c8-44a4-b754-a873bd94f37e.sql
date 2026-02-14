
-- Table to store feeder's external debit cards for cashout
CREATE TABLE public.driver_debit_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL,
  card_last4 TEXT NOT NULL,
  card_brand TEXT NOT NULL DEFAULT 'visa',
  card_holder_name TEXT NOT NULL,
  stripe_payment_method_id TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.driver_debit_cards ENABLE ROW LEVEL SECURITY;

-- Policies: drivers can only manage their own cards
CREATE POLICY "Drivers can view their own debit cards"
  ON public.driver_debit_cards FOR SELECT
  USING (auth.uid() = driver_id);

CREATE POLICY "Drivers can add their own debit cards"
  ON public.driver_debit_cards FOR INSERT
  WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Drivers can update their own debit cards"
  ON public.driver_debit_cards FOR UPDATE
  USING (auth.uid() = driver_id);

CREATE POLICY "Drivers can delete their own debit cards"
  ON public.driver_debit_cards FOR DELETE
  USING (auth.uid() = driver_id);

-- Trigger for updated_at
CREATE TRIGGER update_driver_debit_cards_updated_at
  BEFORE UPDATE ON public.driver_debit_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
