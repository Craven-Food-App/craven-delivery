-- Add DELETE policy for internal_messages (sender can delete their own messages)
CREATE POLICY "Users can delete their own messages"
ON public.internal_messages
FOR DELETE
TO authenticated
USING (sender_id = auth.uid());

-- Add DELETE policy for internal_message_attachments (sender can delete attachments on their messages)
CREATE POLICY "Users can delete attachments on their messages"
ON public.internal_message_attachments
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.internal_messages m
    WHERE m.id = internal_message_attachments.message_id
    AND m.sender_id = auth.uid()
  )
);