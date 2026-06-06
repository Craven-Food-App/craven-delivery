
ALTER TABLE public.order_support_threads
  ADD COLUMN IF NOT EXISTS driver_id uuid,
  ADD COLUMN IF NOT EXISTS driver_included boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS assigned_agent_id uuid,
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS last_message_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS unread_for_support integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unread_for_merchant integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unread_for_customer integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unread_for_driver integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subject text;

ALTER TABLE public.order_support_messages
  ADD COLUMN IF NOT EXISTS attachment_url text;

CREATE OR REPLACE FUNCTION public.is_support_agent(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.exec_users
    WHERE user_id = _user_id
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text IN ('admin','support','customer_service','founder')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_support_agent(uuid) TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.bump_support_thread_on_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.order_support_threads
  SET
    last_message_at = NEW.created_at,
    updated_at = now(),
    unread_for_support  = CASE WHEN NEW.sender_role <> 'support'  THEN unread_for_support  + 1 ELSE 0 END,
    unread_for_merchant = CASE WHEN NEW.sender_role <> 'merchant' THEN unread_for_merchant + 1 ELSE unread_for_merchant END,
    unread_for_customer = CASE WHEN NEW.sender_role <> 'customer' THEN unread_for_customer + 1 ELSE unread_for_customer END,
    unread_for_driver   = CASE WHEN NEW.sender_role <> 'driver'   THEN unread_for_driver   + 1 ELSE unread_for_driver END
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bump_support_thread ON public.order_support_messages;
CREATE TRIGGER trg_bump_support_thread
AFTER INSERT ON public.order_support_messages
FOR EACH ROW EXECUTE FUNCTION public.bump_support_thread_on_message();

CREATE OR REPLACE FUNCTION public.mark_support_thread_read(_thread_id uuid, _role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.order_support_threads
  SET
    unread_for_support  = CASE WHEN _role = 'support'  THEN 0 ELSE unread_for_support  END,
    unread_for_merchant = CASE WHEN _role = 'merchant' THEN 0 ELSE unread_for_merchant END,
    unread_for_customer = CASE WHEN _role = 'customer' THEN 0 ELSE unread_for_customer END,
    unread_for_driver   = CASE WHEN _role = 'driver'   THEN 0 ELSE unread_for_driver   END
  WHERE id = _thread_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_support_thread_read(uuid, text) TO authenticated;

DROP POLICY IF EXISTS "Support agents manage all threads" ON public.order_support_threads;
CREATE POLICY "Support agents manage all threads"
ON public.order_support_threads
FOR ALL
TO authenticated
USING (public.is_support_agent(auth.uid()))
WITH CHECK (public.is_support_agent(auth.uid()));

DROP POLICY IF EXISTS "Support agents manage all messages" ON public.order_support_messages;
CREATE POLICY "Support agents manage all messages"
ON public.order_support_messages
FOR ALL
TO authenticated
USING (public.is_support_agent(auth.uid()))
WITH CHECK (public.is_support_agent(auth.uid()));

DROP POLICY IF EXISTS "Drivers see their threads" ON public.order_support_threads;
CREATE POLICY "Drivers see their threads"
ON public.order_support_threads
FOR SELECT
TO authenticated
USING (driver_id = auth.uid() AND driver_included = true);

DROP POLICY IF EXISTS "Drivers post on their threads" ON public.order_support_messages;
CREATE POLICY "Drivers post on their threads"
ON public.order_support_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_role = 'driver'
  AND sender_user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.order_support_threads t
    WHERE t.id = thread_id AND t.driver_id = auth.uid() AND t.driver_included = true
  )
);

DROP POLICY IF EXISTS "Drivers read messages on their threads" ON public.order_support_messages;
CREATE POLICY "Drivers read messages on their threads"
ON public.order_support_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.order_support_threads t
    WHERE t.id = thread_id AND t.driver_id = auth.uid() AND t.driver_included = true
  )
);

CREATE INDEX IF NOT EXISTS idx_support_threads_last_msg ON public.order_support_threads (last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_threads_status ON public.order_support_threads (status);
CREATE INDEX IF NOT EXISTS idx_support_threads_assigned ON public.order_support_threads (assigned_agent_id);
