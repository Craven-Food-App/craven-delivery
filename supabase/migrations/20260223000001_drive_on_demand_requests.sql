-- Store Drive On-Demand sign-up requests from merchants
CREATE TABLE IF NOT EXISTS public.drive_on_demand_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  terms_accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.drive_on_demand_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Restaurant owners can insert for own restaurant"
  ON public.drive_on_demand_requests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = restaurant_id AND r.owner_id = auth.uid()
    )
  );

CREATE POLICY "Restaurant owners can view own requests"
  ON public.drive_on_demand_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = restaurant_id AND r.owner_id = auth.uid()
    )
  );

CREATE INDEX idx_drive_on_demand_requests_restaurant ON public.drive_on_demand_requests(restaurant_id);
