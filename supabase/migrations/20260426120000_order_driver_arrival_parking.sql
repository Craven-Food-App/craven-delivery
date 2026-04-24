-- Feeder/realtime presence for merchant tablet: when driver marks arrived at store and curbside spot (retail).

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS driver_arrived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pickup_parking_spot TEXT;

COMMENT ON COLUMN public.orders.driver_arrived_at IS
  'Set when the assigned feeder marks arrived at the pickup location (merchant sees via realtime).';
COMMENT ON COLUMN public.orders.pickup_parking_spot IS
  'Curbside / parking spot label or number the feeder selected (retail pickup).';
