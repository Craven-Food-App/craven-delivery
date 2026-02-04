-- ============================================================================
-- MOCK CLOTHING STORES - 8 Apparel Stores
-- Each store has items matching its type (sportswear, shoes, snow gear, etc.)
-- Store logos use actual logo images, not product images
-- All stores located in Toledo, OH area (Sylvania, Perrysburg, Bowling Green)
-- IDEMPOTENT: Checks if stores exist before inserting
-- ============================================================================

DO $$
DECLARE
  owner_id uuid;
  v_restaurant_id uuid;
  store_num INT;
  existing_restaurant_id uuid;
  existing_user_id uuid;
  user_email TEXT;
  category_apparel_id uuid;
  category_accessories_id uuid;
  category_shoes_id uuid;
BEGIN
  -- Store 1: Crave'n Merch (Official Crave'n Branded Merchandise)
  store_num := 1;
  existing_restaurant_id := NULL;
  user_email := 'apparel' || store_num || '@crave-n.shop';
  
  SELECT id INTO existing_restaurant_id FROM public.restaurants WHERE name = 'Crave''n Merch' LIMIT 1;
  
  IF existing_restaurant_id IS NULL THEN
    -- Check if user already exists by email
    SELECT id INTO existing_user_id FROM auth.users WHERE email = user_email LIMIT 1;
    
    IF existing_user_id IS NULL THEN
      owner_id := gen_random_uuid();
      INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token)
      VALUES ('00000000-0000-0000-0000-000000000000', owner_id, 'authenticated', 'authenticated', user_email, crypt('ApparelPass' || store_num, gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email"}', '{}', FALSE, '', '', '', '');
    ELSE
      owner_id := existing_user_id;
    END IF;
    
    v_restaurant_id := gen_random_uuid();
    
    INSERT INTO public.user_profiles (user_id, full_name, role, created_at) 
    VALUES (owner_id, 'Crave''n Merch Owner', 'admin', NOW())
    ON CONFLICT (user_id) DO NOTHING;
    
    INSERT INTO public.restaurants (id, owner_id, name, description, address, city, state, zip_code, phone, email, cuisine_type, is_active, rating, total_reviews, image_url, header_image_url, created_at, updated_at)
    VALUES (v_restaurant_id, owner_id, 'Crave''n Merch', 'Official Crave''n branded merchandise and apparel. Exclusive hoodies, t-shirts, accessories, and branded items featuring our iconic designs.', '6759 Nebraska Ave', 'Toledo', 'OH', '43615', '555-1001', 'apparel1@crave-n.shop', 'apparel', true, 4.9, 523, 'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=600&fit=crop', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    
    -- Create menu categories
    INSERT INTO public.menu_categories (id, restaurant_id, name, display_order, is_active, created_at, updated_at)
    VALUES 
      (gen_random_uuid(), v_restaurant_id, 'Apparel', 1, true, NOW(), NOW()),
      (gen_random_uuid(), v_restaurant_id, 'Accessories', 2, true, NOW(), NOW())
    ON CONFLICT DO NOTHING;
    
    SELECT id INTO category_apparel_id FROM public.menu_categories mc WHERE mc.restaurant_id = v_restaurant_id AND mc.name = 'Apparel' LIMIT 1;
    SELECT id INTO category_accessories_id FROM public.menu_categories mc WHERE mc.restaurant_id = v_restaurant_id AND mc.name = 'Accessories' LIMIT 1;
    
    INSERT INTO public.menu_items (id, restaurant_id, name, description, price_cents, category_id, image_url, is_available, created_at) VALUES
    (gen_random_uuid(), v_restaurant_id, 'Crave''n Signature Hoodie', 'Official Crave''n branded hoodie, premium quality cotton blend', 7999, category_apparel_id, 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), v_restaurant_id, 'Crave''n Logo T-Shirt', 'Classic Crave''n logo t-shirt, multiple colors available', 3999, category_apparel_id, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), v_restaurant_id, 'Feeder Hoodie', 'Premium feeder hoodie with Crave''n branding', 8999, category_apparel_id, 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), v_restaurant_id, 'Feeder Hat', 'Official Crave''n feeder hat, adjustable', 2999, category_accessories_id, 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), v_restaurant_id, 'Heated Delivery Bag', 'Insulated heated bag for food delivery, Crave''n branded', 4999, category_accessories_id, 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), v_restaurant_id, 'Car Window Decal', 'Crave''n logo car window decal, weatherproof', 999, category_accessories_id, 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), v_restaurant_id, 'Bumper Sticker - "I''m Always Crave''n Something"', 'Official Crave''n bumper sticker, vinyl', 499, category_accessories_id, 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), v_restaurant_id, 'Key Chain', 'Metal key chain with Crave''n logo', 1299, category_accessories_id, 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), v_restaurant_id, 'Mouse Pad', 'Premium mouse pad with Crave''n branding', 1999, category_accessories_id, 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), v_restaurant_id, '50-Piece Puzzle', 'Crave''n branded 50-piece jigsaw puzzle', 2499, category_accessories_id, 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), v_restaurant_id, '100-Piece Puzzle', 'Crave''n branded 100-piece jigsaw puzzle', 3499, category_accessories_id, 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400&h=400&fit=crop', true, NOW())
    ON CONFLICT DO NOTHING;
  END IF;

  -- Store 2: Elite Couture (Luxury Fashion - Designer Apparel & Accessories)
  store_num := 2;
  existing_restaurant_id := NULL;
  user_email := 'apparel' || store_num || '@crave-n.shop';
  
  SELECT id INTO existing_restaurant_id FROM public.restaurants WHERE name = 'Elite Couture' LIMIT 1;
  
  IF existing_restaurant_id IS NULL THEN
    -- Check if user already exists by email
    SELECT id INTO existing_user_id FROM auth.users WHERE email = user_email LIMIT 1;
    
    IF existing_user_id IS NULL THEN
      owner_id := gen_random_uuid();
      INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token)
      VALUES ('00000000-0000-0000-0000-000000000000', owner_id, 'authenticated', 'authenticated', user_email, crypt('ApparelPass' || store_num, gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email"}', '{}', FALSE, '', '', '', '');
    ELSE
      owner_id := existing_user_id;
    END IF;
    
    v_restaurant_id := gen_random_uuid();
    
    INSERT INTO public.user_profiles (user_id, full_name, role, created_at) 
    VALUES (owner_id, 'Elite Couture Owner', 'admin', NOW())
    ON CONFLICT (user_id) DO NOTHING;
    
    INSERT INTO public.restaurants (id, owner_id, name, description, address, city, state, zip_code, phone, email, cuisine_type, is_active, rating, total_reviews, image_url, header_image_url, created_at, updated_at)
    VALUES (v_restaurant_id, owner_id, 'Elite Couture', 'Luxury fashion house specializing in designer apparel, accessories, and footwear. Exclusive branded collections for the discerning shopper.', '123 Main Street', 'Sylvania', 'OH', '43560', '555-1002', 'apparel2@crave-n.shop', 'apparel', true, 4.9, 287, 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&h=600&fit=crop', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    
    -- Create menu categories
    INSERT INTO public.menu_categories (id, restaurant_id, name, display_order, is_active, created_at, updated_at)
    VALUES 
      (gen_random_uuid(), v_restaurant_id, 'Apparel', 1, true, NOW(), NOW()),
      (gen_random_uuid(), v_restaurant_id, 'Accessories', 2, true, NOW(), NOW()),
      (gen_random_uuid(), v_restaurant_id, 'Shoes', 3, true, NOW(), NOW())
    ON CONFLICT DO NOTHING;
    
    SELECT id INTO category_apparel_id FROM public.menu_categories mc WHERE mc.restaurant_id = v_restaurant_id AND mc.name = 'Apparel' LIMIT 1;
    SELECT id INTO category_accessories_id FROM public.menu_categories mc WHERE mc.restaurant_id = v_restaurant_id AND mc.name = 'Accessories' LIMIT 1;
    SELECT id INTO category_shoes_id FROM public.menu_categories mc WHERE mc.restaurant_id = v_restaurant_id AND mc.name = 'Shoes' LIMIT 1;
    
    INSERT INTO public.menu_items (id, restaurant_id, name, description, price_cents, category_id, image_url, is_available, created_at) VALUES
    (gen_random_uuid(), v_restaurant_id, 'Designer Blazer', 'Tailored wool blazer, premium quality', 24999, category_apparel_id, 'https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), v_restaurant_id, 'Designer Dress', 'Elegant evening dress, exclusive design', 19999, category_apparel_id, 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), v_restaurant_id, 'Cashmere Coat', 'Premium cashmere coat, timeless elegance', 39999, category_apparel_id, 'https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), v_restaurant_id, 'Silk Scarf', 'Luxury silk scarf, designer pattern', 8999, category_accessories_id, 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), v_restaurant_id, 'Leather Handbag', 'Premium leather handbag, designer brand', 34999, category_accessories_id, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), v_restaurant_id, 'Luxury Watch', 'Swiss timepiece, premium craftsmanship', 49999, category_accessories_id, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), v_restaurant_id, 'Designer Sunglasses', 'Luxury sunglasses, UV protection', 12999, category_accessories_id, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), v_restaurant_id, 'Designer Heels', 'Italian leather heels, elegant design', 17999, category_shoes_id, 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&h=400&fit=crop', true, NOW())
    ON CONFLICT DO NOTHING;
  END IF;

  -- Store 3: Sole Society (Sneakers & Athletic Shoes Only)
  store_num := 3;
  existing_restaurant_id := NULL;
  user_email := 'apparel' || store_num || '@crave-n.shop';
  
  SELECT id INTO existing_restaurant_id FROM public.restaurants WHERE name = 'Sole Society' LIMIT 1;
  
  IF existing_restaurant_id IS NULL THEN
    -- Check if user already exists by email
    SELECT id INTO existing_user_id FROM auth.users WHERE email = user_email LIMIT 1;
    
    IF existing_user_id IS NULL THEN
      owner_id := gen_random_uuid();
      INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token)
      VALUES ('00000000-0000-0000-0000-000000000000', owner_id, 'authenticated', 'authenticated', user_email, crypt('ApparelPass' || store_num, gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email"}', '{}', FALSE, '', '', '', '');
    ELSE
      owner_id := existing_user_id;
    END IF;
    
    v_restaurant_id := gen_random_uuid();
    
    INSERT INTO public.user_profiles (user_id, full_name, role, created_at) 
    VALUES (owner_id, 'Sole Society Owner', 'admin', NOW())
    ON CONFLICT (user_id) DO NOTHING;
    
    INSERT INTO public.restaurants (id, owner_id, name, description, address, city, state, zip_code, phone, email, cuisine_type, is_active, rating, total_reviews, image_url, header_image_url, created_at, updated_at)
    VALUES (v_restaurant_id, owner_id, 'Sole Society', 'Your destination for premium sneakers and athletic shoes. Featuring exclusive shoe drops, running shoes, basketball shoes, and athletic footwear.', '456 Shoe Lane', 'Perrysburg', 'OH', '43551', '555-1003', 'apparel3@crave-n.shop', 'apparel', true, 4.7, 456, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=600&fit=crop', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    
    -- Create menu categories
    INSERT INTO public.menu_categories (id, restaurant_id, name, display_order, is_active, created_at, updated_at)
    VALUES 
      (gen_random_uuid(), v_restaurant_id, 'Shoes', 1, true, NOW(), NOW()),
      (gen_random_uuid(), v_restaurant_id, 'Shoe Accessories', 2, true, NOW(), NOW())
    ON CONFLICT DO NOTHING;
    
    SELECT id INTO category_shoes_id FROM public.menu_categories mc WHERE mc.restaurant_id = v_restaurant_id AND mc.name = 'Shoes' LIMIT 1;
    SELECT id INTO category_accessories_id FROM public.menu_categories mc WHERE mc.restaurant_id = v_restaurant_id AND mc.name = 'Shoe Accessories' LIMIT 1;
    
    INSERT INTO public.menu_items (id, restaurant_id, name, description, price_cents, category_id, image_url, is_available, created_at) VALUES
    (gen_random_uuid(), v_restaurant_id, 'Premium Sneakers', 'Limited edition athletic sneakers', 12999, category_shoes_id, 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), v_restaurant_id, 'Running Shoes', 'High-performance running shoes', 9999, category_shoes_id, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), v_restaurant_id, 'Basketball Shoes', 'High-top basketball shoes, excellent grip', 11999, category_shoes_id, 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), v_restaurant_id, 'Training Shoes', 'Multi-purpose training shoes, excellent grip', 10999, category_shoes_id, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), v_restaurant_id, 'Casual Sneakers', 'Comfortable everyday sneakers, stylish design', 6999, category_shoes_id, 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), v_restaurant_id, 'Shoe Laces', 'Premium replacement shoe laces, multiple colors', 999, category_accessories_id, 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), v_restaurant_id, 'Shoe Cleaner Kit', 'Complete shoe cleaning and care kit', 2499, category_accessories_id, 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), v_restaurant_id, 'Shoe Insoles', 'Premium cushioned insoles for comfort', 1999, category_accessories_id, 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400&h=400&fit=crop', true, NOW())
    ON CONFLICT DO NOTHING;
  END IF;

  -- Store 4: Athletic Edge (Performance Sportswear Only)
  store_num := 4;
  existing_restaurant_id := NULL;
  user_email := 'apparel' || store_num || '@crave-n.shop';
  
  SELECT id INTO existing_restaurant_id FROM public.restaurants WHERE name = 'Athletic Edge' LIMIT 1;
  
  IF existing_restaurant_id IS NULL THEN
    -- Check if user already exists by email
    SELECT id INTO existing_user_id FROM auth.users WHERE email = user_email LIMIT 1;
    
    IF existing_user_id IS NULL THEN
      owner_id := gen_random_uuid();
      INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token)
      VALUES ('00000000-0000-0000-0000-000000000000', owner_id, 'authenticated', 'authenticated', user_email, crypt('ApparelPass' || store_num, gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email"}', '{}', FALSE, '', '', '', '');
    ELSE
      owner_id := existing_user_id;
    END IF;
    
    v_restaurant_id := gen_random_uuid();
    
    INSERT INTO public.user_profiles (user_id, full_name, role, created_at) 
    VALUES (owner_id, 'Athletic Edge Owner', 'admin', NOW())
    ON CONFLICT (user_id) DO NOTHING;
    
    INSERT INTO public.restaurants (id, owner_id, name, description, address, city, state, zip_code, phone, email, cuisine_type, is_active, rating, total_reviews, image_url, header_image_url, created_at, updated_at)
    VALUES (v_restaurant_id, owner_id, 'Athletic Edge', 'Performance sportswear and athletic gear. Premium branded activewear, running apparel, gym wear, and fitness accessories.', '789 Sports Way', 'Bowling Green', 'OH', '43402', '555-1004', 'apparel4@crave-n.shop', 'apparel', true, 4.8, 389, 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    
    -- Create menu categories
    INSERT INTO public.menu_categories (id, restaurant_id, name, display_order, is_active, created_at, updated_at)
    VALUES 
      (gen_random_uuid(), v_restaurant_id, 'Apparel', 1, true, NOW(), NOW()),
      (gen_random_uuid(), v_restaurant_id, 'Accessories', 2, true, NOW(), NOW())
    ON CONFLICT DO NOTHING;
    
    SELECT id INTO category_apparel_id FROM public.menu_categories mc WHERE mc.restaurant_id = v_restaurant_id AND mc.name = 'Apparel' LIMIT 1;
    SELECT id INTO category_accessories_id FROM public.menu_categories mc WHERE mc.restaurant_id = v_restaurant_id AND mc.name = 'Accessories' LIMIT 1;
    
    INSERT INTO public.menu_items (id, restaurant_id, name, description, price_cents, category_id, image_url, is_available, created_at) VALUES
    (gen_random_uuid(), v_restaurant_id, 'Performance Leggings', 'High-performance leggings, moisture-wicking', 5999, category_apparel_id, 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), v_restaurant_id, 'Athletic Tank Top', 'Breathable tank top, quick-dry fabric', 3499, category_apparel_id, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), v_restaurant_id, 'Running Shorts', 'Lightweight running shorts, reflective details', 4499, category_apparel_id, 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), v_restaurant_id, 'Sports Bra', 'High-support sports bra, moisture-wicking', 3999, category_apparel_id, 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), v_restaurant_id, 'Athletic Jacket', 'Lightweight athletic jacket, wind-resistant', 7999, category_apparel_id, 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), v_restaurant_id, 'Athletic Shorts', 'Moisture-wicking athletic shorts', 3999, category_apparel_id, 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), v_restaurant_id, 'Yoga Mat', 'Premium non-slip yoga mat', 4999, category_accessories_id, 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), v_restaurant_id, 'Resistance Bands Set', 'Set of 5 resistance bands, various strengths', 2999, category_accessories_id, 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop', true, NOW())
    ON CONFLICT DO NOTHING;
  END IF;

  -- Store 5: Winter Gear Co. (Snow Gear & Winter Apparel)
  store_num := 5;
  existing_restaurant_id := NULL;
  user_email := 'apparel' || store_num || '@crave-n.shop';
  
  SELECT id INTO existing_restaurant_id FROM public.restaurants WHERE name = 'Winter Gear Co.' LIMIT 1;
  
  IF existing_restaurant_id IS NULL THEN
    -- Check if user already exists by email
    SELECT id INTO existing_user_id FROM auth.users WHERE email = user_email LIMIT 1;
    
    IF existing_user_id IS NULL THEN
      owner_id := gen_random_uuid();
      INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token)
      VALUES ('00000000-0000-0000-0000-000000000000', owner_id, 'authenticated', 'authenticated', user_email, crypt('ApparelPass' || store_num, gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email"}', '{}', FALSE, '', '', '', '');
    ELSE
      owner_id := existing_user_id;
    END IF;
    
    v_restaurant_id := gen_random_uuid();
    
    INSERT INTO public.user_profiles (user_id, full_name, role, created_at) 
    VALUES (owner_id, 'Winter Gear Co. Owner', 'admin', NOW())
    ON CONFLICT (user_id) DO NOTHING;
    
    INSERT INTO public.restaurants (id, owner_id, name, description, address, city, state, zip_code, phone, email, cuisine_type, is_active, rating, total_reviews, image_url, header_image_url, created_at, updated_at)
    VALUES (v_restaurant_id, owner_id, 'Winter Gear Co.', 'Specialized winter and snow gear. Premium jackets, snow pants, boots, gloves, and all cold weather essentials for outdoor activities.', '321 Winter Drive', 'Sylvania', 'OH', '43560', '555-1005', 'apparel5@crave-n.shop', 'apparel', true, 4.7, 234, 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=800&h=600&fit=crop', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    
    -- Create menu categories
    INSERT INTO public.menu_categories (id, restaurant_id, name, display_order, is_active, created_at, updated_at)
    VALUES 
      (gen_random_uuid(), v_restaurant_id, 'Apparel', 1, true, NOW(), NOW()),
      (gen_random_uuid(), v_restaurant_id, 'Accessories', 2, true, NOW(), NOW()),
      (gen_random_uuid(), v_restaurant_id, 'Shoes', 3, true, NOW(), NOW())
    ON CONFLICT DO NOTHING;
    
    SELECT id INTO category_apparel_id FROM public.menu_categories mc WHERE mc.restaurant_id = v_restaurant_id AND mc.name = 'Apparel' LIMIT 1;
    SELECT id INTO category_accessories_id FROM public.menu_categories mc WHERE mc.restaurant_id = v_restaurant_id AND mc.name = 'Accessories' LIMIT 1;
    SELECT id INTO category_shoes_id FROM public.menu_categories mc WHERE mc.restaurant_id = v_restaurant_id AND mc.name = 'Shoes' LIMIT 1;
    
    INSERT INTO public.menu_items (id, restaurant_id, name, description, price_cents, category_id, image_url, is_available, created_at) VALUES
    (gen_random_uuid(), v_restaurant_id, 'Insulated Winter Jacket', 'Heavy-duty insulated winter jacket, waterproof', 14999, category_apparel_id, 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), v_restaurant_id, 'Snow Pants', 'Waterproof snow pants, insulated', 8999, category_apparel_id, 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), v_restaurant_id, 'Fleece Lined Hoodie', 'Warm fleece-lined hoodie for cold weather', 6999, category_apparel_id, 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), v_restaurant_id, 'Thermal Base Layer', 'Moisture-wicking thermal base layer set', 4999, category_apparel_id, 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), v_restaurant_id, 'Winter Boots', 'Insulated waterproof winter boots', 11999, category_shoes_id, 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), v_restaurant_id, 'Insulated Gloves', 'Warm insulated gloves, touchscreen compatible', 3999, category_accessories_id, 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), v_restaurant_id, 'Winter Beanie', 'Warm fleece-lined winter beanie', 2499, category_accessories_id, 'https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), v_restaurant_id, 'Neck Gaiter', 'Warm neck gaiter, multi-purpose', 1999, category_accessories_id, 'https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=400&h=400&fit=crop', true, NOW())
    ON CONFLICT DO NOTHING;
  END IF;

  -- Store 6: Accessory Avenue (Premium Accessories Only)
  store_num := 6;
  existing_restaurant_id := NULL;
  user_email := 'apparel' || store_num || '@crave-n.shop';
  
  SELECT id INTO existing_restaurant_id FROM public.restaurants WHERE name = 'Accessory Avenue' LIMIT 1;
  
  IF existing_restaurant_id IS NULL THEN
    -- Check if user already exists by email
    SELECT id INTO existing_user_id FROM auth.users WHERE email = user_email LIMIT 1;
    
    IF existing_user_id IS NULL THEN
      owner_id := gen_random_uuid();
      INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token)
      VALUES ('00000000-0000-0000-0000-000000000000', owner_id, 'authenticated', 'authenticated', user_email, crypt('ApparelPass' || store_num, gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email"}', '{}', FALSE, '', '', '', '');
    ELSE
      owner_id := existing_user_id;
    END IF;
    
    v_restaurant_id := gen_random_uuid();
    
    INSERT INTO public.user_profiles (user_id, full_name, role, created_at) 
    VALUES (owner_id, 'Accessory Avenue Owner', 'admin', NOW())
    ON CONFLICT (user_id) DO NOTHING;
    
    INSERT INTO public.restaurants (id, owner_id, name, description, address, city, state, zip_code, phone, email, cuisine_type, is_active, rating, total_reviews, image_url, header_image_url, created_at, updated_at)
    VALUES (v_restaurant_id, owner_id, 'Accessory Avenue', 'Premium accessories boutique. Handbags, jewelry, watches, belts, sunglasses, and more. Designer brands and exclusive collections.', '567 Accessory Blvd', 'Perrysburg', 'OH', '43551', '555-1006', 'apparel6@crave-n.shop', 'apparel', true, 4.7, 312, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&h=600&fit=crop', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    
    -- Create menu categories
    INSERT INTO public.menu_categories (id, restaurant_id, name, display_order, is_active, created_at, updated_at)
    VALUES 
      (gen_random_uuid(), v_restaurant_id, 'Accessories', 1, true, NOW(), NOW())
    ON CONFLICT DO NOTHING;
    
    SELECT id INTO category_accessories_id FROM public.menu_categories mc WHERE mc.restaurant_id = v_restaurant_id AND mc.name = 'Accessories' LIMIT 1;
    
    INSERT INTO public.menu_items (id, restaurant_id, name, description, price_cents, category_id, image_url, is_available, created_at) VALUES
    (gen_random_uuid(), v_restaurant_id, 'Designer Handbag', 'Premium leather handbag, multiple colors', 27999, category_accessories_id, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), v_restaurant_id, 'Leather Belt', 'Genuine leather belt, classic buckle', 4999, category_accessories_id, 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), v_restaurant_id, 'Silver Necklace', 'Sterling silver necklace, elegant design', 8999, category_accessories_id, 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), v_restaurant_id, 'Designer Watch', 'Luxury timepiece, Swiss movement', 34999, category_accessories_id, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), v_restaurant_id, 'Sunglasses', 'Premium sunglasses, UV protection', 5999, category_accessories_id, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), v_restaurant_id, 'Leather Wallet', 'Genuine leather wallet, RFID blocking', 3999, category_accessories_id, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), v_restaurant_id, 'Gold Earrings', '14k gold earrings, elegant design', 12999, category_accessories_id, 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), v_restaurant_id, 'Designer Backpack', 'Premium leather backpack, multiple compartments', 19999, category_accessories_id, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop', true, NOW())
    ON CONFLICT DO NOTHING;
  END IF;

  -- Store 7: Thread & Co. (Streetwear & Urban Fashion)
  store_num := 7;
  existing_restaurant_id := NULL;
  user_email := 'apparel' || store_num || '@crave-n.shop';
  
  SELECT id INTO existing_restaurant_id FROM public.restaurants WHERE name = 'Thread & Co.' LIMIT 1;
  
  IF existing_restaurant_id IS NULL THEN
    -- Check if user already exists by email
    SELECT id INTO existing_user_id FROM auth.users WHERE email = user_email LIMIT 1;
    
    IF existing_user_id IS NULL THEN
      owner_id := gen_random_uuid();
      INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token)
      VALUES ('00000000-0000-0000-0000-000000000000', owner_id, 'authenticated', 'authenticated', user_email, crypt('ApparelPass' || store_num, gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email"}', '{}', FALSE, '', '', '', '');
    ELSE
      owner_id := existing_user_id;
    END IF;
    
    v_restaurant_id := gen_random_uuid();
    
    INSERT INTO public.user_profiles (user_id, full_name, role, created_at) 
    VALUES (owner_id, 'Thread & Co. Owner', 'admin', NOW())
    ON CONFLICT (user_id) DO NOTHING;
    
    INSERT INTO public.restaurants (id, owner_id, name, description, address, city, state, zip_code, phone, email, cuisine_type, is_active, rating, total_reviews, image_url, header_image_url, created_at, updated_at)
    VALUES (v_restaurant_id, owner_id, 'Thread & Co.', 'Premium streetwear and urban fashion. Signature branded collections featuring limited edition drops and exclusive collaborations.', '890 Urban Street', 'Toledo', 'OH', '43604', '555-1007', 'apparel7@crave-n.shop', 'apparel', true, 4.8, 342, 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=600&fit=crop', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    
    -- Create menu categories
    INSERT INTO public.menu_categories (id, restaurant_id, name, display_order, is_active, created_at, updated_at)
    VALUES 
      (gen_random_uuid(), v_restaurant_id, 'Apparel', 1, true, NOW(), NOW()),
      (gen_random_uuid(), v_restaurant_id, 'Accessories', 2, true, NOW(), NOW())
    ON CONFLICT DO NOTHING;
    
    SELECT id INTO category_apparel_id FROM public.menu_categories mc WHERE mc.restaurant_id = v_restaurant_id AND mc.name = 'Apparel' LIMIT 1;
    SELECT id INTO category_accessories_id FROM public.menu_categories mc WHERE mc.restaurant_id = v_restaurant_id AND mc.name = 'Accessories' LIMIT 1;
    
    INSERT INTO public.menu_items (id, restaurant_id, name, description, price_cents, category_id, image_url, is_available, created_at) VALUES
    (gen_random_uuid(), v_restaurant_id, 'Signature Hoodie', 'Premium cotton blend hoodie with embroidered logo', 8999, category_apparel_id, 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), v_restaurant_id, 'Limited Edition Tee', 'Exclusive graphic tee, limited run', 4999, category_apparel_id, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), v_restaurant_id, 'Streetwear Joggers', 'Comfortable joggers with signature branding', 7999, category_apparel_id, 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), v_restaurant_id, 'Signature Windbreaker', 'Lightweight windbreaker with branded design', 6999, category_apparel_id, 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), v_restaurant_id, 'Designer Cap', 'Premium snapback with embroidered logo', 3499, category_accessories_id, 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), v_restaurant_id, 'Crossbody Bag', 'Leather crossbody with signature logo', 5999, category_accessories_id, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), v_restaurant_id, 'Branded Beanie', 'Warm beanie with embroidered logo', 2499, category_accessories_id, 'https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), v_restaurant_id, 'Streetwear Backpack', 'Urban backpack with signature branding', 7999, category_accessories_id, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop', true, NOW())
    ON CONFLICT DO NOTHING;
  END IF;

  -- Store 8: Style Studio (Contemporary Fashion)
  store_num := 8;
  existing_restaurant_id := NULL;
  user_email := 'apparel' || store_num || '@crave-n.shop';
  
  SELECT id INTO existing_restaurant_id FROM public.restaurants WHERE name = 'Style Studio' LIMIT 1;
  
  IF existing_restaurant_id IS NULL THEN
    -- Check if user already exists by email
    SELECT id INTO existing_user_id FROM auth.users WHERE email = user_email LIMIT 1;
    
    IF existing_user_id IS NULL THEN
      owner_id := gen_random_uuid();
      INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token)
      VALUES ('00000000-0000-0000-0000-000000000000', owner_id, 'authenticated', 'authenticated', user_email, crypt('ApparelPass' || store_num, gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email"}', '{}', FALSE, '', '', '', '');
    ELSE
      owner_id := existing_user_id;
    END IF;
    
    v_restaurant_id := gen_random_uuid();
    
    INSERT INTO public.user_profiles (user_id, full_name, role, created_at) 
    VALUES (owner_id, 'Style Studio Owner', 'admin', NOW())
    ON CONFLICT (user_id) DO NOTHING;
    
    INSERT INTO public.restaurants (id, owner_id, name, description, address, city, state, zip_code, phone, email, cuisine_type, is_active, rating, total_reviews, image_url, header_image_url, created_at, updated_at)
    VALUES (v_restaurant_id, owner_id, 'Style Studio', 'Contemporary fashion for every occasion. Trendy apparel, shoes, and accessories. Mix of designer and affordable fashion.', '234 Fashion Plaza', 'Bowling Green', 'OH', '43402', '555-1008', 'apparel8@crave-n.shop', 'apparel', true, 4.6, 267, 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=600&fit=crop', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    
    -- Create menu categories
    INSERT INTO public.menu_categories (id, restaurant_id, name, display_order, is_active, created_at, updated_at)
    VALUES 
      (gen_random_uuid(), v_restaurant_id, 'Apparel', 1, true, NOW(), NOW()),
      (gen_random_uuid(), v_restaurant_id, 'Accessories', 2, true, NOW(), NOW()),
      (gen_random_uuid(), v_restaurant_id, 'Shoes', 3, true, NOW(), NOW())
    ON CONFLICT DO NOTHING;
    
    SELECT id INTO category_apparel_id FROM public.menu_categories mc WHERE mc.restaurant_id = v_restaurant_id AND mc.name = 'Apparel' LIMIT 1;
    SELECT id INTO category_accessories_id FROM public.menu_categories mc WHERE mc.restaurant_id = v_restaurant_id AND mc.name = 'Accessories' LIMIT 1;
    SELECT id INTO category_shoes_id FROM public.menu_categories mc WHERE mc.restaurant_id = v_restaurant_id AND mc.name = 'Shoes' LIMIT 1;
    
    INSERT INTO public.menu_items (id, restaurant_id, name, description, price_cents, category_id, image_url, is_available, created_at) VALUES
    (gen_random_uuid(), v_restaurant_id, 'Casual Blazer', 'Versatile blazer, perfect for any occasion', 8999, category_apparel_id, 'https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), v_restaurant_id, 'Designer Jeans', 'Premium denim jeans, perfect fit', 7999, category_apparel_id, 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), v_restaurant_id, 'Casual Dress', 'Versatile dress, perfect for day or night', 5999, category_apparel_id, 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), v_restaurant_id, 'Chunky Sweater', 'Cozy oversized sweater, trendy design', 6999, category_apparel_id, 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), v_restaurant_id, 'Casual Sneakers', 'Comfortable everyday sneakers, stylish design', 6999, category_shoes_id, 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), v_restaurant_id, 'Ankle Boots', 'Stylish ankle boots, comfortable heel', 8999, category_shoes_id, 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), v_restaurant_id, 'Crossbody Purse', 'Stylish crossbody purse, multiple colors', 4999, category_accessories_id, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), v_restaurant_id, 'Statement Necklace', 'Bold statement necklace, eye-catching design', 3999, category_accessories_id, 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop', true, NOW())
    ON CONFLICT DO NOTHING;
  END IF;

END $$;
