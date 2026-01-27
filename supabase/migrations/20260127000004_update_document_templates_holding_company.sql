-- Update document templates to use "Holding Company" instead of "Invero Business Trust"
-- This is a safe migration that only updates tables if they exist

DO $$
BEGIN
  RAISE NOTICE 'Starting Holding Company document template updates...';

  -- Check if board_document_templates table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'board_document_templates'
  ) THEN
    RAISE NOTICE 'Found board_document_templates table, updating...';
    
    -- Update Shareholders Agreement template
    UPDATE public.board_document_templates
    SET 
      template_content = REPLACE(
        REPLACE(
          REPLACE(template_content, 
            'Invero Business Trust (Irrevocable Trust)', 
            'Holding Company'),
          'Invero Business Trust', 
          'Holding Company'),
        'founder_trust_name', 
        'holding_company_name'
      ),
      updated_at = NOW()
    WHERE template_name = 'shareholders_agreement'
       OR template_content ILIKE '%Invero Business Trust%';

    -- Update Founders Agreement template
    UPDATE public.board_document_templates
    SET 
      template_content = REPLACE(
        REPLACE(
          REPLACE(
            REPLACE(template_content, 
              '{{founder_trust_name}}      = "Invero Business Trust"', 
              '{{holding_company_name}}      = "Holding Company"'),
            '{{founder_trust_name}}', 
            '{{holding_company_name}}'),
          'Invero Business Trust (Irrevocable Trust)', 
          'Holding Company'),
        'Invero Business Trust', 
        'Holding Company'
      ),
      updated_at = NOW()
    WHERE template_name = 'founders_agreement'
       OR template_content ILIKE '%founder_trust_name%';

    -- Update Cap Table templates
    UPDATE public.board_document_templates
    SET 
      template_content = REPLACE(
        REPLACE(template_content, 
          'Invero Business Trust (Irrevocable Trust)', 
          'Holding Company'),
        'Invero Business Trust', 
        'Holding Company'
      ),
      updated_at = NOW()
    WHERE template_content ILIKE '%Invero Business Trust%';

    RAISE NOTICE 'board_document_templates updated successfully';
  ELSE
    RAISE NOTICE 'board_document_templates table does not exist, skipping template updates';
  END IF;

  -- Check if board_documents table exists and update html_template
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'board_documents'
  ) THEN
    RAISE NOTICE 'Found board_documents table, updating existing documents...';
    
    -- Check which column to update (html_template or content)
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'board_documents'
      AND column_name = 'html_template'
    ) THEN
      UPDATE public.board_documents
      SET 
        html_template = REPLACE(
          REPLACE(
            REPLACE(
              REPLACE(html_template, 
                'Invero Business Trust (Irrevocable Trust)', 
                'Holding Company'),
              'Invero Business Trust', 
              'Holding Company'),
            '{{founder_trust_name}}', 
            '{{holding_company_name}}'),
          'founder_trust_name', 
          'holding_company_name'
        ),
        updated_at = NOW()
      WHERE html_template ILIKE '%Invero Business Trust%'
         OR html_template ILIKE '%founder_trust_name%';
      
      RAISE NOTICE 'board_documents.html_template updated successfully';
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'board_documents'
      AND column_name = 'content'
    ) THEN
      UPDATE public.board_documents
      SET 
        content = REPLACE(
          REPLACE(
            REPLACE(
              REPLACE(content, 
                'Invero Business Trust (Irrevocable Trust)', 
                'Holding Company'),
              'Invero Business Trust', 
              'Holding Company'),
            '{{founder_trust_name}}', 
            '{{holding_company_name}}'),
          'founder_trust_name', 
          'holding_company_name'
        ),
        updated_at = NOW()
      WHERE content ILIKE '%Invero Business Trust%'
         OR content ILIKE '%founder_trust_name%';
      
      RAISE NOTICE 'board_documents.content updated successfully';
    ELSE
      RAISE NOTICE 'board_documents table exists but has no html_template or content column';
    END IF;
  ELSE
    RAISE NOTICE 'board_documents table does not exist, skipping document updates';
  END IF;

  RAISE NOTICE 'Document template updates completed';
END $$;

-- Update placeholder definitions (if table exists)
DO $$
BEGIN
  -- Check if board_document_placeholders table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'board_document_placeholders'
  ) THEN
    RAISE NOTICE 'Found board_document_placeholders table, updating placeholders...';
    
    -- Check if we need to add holding_company_name placeholder
    IF EXISTS (
      SELECT 1 FROM public.board_document_placeholders 
      WHERE placeholder_name = 'founder_trust_name'
    ) THEN
      -- Update existing placeholder
      UPDATE public.board_document_placeholders
      SET 
        placeholder_name = 'holding_company_name',
        description = 'Name of the holding company (majority shareholder)',
        default_value = 'Holding Company',
        updated_at = NOW()
      WHERE placeholder_name = 'founder_trust_name';
      
      RAISE NOTICE 'Updated placeholder: founder_trust_name → holding_company_name';
    ELSE
      -- Insert new placeholder if it doesn't exist
      INSERT INTO public.board_document_placeholders (
        placeholder_name,
        description,
        default_value,
        required
      ) VALUES (
        'holding_company_name',
        'Name of the holding company (majority shareholder)',
        'Holding Company',
        true
      ) ON CONFLICT DO NOTHING;
      
      RAISE NOTICE 'Created new placeholder: holding_company_name';
    END IF;

    -- Update trust_state to holding_company_state if exists
    IF EXISTS (
      SELECT 1 FROM public.board_document_placeholders 
      WHERE placeholder_name = 'trust_state'
    ) THEN
      UPDATE public.board_document_placeholders
      SET 
        placeholder_name = 'holding_company_state',
        description = 'State where the holding company is organized',
        updated_at = NOW()
      WHERE placeholder_name = 'trust_state';
      
      RAISE NOTICE 'Updated placeholder: trust_state → holding_company_state';
    END IF;

    -- Update founder_trust_equity_percent to holding_company_equity_percent if exists
    IF EXISTS (
      SELECT 1 FROM public.board_document_placeholders 
      WHERE placeholder_name = 'founder_trust_equity_percent'
    ) THEN
      UPDATE public.board_document_placeholders
      SET 
        placeholder_name = 'holding_company_equity_percent',
        description = 'Equity percentage held by the holding company',
        default_value = '58.00',  -- 40.6M / 70M
        updated_at = NOW()
      WHERE placeholder_name = 'founder_trust_equity_percent';
      
      RAISE NOTICE 'Updated placeholder: founder_trust_equity_percent → holding_company_equity_percent';
    END IF;
    
    -- Add comment if column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'board_document_placeholders'
      AND column_name = 'placeholder_name'
    ) THEN
      COMMENT ON COLUMN public.board_document_placeholders.placeholder_name IS 
        'Placeholder name used in templates (e.g., {{holding_company_name}}, {{company_name}})';
    END IF;
    
    RAISE NOTICE 'board_document_placeholders updated successfully';
  ELSE
    RAISE NOTICE 'board_document_placeholders table does not exist, skipping placeholder updates';
  END IF;
END $$;

