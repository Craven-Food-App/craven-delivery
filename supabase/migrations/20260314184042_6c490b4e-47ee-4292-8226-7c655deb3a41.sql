
-- Partnership types enum
CREATE TYPE public.partnership_type AS ENUM (
  'restaurant_merchant',
  'strategic_corporate', 
  'technology_integration',
  'revenue_share',
  'co_marketing',
  'vendor',
  'other'
);

-- Partnership status enum
CREATE TYPE public.partnership_status AS ENUM (
  'lead',
  'prospect',
  'negotiation',
  'contract_review',
  'active',
  'on_hold',
  'churned',
  'terminated'
);

-- Main partnerships table
CREATE TABLE public.partnerships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_name TEXT NOT NULL,
  partner_type partnership_type NOT NULL DEFAULT 'other',
  status partnership_status NOT NULL DEFAULT 'lead',
  description TEXT,
  website_url TEXT,
  logo_url TEXT,
  industry TEXT,
  
  -- Deal info
  deal_value NUMERIC(12,2),
  revenue_share_percentage NUMERIC(5,2),
  contract_start_date DATE,
  contract_end_date DATE,
  renewal_date DATE,
  payment_terms TEXT,
  
  -- Ownership
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to TEXT,
  
  -- Scoring
  health_score INTEGER CHECK (health_score >= 0 AND health_score <= 100),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  
  -- Integration reference
  merchant_id UUID,  -- links to existing merchants if applicable
  
  -- Meta
  tags TEXT[],
  metadata JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Partnership contacts
CREATE TABLE public.partnership_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partnership_id UUID NOT NULL REFERENCES public.partnerships(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  title TEXT,
  email TEXT,
  phone TEXT,
  is_primary BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Partnership activities / timeline
CREATE TABLE public.partnership_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partnership_id UUID NOT NULL REFERENCES public.partnerships(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL DEFAULT 'note',
  title TEXT NOT NULL,
  description TEXT,
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Partnership documents
CREATE TABLE public.partnership_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partnership_id UUID NOT NULL REFERENCES public.partnerships(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'contract',
  file_url TEXT,
  file_size_bytes INTEGER,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved', 'signed', 'expired')),
  expires_at TIMESTAMPTZ,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.partnerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partnership_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partnership_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partnership_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies - allow authenticated users with exec/admin roles
CREATE POLICY "Authenticated users can view partnerships"
  ON public.partnerships FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert partnerships"
  ON public.partnerships FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update partnerships"
  ON public.partnerships FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view partnership_contacts"
  ON public.partnership_contacts FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage partnership_contacts"
  ON public.partnership_contacts FOR ALL TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view partnership_activities"
  ON public.partnership_activities FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage partnership_activities"
  ON public.partnership_activities FOR ALL TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view partnership_documents"
  ON public.partnership_documents FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage partnership_documents"
  ON public.partnership_documents FOR ALL TO authenticated
  USING (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_partnership_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_partnerships_updated_at
  BEFORE UPDATE ON public.partnerships
  FOR EACH ROW EXECUTE FUNCTION public.update_partnership_updated_at();

CREATE TRIGGER set_partnership_documents_updated_at
  BEFORE UPDATE ON public.partnership_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_partnership_updated_at();
