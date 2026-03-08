-- ============================================================================
-- Merchant Partnership Requests (enterprise demand capture)
-- Per-request data for reporting and merchant outreach.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.merchant_partnership_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_master_id uuid NOT NULL REFERENCES public.restaurants_master(id) ON DELETE CASCADE,
  -- Requester (optional for anonymous; use email or user_id)
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  requester_email text,
  requester_name text,
  -- Strategic metrics for merchant report
  order_frequency text CHECK (order_frequency IN ('weekly', '2_3_per_month', 'monthly', 'rarely')),
  would_refer text CHECK (would_refer IN ('yes', 'probably', 'maybe', 'no')),
  what_matters_most text[],
  message_to_business text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_merchant_partnership_requests_master ON public.merchant_partnership_requests(restaurant_master_id);
CREATE INDEX IF NOT EXISTS idx_merchant_partnership_requests_created ON public.merchant_partnership_requests(created_at DESC);

COMMENT ON TABLE public.merchant_partnership_requests IS 'Structured demand signals per business for partnership outreach and merchant reports.';

-- RLS: allow insert from anon/authenticated; select only for service or admin
ALTER TABLE public.merchant_partnership_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "merchant_partnership_requests_insert" ON public.merchant_partnership_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "merchant_partnership_requests_select_service" ON public.merchant_partnership_requests
  FOR SELECT USING (auth.jwt() ->> 'role' = 'service_role');

-- Allow authenticated users with admin/company access to read (optional; adjust by your role names)
-- For now, app will use service_role or a dedicated RPC for portal.
CREATE POLICY "merchant_partnership_requests_select_authenticated" ON public.merchant_partnership_requests
  FOR SELECT USING (auth.role() = 'authenticated');

GRANT ALL ON public.merchant_partnership_requests TO service_role;
GRANT INSERT, SELECT ON public.merchant_partnership_requests TO anon, authenticated;

-- RPC: Submit partnership request (insert + increment request_count)
CREATE OR REPLACE FUNCTION public.submit_partnership_request(
  p_restaurant_master_id uuid,
  p_requester_email text DEFAULT NULL,
  p_requester_name text DEFAULT NULL,
  p_order_frequency text DEFAULT NULL,
  p_would_refer text DEFAULT NULL,
  p_what_matters_most text[] DEFAULT NULL,
  p_message_to_business text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_id uuid;
  v_count int;
BEGIN
  IF p_restaurant_master_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Restaurant required');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.restaurants_master
    WHERE id = p_restaurant_master_id AND status IN ('REQUESTABLE', 'COMING_SOON', 'LEAD_READY')
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Business not available for requests');
  END IF;

  INSERT INTO public.merchant_partnership_requests (
    restaurant_master_id,
    user_id,
    requester_email,
    requester_name,
    order_frequency,
    would_refer,
    what_matters_most,
    message_to_business
  ) VALUES (
    p_restaurant_master_id,
    auth.uid(),
    NULLIF(TRIM(p_requester_email), ''),
    NULLIF(TRIM(p_requester_name), ''),
    p_order_frequency,
    p_would_refer,
    p_what_matters_most,
    NULLIF(TRIM(p_message_to_business), '')
  )
  RETURNING id INTO v_request_id;

  -- Bump aggregate count and last_requested_at
  PERFORM public.request_restaurant(p_restaurant_master_id);
  SELECT request_count INTO v_count FROM public.restaurants_master WHERE id = p_restaurant_master_id;

  RETURN jsonb_build_object('ok', true, 'request_id', v_request_id, 'request_count', v_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_partnership_request(uuid, text, text, text, text, text[], text) TO anon, authenticated;
