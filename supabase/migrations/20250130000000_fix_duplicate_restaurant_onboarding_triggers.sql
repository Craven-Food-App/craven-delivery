-- Fix duplicate restaurant_onboarding_progress triggers
-- This migration removes the duplicate trigger and ensures only one trigger creates the onboarding progress

-- Step 1: Remove the duplicate trigger (keep initialize_restaurant_onboarding as it's more complete)
DROP TRIGGER IF EXISTS create_onboarding_progress_trigger ON restaurants;

-- Step 2: Update initialize_restaurant_onboarding to handle conflicts gracefully
CREATE OR REPLACE FUNCTION public.initialize_restaurant_onboarding()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert onboarding progress with ON CONFLICT to prevent duplicates
  INSERT INTO restaurant_onboarding_progress (
    restaurant_id,
    menu_preparation_status,
    business_info_verified,
    go_live_ready
  ) VALUES (
    NEW.id,
    'not_started',
    false,
    false
  )
  ON CONFLICT (restaurant_id) DO NOTHING;
  
  -- Initialize go-live checklist with default items (only if not exists)
  INSERT INTO restaurant_go_live_checklist (restaurant_id, item_key, item_name, item_description, is_required, is_blocker)
  VALUES
    (NEW.id, 'menu_items', 'Add menu items', 'At least 10 menu items required', TRUE, TRUE),
    (NEW.id, 'business_verified', 'Business verification', 'Business documents verified by admin', TRUE, TRUE),
    (NEW.id, 'banking_info', 'Banking information', 'Complete banking details for payouts', TRUE, TRUE),
    (NEW.id, 'store_hours', 'Store hours', 'Set operating hours', TRUE, TRUE),
    (NEW.id, 'logo_uploaded', 'Upload logo', 'Store logo uploaded', TRUE, FALSE),
    (NEW.id, 'header_uploaded', 'Upload header image', 'Store header image uploaded', FALSE, FALSE),
    (NEW.id, 'delivery_settings', 'Delivery settings', 'Configure delivery radius and fees', TRUE, FALSE)
  ON CONFLICT (restaurant_id, item_key) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Step 3: Clean up any existing duplicate restaurant_onboarding_progress records
-- Keep the first one created for each restaurant
DELETE FROM restaurant_onboarding_progress
WHERE id NOT IN (
  SELECT DISTINCT ON (restaurant_id) id
  FROM restaurant_onboarding_progress
  ORDER BY restaurant_id, created_at ASC
);

-- Step 4: Ensure the trigger exists (it should already exist, but this ensures it)
DROP TRIGGER IF EXISTS trigger_initialize_onboarding ON restaurants;
CREATE TRIGGER trigger_initialize_onboarding
  AFTER INSERT ON restaurants
  FOR EACH ROW
  EXECUTE FUNCTION initialize_restaurant_onboarding();

-- Step 5: Remove the old create_restaurant_onboarding_progress function (no longer needed)
DROP FUNCTION IF EXISTS create_restaurant_onboarding_progress();

-- Step 6: Ensure update_onboarding_updated_at function exists with proper security settings
CREATE OR REPLACE FUNCTION public.update_onboarding_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Step 7: Ensure all updated_at triggers exist for onboarding-related tables
DROP TRIGGER IF EXISTS update_restaurant_onboarding_progress_updated_at ON restaurant_onboarding_progress;
CREATE TRIGGER update_restaurant_onboarding_progress_updated_at
  BEFORE UPDATE ON restaurant_onboarding_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_onboarding_updated_at();

DROP TRIGGER IF EXISTS update_restaurant_verification_tasks_updated_at ON restaurant_verification_tasks;
CREATE TRIGGER update_restaurant_verification_tasks_updated_at
  BEFORE UPDATE ON restaurant_verification_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_onboarding_updated_at();

DROP TRIGGER IF EXISTS update_restaurant_go_live_checklist_updated_at ON restaurant_go_live_checklist;
CREATE TRIGGER update_restaurant_go_live_checklist_updated_at
  BEFORE UPDATE ON restaurant_go_live_checklist
  FOR EACH ROW
  EXECUTE FUNCTION update_onboarding_updated_at();

