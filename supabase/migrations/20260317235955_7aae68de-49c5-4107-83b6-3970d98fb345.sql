-- Insert CRAVEN_EXECUTIVE role for Jason Parcell (CPO)
INSERT INTO public.user_roles (user_id, role)
VALUES ('06847119-d5e5-44dc-a5f4-6b3b677d9423', 'CRAVEN_EXECUTIVE')
ON CONFLICT (user_id, role) DO NOTHING;