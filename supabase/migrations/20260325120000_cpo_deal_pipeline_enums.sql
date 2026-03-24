-- CPO deal pipeline — extend enums ONLY (separate migration so values commit before USE; avoids 55P04).

ALTER TYPE public.partnership_status ADD VALUE IF NOT EXISTS 'contacted';
ALTER TYPE public.partnership_status ADD VALUE IF NOT EXISTS 'in_talks';
ALTER TYPE public.partnership_status ADD VALUE IF NOT EXISTS 'negotiating';
ALTER TYPE public.partnership_status ADD VALUE IF NOT EXISTS 'verbal_agreement';
ALTER TYPE public.partnership_status ADD VALUE IF NOT EXISTS 'signed';
ALTER TYPE public.partnership_status ADD VALUE IF NOT EXISTS 'lost';

ALTER TYPE public.partnership_type ADD VALUE IF NOT EXISTS 'strategic_distribution';
ALTER TYPE public.partnership_type ADD VALUE IF NOT EXISTS 'demand';
ALTER TYPE public.partnership_type ADD VALUE IF NOT EXISTS 'infrastructure';
