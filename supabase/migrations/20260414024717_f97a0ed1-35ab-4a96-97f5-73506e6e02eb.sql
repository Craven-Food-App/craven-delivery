
ALTER TABLE public.executive_appointments DROP CONSTRAINT executive_appointments_status_check;

ALTER TABLE public.executive_appointments ADD CONSTRAINT executive_appointments_status_check
CHECK (status = ANY (ARRAY[
  'pending', 'approved', 'active', 'terminated',
  'documents_sent', 'documents_generated',
  'signing_in_progress', 'partially_signed', 'fully_signed',
  'authorized_to_offer', 'offer_accepted',
  'DRAFT', 'SENT_TO_BOARD', 'BOARD_ADOPTED',
  'AWAITING_SIGNATURES', 'READY_FOR_SECRETARY_REVIEW',
  'SECRETARY_APPROVED', 'ACTIVATING', 'ACTIVE'
]));
