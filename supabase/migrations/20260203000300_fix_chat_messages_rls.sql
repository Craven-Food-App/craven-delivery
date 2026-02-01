-- Fix RLS policies for chat_messages to allow drivers to send messages
-- The existing policy should work, but let's ensure it's correct

-- Drop and recreate the INSERT policy for chat_messages
DROP POLICY IF EXISTS "Users can create messages in their conversations" ON public.chat_messages;

CREATE POLICY "Users can create messages in their conversations" 
ON public.chat_messages 
FOR INSERT 
WITH CHECK (
  -- Check if conversation belongs to user OR user is admin
  conversation_id IN (
    SELECT id FROM chat_conversations 
    WHERE (
      auth.uid() = customer_id OR 
      auth.uid() = driver_id OR 
      auth.uid() = admin_id OR
      EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() AND role IN ('admin', 'ceo', 'super_admin')
      )
    )
  ) 
  AND (
    -- User must be the sender (unless it's a system message)
    auth.uid() = sender_id 
    OR sender_id IS NULL  -- Allow system messages
  )
);

-- Also ensure drivers can update their own messages
DROP POLICY IF EXISTS "Users can update messages they sent" ON public.chat_messages;

CREATE POLICY "Users can update messages they sent" 
ON public.chat_messages 
FOR UPDATE 
USING (auth.uid() = sender_id OR sender_id IS NULL);

-- Verify chat_conversations policies allow drivers to create conversations
DROP POLICY IF EXISTS "Drivers can create conversations" ON public.chat_conversations;

CREATE POLICY "Drivers can create conversations" 
ON public.chat_conversations 
FOR INSERT 
WITH CHECK (
  auth.uid() = driver_id 
  OR auth.uid() = customer_id
  OR EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'ceo', 'super_admin')
  )
);

-- Ensure drivers can update their conversations
DROP POLICY IF EXISTS "Users can update their conversations" ON public.chat_conversations;

CREATE POLICY "Users can update their conversations" 
ON public.chat_conversations 
FOR UPDATE 
USING (
  auth.uid() = customer_id OR 
  auth.uid() = driver_id OR 
  auth.uid() = admin_id OR
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'ceo', 'super_admin')
  )
);

