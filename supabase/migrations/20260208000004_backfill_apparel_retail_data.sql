-- ============================================================================
-- BACKFILL APPAREL STORES → FULL RETAIL SYSTEM
-- Migrates all 8 apparel stores (Crave'n Stylz, Elite Couture, Sole Society,
-- Athletic Edge, Winter Gear Co., Accessory Avenue, Thread & Co., Style Studio)
-- into the retail product system with:
--   1. Correct restaurant_type + merchant_category
--   2. Retail columns on menu_items (brand, tags, product_type, shipping, etc.)
--   3. product_images from existing image_url
--   4. product_options (Size, Color) for apparel & shoe products
--   5. product_variants (all combos) with default stock
--   6. merchant_inventory seeded for every product
-- IDEMPOTENT: safe to re-run
-- ============================================================================

DO $$
DECLARE
  r RECORD;         -- store loop
  mi RECORD;        -- menu_item loop
  opt_size_id uuid;
  opt_color_id uuid;
  v_size text;
  v_color text;
  v_sku text;
  v_base_price integer;
  v_combo_title text;
  sizes text[];
  colors text[];
  shoe_sizes text[];
  cat_name text;
  store_brand text;
  item_tags text[];
  variant_order integer;
BEGIN

  -- ================================================================
  -- STEP 1: Fix restaurant_type for all cuisine_type = 'apparel' stores
  -- This triggers auto_assign_merchant_category → specialty_retail
  -- ================================================================
  UPDATE public.restaurants
  SET restaurant_type = 'retail_store',
      updated_at = NOW()
  WHERE LOWER(COALESCE(cuisine_type, '')) = 'apparel'
    AND (restaurant_type IS NULL OR restaurant_type = '' OR restaurant_type != 'retail_store');

  RAISE NOTICE 'Step 1: Fixed restaurant_type for apparel stores';

  -- ================================================================
  -- STEP 2: Loop through all apparel stores
  -- ================================================================
  FOR r IN
    SELECT id, name
    FROM public.restaurants
    WHERE LOWER(COALESCE(cuisine_type, '')) = 'apparel'
  LOOP
    RAISE NOTICE 'Processing store: %', r.name;

    -- Derive brand name from store name
    store_brand := r.name;

    -- ================================================================
    -- STEP 2a: Update retail columns on every menu_item for this store
    -- ================================================================
    FOR mi IN
      SELECT mi2.id, mi2.name, mi2.price_cents, mi2.image_url,
             COALESCE(mc.name, 'Uncategorized') AS category_name
      FROM public.menu_items mi2
      LEFT JOIN public.menu_categories mc ON mc.id = mi2.category_id
      WHERE mi2.restaurant_id = r.id
    LOOP
      -- Build tags based on category + product
      item_tags := ARRAY[LOWER(mi.category_name)];
      IF mi.name ILIKE '%hoodie%' THEN item_tags := item_tags || ARRAY['hoodie', 'outerwear']; END IF;
      IF mi.name ILIKE '%t-shirt%' OR mi.name ILIKE '%tee%' THEN item_tags := item_tags || ARRAY['t-shirt', 'tops']; END IF;
      IF mi.name ILIKE '%jacket%' OR mi.name ILIKE '%coat%' OR mi.name ILIKE '%windbreaker%' THEN item_tags := item_tags || ARRAY['outerwear']; END IF;
      IF mi.name ILIKE '%shorts%' OR mi.name ILIKE '%joggers%' OR mi.name ILIKE '%pants%' OR mi.name ILIKE '%leggings%' OR mi.name ILIKE '%jeans%' THEN item_tags := item_tags || ARRAY['bottoms']; END IF;
      IF mi.name ILIKE '%shoe%' OR mi.name ILIKE '%sneaker%' OR mi.name ILIKE '%boot%' OR mi.name ILIKE '%heel%' THEN item_tags := item_tags || ARRAY['footwear']; END IF;
      IF mi.name ILIKE '%hat%' OR mi.name ILIKE '%cap%' OR mi.name ILIKE '%beanie%' THEN item_tags := item_tags || ARRAY['headwear']; END IF;
      IF mi.name ILIKE '%bag%' OR mi.name ILIKE '%backpack%' OR mi.name ILIKE '%purse%' THEN item_tags := item_tags || ARRAY['bags']; END IF;
      IF mi.name ILIKE '%watch%' OR mi.name ILIKE '%necklace%' OR mi.name ILIKE '%earring%' OR mi.name ILIKE '%bracelet%' THEN item_tags := item_tags || ARRAY['jewelry']; END IF;
      IF mi.name ILIKE '%belt%' OR mi.name ILIKE '%wallet%' OR mi.name ILIKE '%scarf%' OR mi.name ILIKE '%glove%' THEN item_tags := item_tags || ARRAY['accessories']; END IF;
      IF mi.name ILIKE '%sunglasses%' THEN item_tags := item_tags || ARRAY['eyewear']; END IF;

      -- Remove duplicates from tags
      item_tags := (SELECT array_agg(DISTINCT t) FROM unnest(item_tags) AS t);

      -- Determine if this item should have variants
      -- Apparel/shoes = yes, small accessories = no
      -- Weight based on category
      UPDATE public.menu_items
      SET
        brand = COALESCE(brand, store_brand),
        product_type = COALESCE(product_type, 'physical'),
        requires_shipping = COALESCE(requires_shipping, true),
        tags = CASE WHEN tags IS NULL OR tags = '{}' THEN item_tags ELSE tags END,
        weight_unit = COALESCE(weight_unit, 'oz'),
        weight_value = CASE
          WHEN weight_value IS NOT NULL THEN weight_value
          WHEN mi.name ILIKE '%hoodie%' OR mi.name ILIKE '%jacket%' OR mi.name ILIKE '%coat%' THEN 24.0
          WHEN mi.name ILIKE '%t-shirt%' OR mi.name ILIKE '%tee%' OR mi.name ILIKE '%tank%' THEN 8.0
          WHEN mi.name ILIKE '%shorts%' OR mi.name ILIKE '%joggers%' OR mi.name ILIKE '%pants%' OR mi.name ILIKE '%leggings%' OR mi.name ILIKE '%jeans%' THEN 16.0
          WHEN mi.name ILIKE '%shoe%' OR mi.name ILIKE '%sneaker%' OR mi.name ILIKE '%boot%' THEN 32.0
          WHEN mi.name ILIKE '%bag%' OR mi.name ILIKE '%backpack%' OR mi.name ILIKE '%purse%' THEN 20.0
          WHEN mi.name ILIKE '%watch%' THEN 4.0
          ELSE 6.0
        END,
        cost_price_cents = CASE
          WHEN cost_price_cents IS NOT NULL THEN cost_price_cents
          ELSE ROUND(mi.price_cents * 0.4)  -- 40% cost → 60% margin
        END,
        updated_at = NOW()
      WHERE id = mi.id;

      -- =============================================================
      -- STEP 2b: Create product_images from existing image_url
      -- =============================================================
      IF mi.image_url IS NOT NULL AND mi.image_url != '' THEN
        INSERT INTO public.product_images (menu_item_id, image_url, alt_text, display_order, is_primary)
        SELECT mi.id, mi.image_url, mi.name, 0, true
        WHERE NOT EXISTS (
          SELECT 1 FROM public.product_images
          WHERE menu_item_id = mi.id AND image_url = mi.image_url
        );
      END IF;

      -- =============================================================
      -- STEP 2c: Create product_options + variants for apparel/shoes
      -- =============================================================
      cat_name := LOWER(mi.category_name);

      -- Determine what variants this product should have
      IF mi.name ILIKE '%hoodie%' OR mi.name ILIKE '%t-shirt%' OR mi.name ILIKE '%tee%'
         OR mi.name ILIKE '%jacket%' OR mi.name ILIKE '%coat%' OR mi.name ILIKE '%windbreaker%'
         OR mi.name ILIKE '%tank%' OR mi.name ILIKE '%shorts%' OR mi.name ILIKE '%joggers%'
         OR mi.name ILIKE '%pants%' OR mi.name ILIKE '%leggings%' OR mi.name ILIKE '%jeans%'
         OR mi.name ILIKE '%blazer%' OR mi.name ILIKE '%sweater%' OR mi.name ILIKE '%base layer%'
         OR mi.name ILIKE '%dress%' OR mi.name ILIKE '%sports bra%' OR mi.name ILIKE '%snow pants%'
         OR mi.name ILIKE '%fleece%' THEN
        -- APPAREL: Size + Color
        sizes  := ARRAY['S', 'M', 'L', 'XL', 'XXL'];
        colors := ARRAY['Black', 'White', 'Gray'];

        -- Special colors for Crave'n Stylz
        IF r.name = 'Crave''n Stylz' THEN
          colors := ARRAY['Black', 'White', 'Red'];
        END IF;

        -- Create Size option (if not exists)
        SELECT id INTO opt_size_id FROM public.product_options
        WHERE menu_item_id = mi.id AND name = 'Size' LIMIT 1;

        IF opt_size_id IS NULL THEN
          INSERT INTO public.product_options (menu_item_id, name, position, values)
          VALUES (mi.id, 'Size', 0, sizes)
          RETURNING id INTO opt_size_id;
        END IF;

        -- Create Color option (if not exists)
        SELECT id INTO opt_color_id FROM public.product_options
        WHERE menu_item_id = mi.id AND name = 'Color' LIMIT 1;

        IF opt_color_id IS NULL THEN
          INSERT INTO public.product_options (menu_item_id, name, position, values)
          VALUES (mi.id, 'Color', 1, colors)
          RETURNING id INTO opt_color_id;
        END IF;

        -- Mark product as has_variants
        UPDATE public.menu_items SET has_variants = true WHERE id = mi.id;

        -- Generate variants: Size × Color
        variant_order := 0;
        FOREACH v_size IN ARRAY sizes LOOP
          FOREACH v_color IN ARRAY colors LOOP
            v_combo_title := v_size || ' / ' || v_color;
            v_sku := UPPER(LEFT(REPLACE(r.name, '''', ''), 4)) || '-'
                     || UPPER(LEFT(REPLACE(REPLACE(mi.name, '''', ''), ' ', ''), 6)) || '-'
                     || UPPER(LEFT(v_size, 3)) || '-'
                     || UPPER(LEFT(v_color, 3));

            INSERT INTO public.product_variants (
              menu_item_id, title,
              option1_name, option1_value,
              option2_name, option2_value,
              sku, price_cents, cost_price_cents,
              quantity_on_hand, reorder_point, is_available, display_order
            )
            SELECT mi.id, v_combo_title,
                   'Size', v_size,
                   'Color', v_color,
                   v_sku, mi.price_cents, ROUND(mi.price_cents * 0.4),
                   FLOOR(RANDOM() * 20 + 5)::int,  -- 5–25 units
                   3, true, variant_order
            WHERE NOT EXISTS (
              SELECT 1 FROM public.product_variants
              WHERE menu_item_id = mi.id AND title = v_combo_title
            );

            variant_order := variant_order + 1;
          END LOOP;
        END LOOP;

      ELSIF mi.name ILIKE '%shoe%' OR mi.name ILIKE '%sneaker%' OR mi.name ILIKE '%boot%'
            OR mi.name ILIKE '%heel%' THEN
        -- FOOTWEAR: Shoe Size only
        shoe_sizes := ARRAY['7', '8', '9', '10', '11', '12', '13'];

        SELECT id INTO opt_size_id FROM public.product_options
        WHERE menu_item_id = mi.id AND name = 'Size' LIMIT 1;

        IF opt_size_id IS NULL THEN
          INSERT INTO public.product_options (menu_item_id, name, position, values)
          VALUES (mi.id, 'Size', 0, shoe_sizes)
          RETURNING id INTO opt_size_id;
        END IF;

        UPDATE public.menu_items SET has_variants = true WHERE id = mi.id;

        variant_order := 0;
        FOREACH v_size IN ARRAY shoe_sizes LOOP
          v_sku := UPPER(LEFT(REPLACE(r.name, '''', ''), 4)) || '-'
                   || UPPER(LEFT(REPLACE(REPLACE(mi.name, '''', ''), ' ', ''), 6)) || '-SZ'
                   || v_size;

          INSERT INTO public.product_variants (
            menu_item_id, title,
            option1_name, option1_value,
            sku, price_cents, cost_price_cents,
            quantity_on_hand, reorder_point, is_available, display_order
          )
          SELECT mi.id, 'Size ' || v_size,
                 'Size', v_size,
                 v_sku, mi.price_cents, ROUND(mi.price_cents * 0.4),
                 FLOOR(RANDOM() * 15 + 3)::int,  -- 3–18 units
                 2, true, variant_order
          WHERE NOT EXISTS (
            SELECT 1 FROM public.product_variants
            WHERE menu_item_id = mi.id AND title = 'Size ' || v_size
          );

          variant_order := variant_order + 1;
        END LOOP;

      ELSIF mi.name ILIKE '%handbag%' OR mi.name ILIKE '%purse%' OR mi.name ILIKE '%crossbody%'
            OR mi.name ILIKE '%backpack%' THEN
        -- BAGS: Color only
        colors := ARRAY['Black', 'Brown', 'Tan'];

        SELECT id INTO opt_color_id FROM public.product_options
        WHERE menu_item_id = mi.id AND name = 'Color' LIMIT 1;

        IF opt_color_id IS NULL THEN
          INSERT INTO public.product_options (menu_item_id, name, position, values)
          VALUES (mi.id, 'Color', 0, colors)
          RETURNING id INTO opt_color_id;
        END IF;

        UPDATE public.menu_items SET has_variants = true WHERE id = mi.id;

        variant_order := 0;
        FOREACH v_color IN ARRAY colors LOOP
          v_sku := UPPER(LEFT(REPLACE(r.name, '''', ''), 4)) || '-'
                   || UPPER(LEFT(REPLACE(REPLACE(mi.name, '''', ''), ' ', ''), 6)) || '-'
                   || UPPER(LEFT(v_color, 3));

          INSERT INTO public.product_variants (
            menu_item_id, title,
            option1_name, option1_value,
            sku, price_cents, cost_price_cents,
            quantity_on_hand, reorder_point, is_available, display_order
          )
          SELECT mi.id, v_color,
                 'Color', v_color,
                 v_sku, mi.price_cents, ROUND(mi.price_cents * 0.4),
                 FLOOR(RANDOM() * 12 + 3)::int,
                 2, true, variant_order
          WHERE NOT EXISTS (
            SELECT 1 FROM public.product_variants
            WHERE menu_item_id = mi.id AND title = v_color
          );

          variant_order := variant_order + 1;
        END LOOP;

      ELSE
        -- ACCESSORIES (no variants): hat, belt, wallet, watch, jewelry, decal, etc.
        -- Just make sure they have inventory
        NULL;
      END IF;

      -- =============================================================
      -- STEP 2d: Seed merchant_inventory for this item
      -- =============================================================
      INSERT INTO public.merchant_inventory (
        restaurant_id, menu_item_id, sku, quantity_on_hand, reorder_point,
        cost_cents, unit_of_measure, last_restocked_at
      )
      SELECT r.id, mi.id,
             UPPER(LEFT(REPLACE(r.name, '''', ''), 4)) || '-' || UPPER(LEFT(REPLACE(REPLACE(mi.name, '''', ''), ' ', ''), 6)) || '-' || LEFT(mi.id::text, 4),
             FLOOR(RANDOM() * 50 + 10)::int,  -- 10–60 total units
             5,
             ROUND(mi.price_cents * 0.4),
             'each',
             NOW()
      WHERE NOT EXISTS (
        SELECT 1 FROM public.merchant_inventory
        WHERE restaurant_id = r.id AND menu_item_id = mi.id
      )
      ON CONFLICT (restaurant_id, sku) DO NOTHING;

    END LOOP; -- menu_items

    RAISE NOTICE 'Completed store: %', r.name;

  END LOOP; -- restaurants

  RAISE NOTICE 'Migration complete: all apparel stores backfilled into retail system';

END $$;

