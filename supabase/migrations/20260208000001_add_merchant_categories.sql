-- ============================================================
-- Merchant Category System
-- Adds category-based merchant differentiation for onboarding,
-- order processing, and reporting — no UI changes required.
-- ============================================================

-- 1. Create merchant_category enum
DO $$ BEGIN
  CREATE TYPE merchant_category AS ENUM (
    'restaurant',
    'grocery',
    'convenience',
    'alcohol',
    'flowers_gifts',
    'pet_supplies',
    'specialty_retail',
    'marketplace'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Add merchant_category column to restaurants (default: restaurant)
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS merchant_category merchant_category NOT NULL DEFAULT 'restaurant';

-- Index for fast filtering / analytics
CREATE INDEX IF NOT EXISTS idx_restaurants_merchant_category
  ON public.restaurants (merchant_category);

-- 3. Category configuration table (per-category settings)
CREATE TABLE IF NOT EXISTS public.merchant_category_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category merchant_category NOT NULL UNIQUE,
  display_name text NOT NULL,
  -- order processing
  requires_prep_time boolean NOT NULL DEFAULT true,
  supports_modifiers boolean NOT NULL DEFAULT true,
  requires_inventory boolean NOT NULL DEFAULT false,
  supports_pick_pack boolean NOT NULL DEFAULT false,
  supports_bundles boolean NOT NULL DEFAULT false,
  -- onboarding
  requires_health_permit boolean NOT NULL DEFAULT false,
  requires_alcohol_license boolean NOT NULL DEFAULT false,
  default_prep_time_minutes integer NOT NULL DEFAULT 20,
  default_delivery_radius_miles numeric NOT NULL DEFAULT 5,
  -- commission / fees
  default_commission_bps integer NOT NULL DEFAULT 1500,
  -- analytics
  track_perishable_turnover boolean NOT NULL DEFAULT false,
  track_sku_velocity boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Seed default configurations
INSERT INTO public.merchant_category_config
  (category, display_name, requires_prep_time, supports_modifiers, requires_inventory,
   supports_pick_pack, supports_bundles, requires_health_permit, requires_alcohol_license,
   default_prep_time_minutes, default_delivery_radius_miles, default_commission_bps,
   track_perishable_turnover, track_sku_velocity)
VALUES
  ('restaurant',       'Restaurant',              true,  true,  false, false, false, true,  false, 20, 5,  1500, false, false),
  ('grocery',          'Grocery',                 false, false, true,  true,  false, true,  false, 10, 8,  1200, true,  true),
  ('convenience',      'Convenience',             false, false, true,  true,  false, false, false, 5,  3,  1800, false, true),
  ('alcohol',          'Alcohol',                 false, false, true,  true,  false, false, true,  10, 5,  2000, false, true),
  ('flowers_gifts',    'Flowers & Gifts',         false, false, true,  true,  true,  false, false, 15, 10, 1500, true,  true),
  ('pet_supplies',     'Pet Supplies',            false, false, true,  true,  true,  false, false, 10, 8,  1500, false, true),
  ('specialty_retail', 'Specialty Retail',         false, false, true,  true,  true,  false, false, 15, 8,  1500, false, true),
  ('marketplace',      'DashMart / Marketplace',  false, false, true,  true,  true,  false, false, 10, 10, 1000, true,  true)
ON CONFLICT (category) DO NOTHING;

-- 4. Merchant inventory table (for grocery / retail / convenience / alcohol etc.)
CREATE TABLE IF NOT EXISTS public.merchant_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES public.menu_items(id) ON DELETE SET NULL,
  sku text,
  barcode text,
  quantity_on_hand integer NOT NULL DEFAULT 0,
  quantity_reserved integer NOT NULL DEFAULT 0,
  reorder_point integer DEFAULT 5,
  is_perishable boolean DEFAULT false,
  expiry_date date,
  unit_of_measure text DEFAULT 'each',
  cost_cents integer,
  last_restocked_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (restaurant_id, sku)
);

CREATE INDEX IF NOT EXISTS idx_merchant_inventory_restaurant
  ON public.merchant_inventory (restaurant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_inventory_menu_item
  ON public.merchant_inventory (restaurant_id, menu_item_id);

-- 5. Auto-assign category trigger
--    Maps restaurant_type / cuisine_type → merchant_category on INSERT or UPDATE
CREATE OR REPLACE FUNCTION public.auto_assign_merchant_category()
RETURNS trigger AS $$
BEGIN
  -- Only auto-assign if category is still the default 'restaurant'
  -- or if restaurant_type just changed
  IF NEW.merchant_category = 'restaurant' OR
     (TG_OP = 'UPDATE' AND OLD.restaurant_type IS DISTINCT FROM NEW.restaurant_type) THEN

    NEW.merchant_category := CASE
      -- Grocery keywords
      WHEN LOWER(COALESCE(NEW.restaurant_type, '')) IN ('grocery', 'supermarket', 'market')
        OR LOWER(COALESCE(NEW.cuisine_type, '')) IN ('grocery', 'supermarket')
        THEN 'grocery'::merchant_category
      -- Convenience
      WHEN LOWER(COALESCE(NEW.restaurant_type, '')) IN ('convenience', 'convenience_store', 'gas_station', 'corner_store')
        THEN 'convenience'::merchant_category
      -- Alcohol
      WHEN LOWER(COALESCE(NEW.restaurant_type, '')) IN ('liquor', 'liquor_store', 'wine_shop', 'bar', 'brewery')
        OR NEW.alcohol_enabled = true
        THEN 'alcohol'::merchant_category
      -- Flowers & Gifts
      WHEN LOWER(COALESCE(NEW.restaurant_type, '')) IN ('florist', 'flowers', 'gift_shop', 'gifts')
        THEN 'flowers_gifts'::merchant_category
      -- Pet Supplies
      WHEN LOWER(COALESCE(NEW.restaurant_type, '')) IN ('pet_store', 'pet_supplies', 'pet_shop')
        THEN 'pet_supplies'::merchant_category
      -- Specialty Retail (retail_store is the dropdown value)
      WHEN LOWER(COALESCE(NEW.restaurant_type, '')) IN ('retail_store', 'retail', 'specialty', 'boutique', 'electronics', 'hardware')
        THEN 'specialty_retail'::merchant_category
      -- Marketplace
      WHEN LOWER(COALESCE(NEW.restaurant_type, '')) IN ('marketplace', 'dashmart', 'warehouse')
        THEN 'marketplace'::merchant_category
      -- Default to restaurant for all food-service types
      ELSE 'restaurant'::merchant_category
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_assign_merchant_category ON public.restaurants;
CREATE TRIGGER trg_auto_assign_merchant_category
  BEFORE INSERT OR UPDATE OF restaurant_type, cuisine_type, alcohol_enabled
  ON public.restaurants
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_merchant_category();

-- 6. Helper function: get category config for a restaurant
CREATE OR REPLACE FUNCTION public.get_merchant_category_config(p_restaurant_id uuid)
RETURNS jsonb AS $$
  SELECT to_jsonb(mcc.*)
  FROM public.restaurants r
  JOIN public.merchant_category_config mcc ON mcc.category = r.merchant_category
  WHERE r.id = p_restaurant_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- 7. Helper function: validate inventory for an order (grocery/retail)
CREATE OR REPLACE FUNCTION public.check_inventory_for_order(
  p_restaurant_id uuid,
  p_items jsonb  -- array of {menu_item_id, quantity}
)
RETURNS jsonb AS $$
DECLARE
  result jsonb := '{"ok": true, "out_of_stock": []}'::jsonb;
  item record;
  inv record;
BEGIN
  -- Check if this merchant requires inventory tracking
  IF NOT EXISTS (
    SELECT 1 FROM public.restaurants r
    JOIN public.merchant_category_config mcc ON mcc.category = r.merchant_category
    WHERE r.id = p_restaurant_id AND mcc.requires_inventory = true
  ) THEN
    -- No inventory tracking needed; always OK
    RETURN result;
  END IF;

  -- Check each item
  FOR item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(menu_item_id uuid, quantity int)
  LOOP
    SELECT * INTO inv
    FROM public.merchant_inventory
    WHERE restaurant_id = p_restaurant_id
      AND menu_item_id = item.menu_item_id;

    IF inv IS NOT NULL AND (inv.quantity_on_hand - inv.quantity_reserved) < item.quantity THEN
      result := jsonb_set(result, '{ok}', 'false'::jsonb);
      result := jsonb_set(
        result,
        '{out_of_stock}',
        (result->'out_of_stock') || jsonb_build_object(
          'menu_item_id', item.menu_item_id,
          'requested', item.quantity,
          'available', GREATEST(0, inv.quantity_on_hand - inv.quantity_reserved)
        )
      );
    END IF;
  END LOOP;

  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 8. Function: reserve inventory (called after order confirmed)
CREATE OR REPLACE FUNCTION public.reserve_inventory(
  p_restaurant_id uuid,
  p_items jsonb
)
RETURNS void AS $$
DECLARE
  item record;
BEGIN
  -- Only reserve if merchant requires inventory
  IF NOT EXISTS (
    SELECT 1 FROM public.restaurants r
    JOIN public.merchant_category_config mcc ON mcc.category = r.merchant_category
    WHERE r.id = p_restaurant_id AND mcc.requires_inventory = true
  ) THEN
    RETURN;
  END IF;

  FOR item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(menu_item_id uuid, quantity int)
  LOOP
    UPDATE public.merchant_inventory
    SET quantity_reserved = quantity_reserved + item.quantity,
        updated_at = now()
    WHERE restaurant_id = p_restaurant_id
      AND menu_item_id = item.menu_item_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 9. Function: deduct inventory (called when order completed/delivered)
CREATE OR REPLACE FUNCTION public.deduct_inventory(
  p_restaurant_id uuid,
  p_items jsonb
)
RETURNS void AS $$
DECLARE
  item record;
BEGIN
  -- Only deduct if merchant requires inventory
  IF NOT EXISTS (
    SELECT 1 FROM public.restaurants r
    JOIN public.merchant_category_config mcc ON mcc.category = r.merchant_category
    WHERE r.id = p_restaurant_id AND mcc.requires_inventory = true
  ) THEN
    RETURN;
  END IF;

  FOR item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(menu_item_id uuid, quantity int)
  LOOP
    UPDATE public.merchant_inventory
    SET quantity_on_hand = GREATEST(0, quantity_on_hand - item.quantity),
        quantity_reserved = GREATEST(0, quantity_reserved - item.quantity),
        updated_at = now()
    WHERE restaurant_id = p_restaurant_id
      AND menu_item_id = item.menu_item_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 10. Function: release reserved inventory (called when order cancelled)
CREATE OR REPLACE FUNCTION public.release_inventory(
  p_restaurant_id uuid,
  p_items jsonb
)
RETURNS void AS $$
DECLARE
  item record;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.restaurants r
    JOIN public.merchant_category_config mcc ON mcc.category = r.merchant_category
    WHERE r.id = p_restaurant_id AND mcc.requires_inventory = true
  ) THEN
    RETURN;
  END IF;

  FOR item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(menu_item_id uuid, quantity int)
  LOOP
    UPDATE public.merchant_inventory
    SET quantity_reserved = GREATEST(0, quantity_reserved - item.quantity),
        updated_at = now()
    WHERE restaurant_id = p_restaurant_id
      AND menu_item_id = item.menu_item_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 11. Analytics view: orders segmented by merchant category
CREATE OR REPLACE VIEW public.orders_by_merchant_category AS
SELECT
  r.merchant_category,
  COUNT(o.id) AS total_orders,
  SUM(o.food_subtotal_cents) AS total_food_subtotal_cents,
  SUM(o.total_cents) AS total_revenue_cents,
  AVG(o.total_cents) AS avg_order_cents,
  SUM(o.tip_cents) AS total_tips_cents,
  COUNT(CASE WHEN o.order_status = 'delivered' THEN 1 END) AS delivered_count,
  COUNT(CASE WHEN o.order_status = 'cancelled' THEN 1 END) AS cancelled_count,
  ROUND(
    COUNT(CASE WHEN o.order_status = 'cancelled' THEN 1 END)::numeric /
    NULLIF(COUNT(o.id), 0) * 100, 2
  ) AS cancellation_rate_pct,
  DATE_TRUNC('day', o.created_at) AS order_date
FROM public.orders o
JOIN public.restaurants r ON r.id = o.restaurant_id
GROUP BY r.merchant_category, DATE_TRUNC('day', o.created_at);

-- 12. Analytics view: inventory health for non-restaurant merchants
CREATE OR REPLACE VIEW public.inventory_health_by_category AS
SELECT
  r.merchant_category,
  r.id AS restaurant_id,
  r.name AS restaurant_name,
  COUNT(mi.id) AS total_skus,
  COUNT(CASE WHEN mi.quantity_on_hand <= mi.reorder_point THEN 1 END) AS low_stock_skus,
  COUNT(CASE WHEN mi.quantity_on_hand = 0 THEN 1 END) AS out_of_stock_skus,
  COUNT(CASE WHEN mi.is_perishable AND mi.expiry_date <= CURRENT_DATE + interval '3 days' THEN 1 END) AS expiring_soon,
  SUM(mi.quantity_on_hand * COALESCE(mi.cost_cents, 0)) AS inventory_value_cents
FROM public.restaurants r
LEFT JOIN public.merchant_inventory mi ON mi.restaurant_id = r.id
WHERE r.merchant_category != 'restaurant'
GROUP BY r.merchant_category, r.id, r.name;

-- 13. Analytics view: merchant category summary (aggregate)
CREATE OR REPLACE VIEW public.merchant_category_summary AS
SELECT
  r.merchant_category,
  mcc.display_name AS category_display_name,
  COUNT(r.id) AS merchant_count,
  COUNT(CASE WHEN r.is_active THEN 1 END) AS active_merchants,
  COUNT(CASE WHEN r.onboarding_status = 'pending' THEN 1 END) AS pending_merchants,
  AVG(r.rating) AS avg_rating,
  AVG(r.readiness_score) AS avg_readiness_score
FROM public.restaurants r
JOIN public.merchant_category_config mcc ON mcc.category = r.merchant_category
GROUP BY r.merchant_category, mcc.display_name;

-- 14. RLS policies for new tables
ALTER TABLE public.merchant_category_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_inventory ENABLE ROW LEVEL SECURITY;

-- merchant_category_config: readable by all authenticated users
DROP POLICY IF EXISTS "Anyone can read category config" ON public.merchant_category_config;
CREATE POLICY "Anyone can read category config"
  ON public.merchant_category_config FOR SELECT
  TO authenticated USING (true);

-- merchant_inventory: owners can manage their own inventory
DROP POLICY IF EXISTS "Owners can view own inventory" ON public.merchant_inventory;
CREATE POLICY "Owners can view own inventory"
  ON public.merchant_inventory FOR SELECT
  TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owners can insert own inventory" ON public.merchant_inventory;
CREATE POLICY "Owners can insert own inventory"
  ON public.merchant_inventory FOR INSERT
  TO authenticated
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owners can update own inventory" ON public.merchant_inventory;
CREATE POLICY "Owners can update own inventory"
  ON public.merchant_inventory FOR UPDATE
  TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owners can delete own inventory" ON public.merchant_inventory;
CREATE POLICY "Owners can delete own inventory"
  ON public.merchant_inventory FOR DELETE
  TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
    )
  );

-- Service role needs full access for edge functions
DROP POLICY IF EXISTS "Service role full access to inventory" ON public.merchant_inventory;
CREATE POLICY "Service role full access to inventory"
  ON public.merchant_inventory FOR ALL
  TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access to category config" ON public.merchant_category_config;
CREATE POLICY "Service role full access to category config"
  ON public.merchant_category_config FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- Grant access to analytics views (GRANTs are idempotent)
GRANT SELECT ON public.orders_by_merchant_category TO authenticated;
GRANT SELECT ON public.inventory_health_by_category TO authenticated;
GRANT SELECT ON public.merchant_category_summary TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_merchant_category_config(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_inventory_for_order(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_inventory(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_inventory(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_inventory(uuid, jsonb) TO authenticated;

-- 15. Backfill existing restaurants based on their restaurant_type
-- The trigger fires on UPDATE OF restaurant_type, so we touch the column to trigger it
UPDATE public.restaurants
SET restaurant_type = restaurant_type
WHERE restaurant_type IS NOT NULL AND restaurant_type != '';

