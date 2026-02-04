# Apply Apparel Stores Migration

The apparel stores migration needs to be applied to the database before they will appear on the Restaurants page.

## Quick Apply via Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/xaxbucnjlrfkccsfiddq/sql/new
2. Copy the **entire contents** of `supabase/migrations/20260203170000_add_apparel_stores.sql`
3. Paste into the SQL Editor
4. Click **Run** to execute
5. You should see "Success. No rows returned"

## Verify Migration Applied

After running the migration, verify the stores exist:

```sql
-- Check if apparel stores exist
SELECT name, cuisine_type, is_active, rating 
FROM public.restaurants 
WHERE cuisine_type = 'apparel' 
ORDER BY name;
```

You should see 8 stores:
- Thread & Co.
- Elite Couture
- Sole Society
- Vintage Vault
- Craven Threads
- Accessory Avenue
- Athletic Edge
- Style Studio

## Check Menu Items

Verify menu items were created:

```sql
-- Count menu items per apparel store
SELECT 
  r.name as store_name,
  COUNT(mi.id) as menu_item_count
FROM public.restaurants r
LEFT JOIN public.menu_items mi ON mi.restaurant_id = r.id
WHERE r.cuisine_type = 'apparel'
GROUP BY r.id, r.name
ORDER BY r.name;
```

Each store should have 8 menu items.

## After Migration

Once the migration is complete:
1. Refresh the Restaurants page at `http://localhost:8080/restaurants`
2. You should see:
   - **Restaurants** section (excluding apparel)
   - **Apparel** section (showing all 8 apparel stores)
3. Clicking on any apparel store should show their menu items

## Troubleshooting

If stores don't appear after migration:
1. Check browser console for errors
2. Verify `is_active = true` for all apparel stores
3. Check RLS policies allow reading restaurants
4. Hard refresh the page (Ctrl+Shift+R)

