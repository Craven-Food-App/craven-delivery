-- Executive Onboarding & Governance System
-- Creates tables for CFO, CXO, and CTO document acknowledgments

-- CFO Documents Registry
CREATE TABLE IF NOT EXISTS public.cfo_documents (
  document_key TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  file_path_html TEXT,
  file_path_pdf TEXT,
  file_path_markdown TEXT,
  version TEXT DEFAULT '1.0',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- CFO Acknowledgments
CREATE TABLE IF NOT EXISTS public.cfo_acknowledgments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_key TEXT NOT NULL REFERENCES public.cfo_documents(document_key) ON DELETE CASCADE,
  signed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  version TEXT DEFAULT '1.0',
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(user_id, document_key)
);

-- CFO Document View Log (optional tracking)
CREATE TABLE IF NOT EXISTS public.cfo_documents_view_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_key TEXT NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  duration_seconds INTEGER
);

-- CXO Documents Registry
CREATE TABLE IF NOT EXISTS public.cxo_documents (
  document_key TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  file_path_html TEXT,
  file_path_pdf TEXT,
  file_path_markdown TEXT,
  version TEXT DEFAULT '1.0',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- CXO Acknowledgments
CREATE TABLE IF NOT EXISTS public.cxo_acknowledgments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_key TEXT NOT NULL REFERENCES public.cxo_documents(document_key) ON DELETE CASCADE,
  signed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  version TEXT DEFAULT '1.0',
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(user_id, document_key)
);

-- CXO Document View Log
CREATE TABLE IF NOT EXISTS public.cxo_documents_view_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_key TEXT NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  duration_seconds INTEGER
);

-- CTO Documents Registry
CREATE TABLE IF NOT EXISTS public.cto_documents (
  document_key TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  file_path_html TEXT,
  file_path_pdf TEXT,
  file_path_markdown TEXT,
  version TEXT DEFAULT '1.0',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- CTO Acknowledgments
CREATE TABLE IF NOT EXISTS public.cto_acknowledgments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_key TEXT NOT NULL REFERENCES public.cto_documents(document_key) ON DELETE CASCADE,
  signed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  version TEXT DEFAULT '1.0',
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(user_id, document_key)
);

-- CTO Document View Log
CREATE TABLE IF NOT EXISTS public.cto_documents_view_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_key TEXT NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  duration_seconds INTEGER
);

-- Enable RLS on all tables
ALTER TABLE public.cfo_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cfo_acknowledgments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cfo_documents_view_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cxo_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cxo_acknowledgments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cxo_documents_view_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cto_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cto_acknowledgments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cto_documents_view_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for CFO
CREATE POLICY "CFO can view all CFO documents"
  ON public.cfo_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.exec_users
      WHERE user_id = auth.uid() AND role = 'cfo'
    )
  );

CREATE POLICY "CFO can view own acknowledgments"
  ON public.cfo_acknowledgments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "CFO can insert own acknowledgments"
  ON public.cfo_acknowledgments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.exec_users
      WHERE user_id = auth.uid() AND role = 'cfo'
    )
  );

CREATE POLICY "CFO can log document views"
  ON public.cfo_documents_view_log FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.exec_users
      WHERE user_id = auth.uid() AND role = 'cfo'
    )
  );

-- RLS Policies for CXO
CREATE POLICY "CXO can view all CXO documents"
  ON public.cxo_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.exec_users
      WHERE user_id = auth.uid() AND role = 'cxo'
    )
  );

CREATE POLICY "CXO can view own acknowledgments"
  ON public.cxo_acknowledgments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "CXO can insert own acknowledgments"
  ON public.cxo_acknowledgments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.exec_users
      WHERE user_id = auth.uid() AND role = 'cxo'
    )
  );

CREATE POLICY "CXO can log document views"
  ON public.cxo_documents_view_log FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.exec_users
      WHERE user_id = auth.uid() AND role = 'cxo'
    )
  );

-- RLS Policies for CTO
CREATE POLICY "CTO can view all CTO documents"
  ON public.cto_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.exec_users
      WHERE user_id = auth.uid() AND role = 'cto'
    )
  );

CREATE POLICY "CTO can view own acknowledgments"
  ON public.cto_acknowledgments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "CTO can insert own acknowledgments"
  ON public.cto_acknowledgments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.exec_users
      WHERE user_id = auth.uid() AND role = 'cto'
    )
  );

CREATE POLICY "CTO can log document views"
  ON public.cto_documents_view_log FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.exec_users
      WHERE user_id = auth.uid() AND role = 'cto'
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cfo_acknowledgments_user_id ON public.cfo_acknowledgments(user_id);
CREATE INDEX IF NOT EXISTS idx_cfo_acknowledgments_document_key ON public.cfo_acknowledgments(document_key);
CREATE INDEX IF NOT EXISTS idx_cxo_acknowledgments_user_id ON public.cxo_acknowledgments(user_id);
CREATE INDEX IF NOT EXISTS idx_cxo_acknowledgments_document_key ON public.cxo_acknowledgments(document_key);
CREATE INDEX IF NOT EXISTS idx_cto_acknowledgments_user_id ON public.cto_acknowledgments(user_id);
CREATE INDEX IF NOT EXISTS idx_cto_acknowledgments_document_key ON public.cto_acknowledgments(document_key);

COMMENT ON TABLE public.cfo_documents IS 'Registry of CFO governance documents';
COMMENT ON TABLE public.cfo_acknowledgments IS 'CFO document acknowledgments and signatures';
COMMENT ON TABLE public.cxo_documents IS 'Registry of CXO governance documents';
COMMENT ON TABLE public.cxo_acknowledgments IS 'CXO document acknowledgments and signatures';
COMMENT ON TABLE public.cto_documents IS 'Registry of CTO governance documents';
COMMENT ON TABLE public.cto_acknowledgments IS 'CTO document acknowledgments and signatures';

