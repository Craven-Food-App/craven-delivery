
-- Add Torrance Stroman's exec_users record (his real account)
INSERT INTO public.exec_users (user_id, role, title, officer_status)
VALUES ('8829227c-cd71-459b-a0f6-9b0f0dcb6372', 'ceo', 'Founder & Chief Executive Officer', 'active')
ON CONFLICT (user_id) DO UPDATE SET role = 'ceo', title = 'Founder & Chief Executive Officer', officer_status = 'active';

-- Add Torrance as Board Director in board_members
INSERT INTO public.board_members (full_name, email, role_title, appointment_date, status, user_id, signing_completed)
VALUES ('Torrance Stroman', 'tstroman.ceo@cravenusa.com', 'Board Director & Secretary', '2025-11-16', 'Active', '8829227c-cd71-459b-a0f6-9b0f0dcb6372', true)
ON CONFLICT DO NOTHING;
