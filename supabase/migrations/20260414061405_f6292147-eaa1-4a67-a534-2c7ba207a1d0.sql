-- Reset Torrance Stroman's rejected documents so they can be re-signed
-- This is a one-time fix for the appointment that was rejected by the secretary

UPDATE executive_documents
SET 
  signature_status = 'pending',
  status = 'generated',
  signed_file_url = NULL,
  signed_at = NULL,
  signed_by_user = NULL,
  signer_roles = NULL,
  signature_token = NULL,
  signature_token_expires_at = NULL
WHERE appointment_id = 'cafc8566-2534-4eb8-8652-6b40903b747f';