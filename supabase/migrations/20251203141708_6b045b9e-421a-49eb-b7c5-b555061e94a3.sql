-- Create CFO acknowledgments table
CREATE TABLE IF NOT EXISTS public.cfo_acknowledgments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_key TEXT NOT NULL,
  typed_full_name TEXT NOT NULL,
  agreed_checkbox BOOLEAN NOT NULL DEFAULT false,
  signed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  version TEXT DEFAULT '1.0',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, document_key)
);

-- Create CTO acknowledgments table
CREATE TABLE IF NOT EXISTS public.cto_acknowledgments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_key TEXT NOT NULL,
  typed_full_name TEXT NOT NULL,
  agreed_checkbox BOOLEAN NOT NULL DEFAULT false,
  signed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  version TEXT DEFAULT '1.0',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, document_key)
);

-- Create CXO acknowledgments table
CREATE TABLE IF NOT EXISTS public.cxo_acknowledgments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_key TEXT NOT NULL,
  typed_full_name TEXT NOT NULL,
  agreed_checkbox BOOLEAN NOT NULL DEFAULT false,
  signed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  version TEXT DEFAULT '1.0',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, document_key)
);

-- Enable RLS
ALTER TABLE public.cfo_acknowledgments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cto_acknowledgments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cxo_acknowledgments ENABLE ROW LEVEL SECURITY;

-- RLS policies for CFO acknowledgments
CREATE POLICY "Users can view own cfo acknowledgments" ON public.cfo_acknowledgments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cfo acknowledgments" ON public.cfo_acknowledgments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS policies for CTO acknowledgments
CREATE POLICY "Users can view own cto acknowledgments" ON public.cto_acknowledgments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cto acknowledgments" ON public.cto_acknowledgments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS policies for CXO acknowledgments
CREATE POLICY "Users can view own cxo acknowledgments" ON public.cxo_acknowledgments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cxo acknowledgments" ON public.cxo_acknowledgments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_cfo_ack_user_id ON public.cfo_acknowledgments(user_id);
CREATE INDEX idx_cfo_ack_document_key ON public.cfo_acknowledgments(document_key);
CREATE INDEX idx_cto_ack_user_id ON public.cto_acknowledgments(user_id);
CREATE INDEX idx_cto_ack_document_key ON public.cto_acknowledgments(document_key);
CREATE INDEX idx_cxo_ack_user_id ON public.cxo_acknowledgments(user_id);
CREATE INDEX idx_cxo_ack_document_key ON public.cxo_acknowledgments(document_key);