CREATE TABLE IF NOT EXISTS public.order_support_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL,
  customer_user_id uuid,
  channel text NOT NULL DEFAULT 'call' CHECK (channel IN ('call','message')),
  customer_included boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','closed')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ost_order ON public.order_support_threads(order_id);
CREATE INDEX IF NOT EXISTS idx_ost_restaurant ON public.order_support_threads(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_ost_customer ON public.order_support_threads(customer_user_id) WHERE customer_included = true;

GRANT SELECT, INSERT, UPDATE ON public.order_support_threads TO authenticated;
GRANT ALL ON public.order_support_threads TO service_role;

ALTER TABLE public.order_support_threads ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_restaurant_member(_restaurant_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = _restaurant_id AND r.owner_id = _user_id
  )
  OR EXISTS (
    SELECT 1 FROM public.restaurant_users ru
    WHERE ru.restaurant_id = _restaurant_id AND ru.user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_craven_support(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role IN ('admin','support','customer_service','ceo','coo')
  );
$$;

CREATE POLICY "Merchant view order support threads"
  ON public.order_support_threads FOR SELECT TO authenticated
  USING (public.is_restaurant_member(restaurant_id, auth.uid()));

CREATE POLICY "Merchant create order support threads"
  ON public.order_support_threads FOR INSERT TO authenticated
  WITH CHECK (public.is_restaurant_member(restaurant_id, auth.uid()));

CREATE POLICY "Merchant update order support threads"
  ON public.order_support_threads FOR UPDATE TO authenticated
  USING (public.is_restaurant_member(restaurant_id, auth.uid()));

CREATE POLICY "Support full access threads"
  ON public.order_support_threads FOR ALL TO authenticated
  USING (public.is_craven_support(auth.uid()))
  WITH CHECK (public.is_craven_support(auth.uid()));

CREATE POLICY "Included customer view thread"
  ON public.order_support_threads FOR SELECT TO authenticated
  USING (customer_included = true AND customer_user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.order_support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.order_support_threads(id) ON DELETE CASCADE,
  sender_role text NOT NULL CHECK (sender_role IN ('merchant','support','customer','system')),
  sender_user_id uuid,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_osm_thread ON public.order_support_messages(thread_id, created_at);

GRANT SELECT, INSERT ON public.order_support_messages TO authenticated;
GRANT ALL ON public.order_support_messages TO service_role;

ALTER TABLE public.order_support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants read messages"
  ON public.order_support_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.order_support_threads t
      WHERE t.id = thread_id
        AND (
          public.is_restaurant_member(t.restaurant_id, auth.uid())
          OR public.is_craven_support(auth.uid())
          OR (t.customer_included AND t.customer_user_id = auth.uid())
        )
    )
  );

CREATE POLICY "Participants post messages"
  ON public.order_support_messages FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.order_support_threads t
      WHERE t.id = thread_id
        AND (
          (sender_role = 'merchant' AND public.is_restaurant_member(t.restaurant_id, auth.uid()))
          OR (sender_role = 'support' AND public.is_craven_support(auth.uid()))
          OR (sender_role = 'customer' AND t.customer_included AND t.customer_user_id = auth.uid())
          OR (sender_role = 'system' AND public.is_craven_support(auth.uid()))
        )
    )
  );

CREATE OR REPLACE FUNCTION public.touch_order_support_thread()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE public.order_support_threads SET updated_at = now() WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_ost ON public.order_support_messages;
CREATE TRIGGER trg_touch_ost
AFTER INSERT ON public.order_support_messages
FOR EACH ROW EXECUTE FUNCTION public.touch_order_support_thread();

ALTER PUBLICATION supabase_realtime ADD TABLE public.order_support_threads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_support_messages;
