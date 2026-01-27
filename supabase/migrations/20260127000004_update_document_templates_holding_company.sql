-- Update document templates to use "Holding Company" instead of "Invero Business Trust"
-- This updates the board_document_templates table

DO $$
BEGIN
  RAISE NOTICE 'Updating document templates: Trust → Holding Company';

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

  RAISE NOTICE 'Document templates updated successfully';
END $$;

-- Update placeholder definitions
DO $$
BEGIN
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
END $$;

COMMENT ON COLUMN public.board_document_placeholders.placeholder_name IS 
  'Placeholder name used in templates (e.g., {{holding_company_name}}, {{company_name}})';

