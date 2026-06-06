
-- 1) Allow 'driver' as a sender role
ALTER TABLE public.order_support_messages
  DROP CONSTRAINT IF EXISTS order_support_messages_sender_role_check;
ALTER TABLE public.order_support_messages
  ADD CONSTRAINT order_support_messages_sender_role_check
  CHECK (sender_role IN ('merchant','support','customer','system','driver'));

-- 2) Driver can create the order chat thread for an order they are assigned to
DROP POLICY IF EXISTS "Drivers create their order threads" ON public.order_support_threads;
CREATE POLICY "Drivers create their order threads"
ON public.order_support_threads
FOR INSERT
TO authenticated
WITH CHECK (
  driver_id = auth.uid()
  AND driver_included = true
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id
      AND (o.driver_id = auth.uid() OR o.accepted_driver_id = auth.uid())
  )
);

-- 3) Driver can update their own thread (join existing, bump last_message_at)
DROP POLICY IF EXISTS "Drivers update their threads" ON public.order_support_threads;
CREATE POLICY "Drivers update their threads"
ON public.order_support_threads
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id
      AND (o.driver_id = auth.uid() OR o.accepted_driver_id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id
      AND (o.driver_id = auth.uid() OR o.accepted_driver_id = auth.uid())
  )
);

-- 4) Driver can also see the thread for any order they are the assigned feeder on,
--    even if driver_included was not yet flipped (so the initial lookup works).
DROP POLICY IF EXISTS "Drivers see order threads they are assigned to"
  ON public.order_support_threads;
CREATE POLICY "Drivers see order threads they are assigned to"
ON public.order_support_threads
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id
      AND (o.driver_id = auth.uid() OR o.accepted_driver_id = auth.uid())
  )
);

-- 5) Allow customers to post into the shared chat (was missing 'driver'-style policy)
DROP POLICY IF EXISTS "Customers post on their chat" ON public.order_support_messages;
CREATE POLICY "Customers post on their chat"
ON public.order_support_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_role = 'customer'
  AND sender_user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.order_support_threads t
    WHERE t.id = thread_id
      AND t.customer_included = true
      AND t.customer_user_id = auth.uid()
  )
);
