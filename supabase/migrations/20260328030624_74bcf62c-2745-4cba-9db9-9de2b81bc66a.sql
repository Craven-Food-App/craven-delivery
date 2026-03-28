-- Make thread_root_id nullable with a default of null
ALTER TABLE public.internal_messages ALTER COLUMN thread_root_id DROP NOT NULL;
ALTER TABLE public.internal_messages ALTER COLUMN thread_root_id SET DEFAULT NULL;