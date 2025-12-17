-- Backfill investor_interests from existing investor_access_requests
-- This migration ensures that historical investor submissions appear in Investor Relations

DO $$
DECLARE
  default_opportunity_id UUID;
  access_request RECORD;
  mapped_investor_type TEXT;
  existing_interest_id UUID;
BEGIN
  -- Find the default investment opportunity (prefer Craven Delivery, fallback to first active)
  SELECT id INTO default_opportunity_id
  FROM investment_opportunities
  WHERE is_active = true
    AND company_name = 'Craven Delivery'
  LIMIT 1;

  -- If no Craven Delivery found, get first active opportunity
  IF default_opportunity_id IS NULL THEN
    SELECT id INTO default_opportunity_id
    FROM investment_opportunities
    WHERE is_active = true
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  -- If still no opportunity found, we can't backfill
  IF default_opportunity_id IS NULL THEN
    RAISE NOTICE 'No active investment opportunity found. Skipping backfill.';
    RETURN;
  END IF;

  RAISE NOTICE 'Using investment opportunity ID: % for backfill', default_opportunity_id;

  -- Loop through all existing investor_access_requests
  FOR access_request IN 
    SELECT 
      id,
      user_id,
      full_name,
      email,
      investor_type,
      organization,
      location,
      notes,
      status,
      created_at
    FROM investor_access_requests
    ORDER BY created_at ASC
  LOOP
    -- Map investor_type from access_requests format to investor_interests format
    CASE access_request.investor_type
      WHEN 'angel' THEN mapped_investor_type := 'angel';
      WHEN 'strategic' THEN mapped_investor_type := 'corporate';
      WHEN 'institutional' THEN mapped_investor_type := 'vc';
      ELSE mapped_investor_type := 'other';
    END CASE;

    -- Check if this interest already exists (by email and opportunity_id)
    SELECT id INTO existing_interest_id
    FROM investor_interests
    WHERE email = access_request.email
      AND opportunity_id = default_opportunity_id
    LIMIT 1;

    -- Only insert if it doesn't already exist
    IF existing_interest_id IS NULL THEN
      INSERT INTO investor_interests (
        opportunity_id,
        user_id,
        full_name,
        email,
        phone,
        company_name,
        investor_type,
        investment_range,
        message,
        status,
        notes,
        source,
        shortlisted,
        created_at
      ) VALUES (
        default_opportunity_id,
        access_request.user_id,
        access_request.full_name,
        access_request.email,
        NULL, -- phone not available in access_requests
        access_request.organization,
        mapped_investor_type,
        NULL, -- investment_range not available in access_requests
        access_request.notes,
        CASE 
          WHEN access_request.status = 'approved' THEN 'contacted'
          WHEN access_request.status = 'rejected' THEN 'declined'
          ELSE 'new'
        END,
        NULL, -- notes field in investor_interests is for internal notes, not user notes
        'investor_access_form',
        false,
        access_request.created_at
      );

      RAISE NOTICE 'Backfilled investor interest for: % (%)', access_request.full_name, access_request.email;
    ELSE
      RAISE NOTICE 'Skipping duplicate interest for: % (%)', access_request.full_name, access_request.email;
    END IF;
  END LOOP;

  RAISE NOTICE 'Backfill completed successfully.';
END $$;

