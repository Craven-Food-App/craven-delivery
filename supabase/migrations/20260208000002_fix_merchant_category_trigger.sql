-- Fix: auto_assign_merchant_category trigger to match actual restaurant_type
-- dropdown values (full_service, fast_casual, retail_store, etc.)

CREATE OR REPLACE FUNCTION public.auto_assign_merchant_category()
RETURNS trigger AS $$
BEGIN
  -- Only auto-assign if category is still the default 'restaurant'
  -- or if restaurant_type just changed
  IF NEW.merchant_category = 'restaurant' OR
     (TG_OP = 'UPDATE' AND OLD.restaurant_type IS DISTINCT FROM NEW.restaurant_type) THEN

    NEW.merchant_category := CASE
      -- ── Retail / Specialty ──
      WHEN LOWER(COALESCE(NEW.restaurant_type, '')) IN (
        'retail_store', 'retail', 'specialty', 'boutique', 'electronics', 'hardware'
      ) THEN 'specialty_retail'::merchant_category

      -- ── Grocery ──
      WHEN LOWER(COALESCE(NEW.restaurant_type, '')) IN (
        'grocery', 'supermarket', 'market'
      ) OR LOWER(COALESCE(NEW.cuisine_type, '')) IN (
        'grocery', 'supermarket'
      ) THEN 'grocery'::merchant_category

      -- ── Convenience ──
      WHEN LOWER(COALESCE(NEW.restaurant_type, '')) IN (
        'convenience', 'convenience_store', 'gas_station', 'corner_store'
      ) THEN 'convenience'::merchant_category

      -- ── Alcohol ──
      WHEN LOWER(COALESCE(NEW.restaurant_type, '')) IN (
        'liquor', 'liquor_store', 'wine_shop', 'bar', 'brewery'
      ) OR NEW.alcohol_enabled = true
        THEN 'alcohol'::merchant_category

      -- ── Flowers & Gifts ──
      WHEN LOWER(COALESCE(NEW.restaurant_type, '')) IN (
        'florist', 'flowers', 'gift_shop', 'gifts'
      ) THEN 'flowers_gifts'::merchant_category

      -- ── Pet Supplies ──
      WHEN LOWER(COALESCE(NEW.restaurant_type, '')) IN (
        'pet_store', 'pet_supplies', 'pet_shop'
      ) THEN 'pet_supplies'::merchant_category

      -- ── Marketplace ──
      WHEN LOWER(COALESCE(NEW.restaurant_type, '')) IN (
        'marketplace', 'dashmart', 'warehouse'
      ) THEN 'marketplace'::merchant_category

      -- ── All food-service types default to restaurant ──
      -- full_service, fast_casual, quick_service, cafe, bakery,
      -- ghost_kitchen, catering, food_truck, and anything else
      ELSE 'restaurant'::merchant_category
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-run backfill so all existing restaurants get the correct category
-- The trigger fires on UPDATE OF restaurant_type, so touching it triggers reassignment
UPDATE public.restaurants
SET restaurant_type = restaurant_type
WHERE restaurant_type IS NOT NULL AND restaurant_type != '';

