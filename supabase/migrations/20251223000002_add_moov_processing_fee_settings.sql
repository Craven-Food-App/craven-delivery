-- Add Moov processing fee configuration to commission_settings

alter table public.commission_settings
  add column if not exists moov_card_processing_percent numeric(5,2) default 2.70;

alter table public.commission_settings
  add column if not exists moov_ach_processing_percent numeric(5,2) default 0.50;

alter table public.commission_settings
  add column if not exists moov_rtp_processing_percent numeric(5,2);

-- Optional flag to indicate whether processing fee should include tip in the base
alter table public.commission_settings
  add column if not exists moov_processing_applies_to_full_amount boolean default true;

comment on column public.commission_settings.moov_card_processing_percent is
  'Configured Moov processing fee percentage for card payments (applied to customer charge).';

comment on column public.commission_settings.moov_ach_processing_percent is
  'Configured Moov processing fee percentage for ACH payments (applied to customer charge).';

comment on column public.commission_settings.moov_rtp_processing_percent is
  'Configured Moov processing fee percentage for RTP / instant payments (applied to customer charge).';

comment on column public.commission_settings.moov_processing_applies_to_full_amount is
  'If true, processing fee is calculated on the full customer charge including tip; otherwise on the core amount only.';


