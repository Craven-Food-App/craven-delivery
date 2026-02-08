-- ============================================================
-- RETAIL PRODUCT SYSTEM
-- Adds product images, variants, and retail-specific fields
-- ============================================================

-- 1. Add retail columns to menu_items
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS brand text,
  ADD COLUMN IF NOT EXISTS manufacturer text,
  ADD COLUMN IF NOT EXISTS compare_at_price_cents integer,
  ADD COLUMN IF NOT EXISTS cost_price_cents integer,
  ADD COLUMN IF NOT EXISTS weight_value numeric(10,2),
  ADD COLUMN IF NOT EXISTS weight_unit text DEFAULT 'lb',
  ADD COLUMN IF NOT EXISTS length_cm numeric(10,2),
  ADD COLUMN IF NOT EXISTS width_cm numeric(10,2),
  ADD COLUMN IF NOT EXISTS height_cm numeric(10,2),
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS product_type text DEFAULT 'physical',
  ADD COLUMN IF NOT EXISTS tax_rate numeric(5,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS requires_shipping boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS has_variants boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS vendor text,
  ADD COLUMN IF NOT EXISTS barcode text;

-- 2. Product images table (multiple images per product)
CREATE TABLE IF NOT EXISTS public.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  alt_text text,
  display_order integer DEFAULT 0,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_images_menu_item
  ON public.product_images (menu_item_id, display_order);

-- 3. Product variants table
CREATE TABLE IF NOT EXISTS public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  title text NOT NULL,                    -- e.g. "Red / Large"
  option1_name text,                      -- e.g. "Color"
  option1_value text,                     -- e.g. "Red"
  option2_name text,                      -- e.g. "Size"
  option2_value text,                     -- e.g. "Large"
  option3_name text,                      -- e.g. "Material"
  option3_value text,                     -- e.g. "Cotton"
  sku text,
  barcode text,
  price_cents integer NOT NULL,
  compare_at_price_cents integer,
  cost_price_cents integer,
  weight_value numeric(10,2),
  weight_unit text DEFAULT 'lb',
  quantity_on_hand integer NOT NULL DEFAULT 0,
  quantity_reserved integer NOT NULL DEFAULT 0,
  reorder_point integer DEFAULT 5,
  image_url text,
  is_available boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_variants_menu_item
  ON public.product_variants (menu_item_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku
  ON public.product_variants (sku) WHERE sku IS NOT NULL;

-- 4. Product option definitions (what options a product has)
CREATE TABLE IF NOT EXISTS public.product_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  name text NOT NULL,                     -- e.g. "Color", "Size"
  position integer DEFAULT 0,
  values text[] NOT NULL DEFAULT '{}',    -- e.g. ["Red", "Blue", "Green"]
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_options_menu_item
  ON public.product_options (menu_item_id);

-- 5. RLS policies
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_options ENABLE ROW LEVEL SECURITY;

-- product_images
DROP POLICY IF EXISTS "Anyone can view product images" ON public.product_images;
CREATE POLICY "Anyone can view product images"
  ON public.product_images FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "Owners can manage product images" ON public.product_images;
CREATE POLICY "Owners can manage product images"
  ON public.product_images FOR ALL
  TO authenticated
  USING (
    menu_item_id IN (
      SELECT mi.id FROM public.menu_items mi
      JOIN public.restaurants r ON r.id = mi.restaurant_id
      WHERE r.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    menu_item_id IN (
      SELECT mi.id FROM public.menu_items mi
      JOIN public.restaurants r ON r.id = mi.restaurant_id
      WHERE r.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role full access to product images" ON public.product_images;
CREATE POLICY "Service role full access to product images"
  ON public.product_images FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- product_variants
DROP POLICY IF EXISTS "Anyone can view product variants" ON public.product_variants;
CREATE POLICY "Anyone can view product variants"
  ON public.product_variants FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "Owners can manage product variants" ON public.product_variants;
CREATE POLICY "Owners can manage product variants"
  ON public.product_variants FOR ALL
  TO authenticated
  USING (
    menu_item_id IN (
      SELECT mi.id FROM public.menu_items mi
      JOIN public.restaurants r ON r.id = mi.restaurant_id
      WHERE r.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    menu_item_id IN (
      SELECT mi.id FROM public.menu_items mi
      JOIN public.restaurants r ON r.id = mi.restaurant_id
      WHERE r.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role full access to product variants" ON public.product_variants;
CREATE POLICY "Service role full access to product variants"
  ON public.product_variants FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- product_options
DROP POLICY IF EXISTS "Anyone can view product options" ON public.product_options;
CREATE POLICY "Anyone can view product options"
  ON public.product_options FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "Owners can manage product options" ON public.product_options;
CREATE POLICY "Owners can manage product options"
  ON public.product_options FOR ALL
  TO authenticated
  USING (
    menu_item_id IN (
      SELECT mi.id FROM public.menu_items mi
      JOIN public.restaurants r ON r.id = mi.restaurant_id
      WHERE r.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    menu_item_id IN (
      SELECT mi.id FROM public.menu_items mi
      JOIN public.restaurants r ON r.id = mi.restaurant_id
      WHERE r.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role full access to product options" ON public.product_options;
CREATE POLICY "Service role full access to product options"
  ON public.product_options FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- 6. Grants
GRANT SELECT ON public.product_images TO authenticated;
GRANT SELECT ON public.product_variants TO authenticated;
GRANT SELECT ON public.product_options TO authenticated;

-- 7. Helper: generate variant title from options
CREATE OR REPLACE FUNCTION public.generate_variant_title(
  opt1_val text DEFAULT NULL,
  opt2_val text DEFAULT NULL,
  opt3_val text DEFAULT NULL
)
RETURNS text AS $$
BEGIN
  RETURN array_to_string(
    ARRAY[opt1_val, opt2_val, opt3_val]::text[],
    ' / '
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 8. Trigger: auto-update menu_items.has_variants
CREATE OR REPLACE FUNCTION public.sync_has_variants()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.menu_items
  SET has_variants = (
    SELECT COUNT(*) > 0 FROM public.product_variants
    WHERE menu_item_id = COALESCE(NEW.menu_item_id, OLD.menu_item_id)
  )
  WHERE id = COALESCE(NEW.menu_item_id, OLD.menu_item_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_has_variants ON public.product_variants;
CREATE TRIGGER trg_sync_has_variants
  AFTER INSERT OR DELETE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.sync_has_variants();

