-- ============================================================================
-- MOCK CLOTHING STORES - 8 Apparel Stores
-- High-rated stores with real product images from Unsplash
-- Some stores feature signature/branded clothing lines
-- IDEMPOTENT: Checks if stores exist before inserting
-- ============================================================================

DO $$
DECLARE
  owner_id uuid;
  restaurant_id uuid;
  store_num INT;
  existing_restaurant_id uuid;
BEGIN
  -- Store 1: Thread & Co. (Signature Branded Streetwear)
  store_num := 1;
  existing_restaurant_id := NULL;
  
  SELECT id INTO existing_restaurant_id FROM public.restaurants WHERE name = 'Thread & Co.' LIMIT 1;
  
  IF existing_restaurant_id IS NULL THEN
    owner_id := gen_random_uuid();
    restaurant_id := gen_random_uuid();
    
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token)
    VALUES ('00000000-0000-0000-0000-000000000000', owner_id, 'authenticated', 'authenticated', 'apparel' || store_num || '@crave-n.shop', crypt('ApparelPass' || store_num, gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email"}', '{}', FALSE, '', '', '', '')
    ON CONFLICT (id) DO NOTHING;
    
    INSERT INTO public.user_profiles (user_id, full_name, role, created_at) 
    VALUES (owner_id, 'Thread & Co. Owner', 'admin', NOW())
    ON CONFLICT (user_id) DO NOTHING;
    
    INSERT INTO public.restaurants (id, owner_id, name, description, address, city, state, zip_code, phone, email, cuisine_type, is_active, rating, total_reviews, image_url, header_image_url, created_at, updated_at)
    VALUES (restaurant_id, owner_id, 'Thread & Co.', 'Premium streetwear and urban fashion. Signature branded collections featuring limited edition drops and exclusive collaborations.', '101 Fashion Avenue', 'Toledo', 'OH', '43604', '555-1001', 'apparel1@crave-n.shop', 'apparel', true, 4.8, 342, 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=600&fit=crop', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    
    INSERT INTO public.menu_items (id, restaurant_id, name, description, price_cents, category, image_url, is_available, created_at) VALUES
    (gen_random_uuid(), restaurant_id, 'Signature Hoodie', 'Premium cotton blend hoodie with embroidered logo', 8999, 'Apparel', 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), restaurant_id, 'Limited Edition Tee', 'Exclusive graphic tee, limited run', 4999, 'Apparel', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), restaurant_id, 'Streetwear Joggers', 'Comfortable joggers with signature branding', 7999, 'Apparel', 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), restaurant_id, 'Designer Cap', 'Premium snapback with embroidered logo', 3499, 'Accessories', 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), restaurant_id, 'Branded Sneakers', 'Exclusive collaboration sneakers', 14999, 'Shoes', 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), restaurant_id, 'Crossbody Bag', 'Leather crossbody with signature logo', 5999, 'Accessories', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), restaurant_id, 'Branded Beanie', 'Warm beanie with embroidered logo', 2499, 'Accessories', 'https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), restaurant_id, 'Signature Windbreaker', 'Lightweight windbreaker with branded design', 6999, 'Apparel', 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=400&fit=crop', true, NOW())
    ON CONFLICT DO NOTHING;
  END IF;

  -- Store 2: Elite Couture (Luxury Branded Fashion)
  store_num := 2;
  existing_restaurant_id := NULL;
  
  SELECT id INTO existing_restaurant_id FROM public.restaurants WHERE name = 'Elite Couture' LIMIT 1;
  
  IF existing_restaurant_id IS NULL THEN
    owner_id := gen_random_uuid();
    restaurant_id := gen_random_uuid();
    
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token)
    VALUES ('00000000-0000-0000-0000-000000000000', owner_id, 'authenticated', 'authenticated', 'apparel' || store_num || '@crave-n.shop', crypt('ApparelPass' || store_num, gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email"}', '{}', FALSE, '', '', '', '')
    ON CONFLICT (id) DO NOTHING;
    
    INSERT INTO public.user_profiles (user_id, full_name, role, created_at) 
    VALUES (owner_id, 'Elite Couture Owner', 'admin', NOW())
    ON CONFLICT (user_id) DO NOTHING;
    
    INSERT INTO public.restaurants (id, owner_id, name, description, address, city, state, zip_code, phone, email, cuisine_type, is_active, rating, total_reviews, image_url, header_image_url, created_at, updated_at)
    VALUES (restaurant_id, owner_id, 'Elite Couture', 'Luxury fashion house specializing in designer apparel, accessories, and footwear. Exclusive branded collections for the discerning shopper.', '102 Fashion Avenue', 'Toledo', 'OH', '43604', '555-1002', 'apparel2@crave-n.shop', 'apparel', true, 4.9, 287, 'https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&h=600&fit=crop', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    
    INSERT INTO public.menu_items (id, restaurant_id, name, description, price_cents, category, image_url, is_available, created_at) VALUES
    (gen_random_uuid(), restaurant_id, 'Designer Blazer', 'Tailored wool blazer, premium quality', 24999, 'Apparel', 'https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), restaurant_id, 'Silk Scarf', 'Luxury silk scarf, designer pattern', 8999, 'Accessories', 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), restaurant_id, 'Leather Handbag', 'Premium leather handbag, designer brand', 34999, 'Accessories', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), restaurant_id, 'Designer Dress', 'Elegant evening dress, exclusive design', 19999, 'Apparel', 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), restaurant_id, 'Luxury Watch', 'Swiss timepiece, premium craftsmanship', 49999, 'Accessories', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), restaurant_id, 'Designer Heels', 'Italian leather heels, elegant design', 17999, 'Shoes', 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), restaurant_id, 'Cashmere Coat', 'Premium cashmere coat, timeless elegance', 39999, 'Apparel', 'https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), restaurant_id, 'Designer Sunglasses', 'Luxury sunglasses, UV protection', 12999, 'Accessories', 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&h=400&fit=crop', true, NOW())
    ON CONFLICT DO NOTHING;
  END IF;

  -- Store 3: Sole Society (Sneakers & Athletic)
  store_num := 3;
  existing_restaurant_id := NULL;
  
  SELECT id INTO existing_restaurant_id FROM public.restaurants WHERE name = 'Sole Society' LIMIT 1;
  
  IF existing_restaurant_id IS NULL THEN
    owner_id := gen_random_uuid();
    restaurant_id := gen_random_uuid();
    
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token)
    VALUES ('00000000-0000-0000-0000-000000000000', owner_id, 'authenticated', 'authenticated', 'apparel' || store_num || '@crave-n.shop', crypt('ApparelPass' || store_num, gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email"}', '{}', FALSE, '', '', '', '')
    ON CONFLICT (id) DO NOTHING;
    
    INSERT INTO public.user_profiles (user_id, full_name, role, created_at) 
    VALUES (owner_id, 'Sole Society Owner', 'admin', NOW())
    ON CONFLICT (user_id) DO NOTHING;
    
    INSERT INTO public.restaurants (id, owner_id, name, description, address, city, state, zip_code, phone, email, cuisine_type, is_active, rating, total_reviews, image_url, header_image_url, created_at, updated_at)
    VALUES (restaurant_id, owner_id, 'Sole Society', 'Your destination for premium sneakers, athletic wear, and street style. Featuring exclusive shoe drops and branded athletic collections.', '103 Fashion Avenue', 'Toledo', 'OH', '43604', '555-1003', 'apparel3@crave-n.shop', 'apparel', true, 4.7, 456, 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=600&fit=crop', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    
    INSERT INTO public.menu_items (id, restaurant_id, name, description, price_cents, category, image_url, is_available, created_at) VALUES
    (gen_random_uuid(), restaurant_id, 'Premium Sneakers', 'Limited edition athletic sneakers', 12999, 'Shoes', 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), restaurant_id, 'Running Shoes', 'High-performance running shoes', 9999, 'Shoes', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), restaurant_id, 'Athletic Shorts', 'Moisture-wicking athletic shorts', 3999, 'Apparel', 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), restaurant_id, 'Sports Jersey', 'Authentic sports jersey, premium quality', 7999, 'Apparel', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), restaurant_id, 'Athletic Socks', 'Performance athletic socks, 3-pack', 1999, 'Accessories', 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), restaurant_id, 'Gym Bag', 'Durable gym bag with multiple compartments', 4999, 'Accessories', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), restaurant_id, 'Basketball Shoes', 'High-top basketball shoes, excellent grip', 11999, 'Shoes', 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), restaurant_id, 'Athletic Tank', 'Breathable athletic tank top', 3499, 'Apparel', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop', true, NOW())
    ON CONFLICT DO NOTHING;
  END IF;

  -- Store 4: Vintage Vault (Vintage & Retro)
  store_num := 4;
  existing_restaurant_id := NULL;
  
  SELECT id INTO existing_restaurant_id FROM public.restaurants WHERE name = 'Vintage Vault' LIMIT 1;
  
  IF existing_restaurant_id IS NULL THEN
    owner_id := gen_random_uuid();
    restaurant_id := gen_random_uuid();
    
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token)
    VALUES ('00000000-0000-0000-0000-000000000000', owner_id, 'authenticated', 'authenticated', 'apparel' || store_num || '@crave-n.shop', crypt('ApparelPass' || store_num, gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email"}', '{}', FALSE, '', '', '', '')
    ON CONFLICT (id) DO NOTHING;
    
    INSERT INTO public.user_profiles (user_id, full_name, role, created_at) 
    VALUES (owner_id, 'Vintage Vault Owner', 'admin', NOW())
    ON CONFLICT (user_id) DO NOTHING;
    
    INSERT INTO public.restaurants (id, owner_id, name, description, address, city, state, zip_code, phone, email, cuisine_type, is_active, rating, total_reviews, image_url, header_image_url, created_at, updated_at)
    VALUES (restaurant_id, owner_id, 'Vintage Vault', 'Curated collection of vintage and retro clothing, accessories, and unique finds. One-of-a-kind pieces with authentic character.', '104 Fashion Avenue', 'Toledo', 'OH', '43604', '555-1004', 'apparel4@crave-n.shop', 'apparel', true, 4.6, 198, 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1558769132-7c5c0e0e0c5e?w=800&h=600&fit=crop', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    
    INSERT INTO public.menu_items (id, restaurant_id, name, description, price_cents, category, image_url, is_available, created_at) VALUES
    (gen_random_uuid(), restaurant_id, 'Vintage Denim Jacket', 'Authentic 90s denim jacket, one-of-a-kind', 8999, 'Apparel', 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), restaurant_id, 'Retro Sunglasses', 'Vintage style sunglasses, classic design', 2999, 'Accessories', 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), restaurant_id, 'Vintage Band Tee', 'Authentic concert tee, rare find', 5999, 'Apparel', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), restaurant_id, 'Classic Leather Boots', 'Vintage leather boots, restored', 11999, 'Shoes', 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), restaurant_id, 'Retro Backpack', 'Vintage style backpack, unique design', 4999, 'Accessories', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), restaurant_id, 'Vintage Watch', 'Classic timepiece, restored condition', 7999, 'Accessories', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), restaurant_id, 'Retro High-Waist Jeans', 'Vintage denim, authentic 80s style', 6999, 'Apparel', 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), restaurant_id, 'Vintage Leather Jacket', 'Classic motorcycle jacket, authentic', 14999, 'Apparel', 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=400&fit=crop', true, NOW())
    ON CONFLICT DO NOTHING;
  END IF;

  -- Store 5: Craven Threads (Signature Craven Branded)
  store_num := 5;
  existing_restaurant_id := NULL;
  
  SELECT id INTO existing_restaurant_id FROM public.restaurants WHERE name = 'Craven Threads' LIMIT 1;
  
  IF existing_restaurant_id IS NULL THEN
    owner_id := gen_random_uuid();
    restaurant_id := gen_random_uuid();
    
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token)
    VALUES ('00000000-0000-0000-0000-000000000000', owner_id, 'authenticated', 'authenticated', 'apparel' || store_num || '@crave-n.shop', crypt('ApparelPass' || store_num, gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email"}', '{}', FALSE, '', '', '', '')
    ON CONFLICT (id) DO NOTHING;
    
    INSERT INTO public.user_profiles (user_id, full_name, role, created_at) 
    VALUES (owner_id, 'Craven Threads Owner', 'admin', NOW())
    ON CONFLICT (user_id) DO NOTHING;
    
    INSERT INTO public.restaurants (id, owner_id, name, description, address, city, state, zip_code, phone, email, cuisine_type, is_active, rating, total_reviews, image_url, header_image_url, created_at, updated_at)
    VALUES (restaurant_id, owner_id, 'Craven Threads', 'Signature Craven branded clothing line. Exclusive apparel, accessories, and merchandise featuring our iconic designs and premium quality.', '105 Fashion Avenue', 'Toledo', 'OH', '43604', '555-1005', 'apparel5@crave-n.shop', 'apparel', true, 4.9, 523, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=800&h=600&fit=crop', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    
    INSERT INTO public.menu_items (id, restaurant_id, name, description, price_cents, category, image_url, is_available, created_at) VALUES
    (gen_random_uuid(), restaurant_id, 'Craven Signature Hoodie', 'Official Craven branded hoodie, premium quality', 7999, 'Apparel', 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), restaurant_id, 'Craven Logo Tee', 'Classic Craven logo t-shirt, multiple colors', 3999, 'Apparel', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), restaurant_id, 'Craven Cap', 'Official Craven snapback cap', 2999, 'Accessories', 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), restaurant_id, 'Craven Tote Bag', 'Canvas tote bag with Craven branding', 2499, 'Accessories', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), restaurant_id, 'Craven Crewneck', 'Comfortable crewneck sweater, Craven logo', 5999, 'Apparel', 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), restaurant_id, 'Craven Stickers Pack', 'Set of 10 Craven logo stickers', 999, 'Accessories', 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), restaurant_id, 'Craven Windbreaker', 'Lightweight windbreaker with Craven branding', 6999, 'Apparel', 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), restaurant_id, 'Craven Water Bottle', 'Insulated water bottle with Craven logo', 3499, 'Accessories', 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&h=400&fit=crop', true, NOW())
    ON CONFLICT DO NOTHING;
  END IF;

  -- Store 6: Accessory Avenue (Premium Accessories)
  store_num := 6;
  existing_restaurant_id := NULL;
  
  SELECT id INTO existing_restaurant_id FROM public.restaurants WHERE name = 'Accessory Avenue' LIMIT 1;
  
  IF existing_restaurant_id IS NULL THEN
    owner_id := gen_random_uuid();
    restaurant_id := gen_random_uuid();
    
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token)
    VALUES ('00000000-0000-0000-0000-000000000000', owner_id, 'authenticated', 'authenticated', 'apparel' || store_num || '@crave-n.shop', crypt('ApparelPass' || store_num, gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email"}', '{}', FALSE, '', '', '', '')
    ON CONFLICT (id) DO NOTHING;
    
    INSERT INTO public.user_profiles (user_id, full_name, role, created_at) 
    VALUES (owner_id, 'Accessory Avenue Owner', 'admin', NOW())
    ON CONFLICT (user_id) DO NOTHING;
    
    INSERT INTO public.restaurants (id, owner_id, name, description, address, city, state, zip_code, phone, email, cuisine_type, is_active, rating, total_reviews, image_url, header_image_url, created_at, updated_at)
    VALUES (restaurant_id, owner_id, 'Accessory Avenue', 'Premium accessories boutique. Handbags, jewelry, watches, belts, and more. Designer brands and exclusive collections.', '106 Fashion Avenue', 'Toledo', 'OH', '43604', '555-1006', 'apparel6@crave-n.shop', 'apparel', true, 4.7, 312, 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&h=600&fit=crop', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    
    INSERT INTO public.menu_items (id, restaurant_id, name, description, price_cents, category, image_url, is_available, created_at) VALUES
    (gen_random_uuid(), restaurant_id, 'Designer Handbag', 'Premium leather handbag, multiple colors', 27999, 'Accessories', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), restaurant_id, 'Leather Belt', 'Genuine leather belt, classic buckle', 4999, 'Accessories', 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), restaurant_id, 'Silver Necklace', 'Sterling silver necklace, elegant design', 8999, 'Accessories', 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), restaurant_id, 'Designer Watch', 'Luxury timepiece, Swiss movement', 34999, 'Accessories', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), restaurant_id, 'Sunglasses', 'Premium sunglasses, UV protection', 5999, 'Accessories', 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), restaurant_id, 'Leather Wallet', 'Genuine leather wallet, RFID blocking', 3999, 'Accessories', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), restaurant_id, 'Gold Earrings', '14k gold earrings, elegant design', 12999, 'Accessories', 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), restaurant_id, 'Designer Backpack', 'Premium leather backpack, multiple compartments', 19999, 'Accessories', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop', true, NOW())
    ON CONFLICT DO NOTHING;
  END IF;

  -- Store 7: Athletic Edge (Performance Sportswear)
  store_num := 7;
  existing_restaurant_id := NULL;
  
  SELECT id INTO existing_restaurant_id FROM public.restaurants WHERE name = 'Athletic Edge' LIMIT 1;
  
  IF existing_restaurant_id IS NULL THEN
    owner_id := gen_random_uuid();
    restaurant_id := gen_random_uuid();
    
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token)
    VALUES ('00000000-0000-0000-0000-000000000000', owner_id, 'authenticated', 'authenticated', 'apparel' || store_num || '@crave-n.shop', crypt('ApparelPass' || store_num, gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email"}', '{}', FALSE, '', '', '', '')
    ON CONFLICT (id) DO NOTHING;
    
    INSERT INTO public.user_profiles (user_id, full_name, role, created_at) 
    VALUES (owner_id, 'Athletic Edge Owner', 'admin', NOW())
    ON CONFLICT (user_id) DO NOTHING;
    
    INSERT INTO public.restaurants (id, owner_id, name, description, address, city, state, zip_code, phone, email, cuisine_type, is_active, rating, total_reviews, image_url, header_image_url, created_at, updated_at)
    VALUES (restaurant_id, owner_id, 'Athletic Edge', 'Performance sportswear and athletic gear. Premium branded activewear, running shoes, gym apparel, and fitness accessories.', '107 Fashion Avenue', 'Toledo', 'OH', '43604', '555-1007', 'apparel7@crave-n.shop', 'apparel', true, 4.8, 389, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    
    INSERT INTO public.menu_items (id, restaurant_id, name, description, price_cents, category, image_url, is_available, created_at) VALUES
    (gen_random_uuid(), restaurant_id, 'Performance Leggings', 'High-performance leggings, moisture-wicking', 5999, 'Apparel', 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), restaurant_id, 'Athletic Tank Top', 'Breathable tank top, quick-dry fabric', 3499, 'Apparel', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), restaurant_id, 'Running Shorts', 'Lightweight running shorts, reflective details', 4499, 'Apparel', 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), restaurant_id, 'Training Shoes', 'Multi-purpose training shoes, excellent grip', 10999, 'Shoes', 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), restaurant_id, 'Sports Bra', 'High-support sports bra, moisture-wicking', 3999, 'Apparel', 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), restaurant_id, 'Athletic Jacket', 'Lightweight athletic jacket, wind-resistant', 7999, 'Apparel', 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), restaurant_id, 'Yoga Mat', 'Premium non-slip yoga mat', 4999, 'Accessories', 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), restaurant_id, 'Resistance Bands Set', 'Set of 5 resistance bands, various strengths', 2999, 'Accessories', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop', true, NOW())
    ON CONFLICT DO NOTHING;
  END IF;

  -- Store 8: Style Studio (Contemporary Fashion)
  store_num := 8;
  existing_restaurant_id := NULL;
  
  SELECT id INTO existing_restaurant_id FROM public.restaurants WHERE name = 'Style Studio' LIMIT 1;
  
  IF existing_restaurant_id IS NULL THEN
    owner_id := gen_random_uuid();
    restaurant_id := gen_random_uuid();
    
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token)
    VALUES ('00000000-0000-0000-0000-000000000000', owner_id, 'authenticated', 'authenticated', 'apparel' || store_num || '@crave-n.shop', crypt('ApparelPass' || store_num, gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email"}', '{}', FALSE, '', '', '', '')
    ON CONFLICT (id) DO NOTHING;
    
    INSERT INTO public.user_profiles (user_id, full_name, role, created_at) 
    VALUES (owner_id, 'Style Studio Owner', 'admin', NOW())
    ON CONFLICT (user_id) DO NOTHING;
    
    INSERT INTO public.restaurants (id, owner_id, name, description, address, city, state, zip_code, phone, email, cuisine_type, is_active, rating, total_reviews, image_url, header_image_url, created_at, updated_at)
    VALUES (restaurant_id, owner_id, 'Style Studio', 'Contemporary fashion for every occasion. Trendy apparel, shoes, and accessories. Mix of designer and affordable fashion.', '108 Fashion Avenue', 'Toledo', 'OH', '43604', '555-1008', 'apparel8@crave-n.shop', 'apparel', true, 4.6, 267, 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=600&fit=crop', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    
    INSERT INTO public.menu_items (id, restaurant_id, name, description, price_cents, category, image_url, is_available, created_at) VALUES
    (gen_random_uuid(), restaurant_id, 'Casual Blazer', 'Versatile blazer, perfect for any occasion', 8999, 'Apparel', 'https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), restaurant_id, 'Designer Jeans', 'Premium denim jeans, perfect fit', 7999, 'Apparel', 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), restaurant_id, 'Casual Sneakers', 'Comfortable everyday sneakers, stylish design', 6999, 'Shoes', 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), restaurant_id, 'Crossbody Purse', 'Stylish crossbody purse, multiple colors', 4999, 'Accessories', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), restaurant_id, 'Casual Dress', 'Versatile dress, perfect for day or night', 5999, 'Apparel', 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), restaurant_id, 'Ankle Boots', 'Stylish ankle boots, comfortable heel', 8999, 'Shoes', 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), restaurant_id, 'Chunky Sweater', 'Cozy oversized sweater, trendy design', 6999, 'Apparel', 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=400&fit=crop', true, NOW()),
    (gen_random_uuid(), restaurant_id, 'Statement Necklace', 'Bold statement necklace, eye-catching design', 3999, 'Accessories', 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop', true, NOW())
    ON CONFLICT DO NOTHING;
  END IF;

END $$;
