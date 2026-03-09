

# Show Seeded Restaurants on Root App Homepage

## Problem
The root app's `src/pages/Index.tsx` imports `RestaurantGrid` but never renders it. The homepage only shows `Header`, `Hero`, and `Footer`. The seeded restaurants in `restaurants_master` (107 restaurants like McDonald's, Arby's, Tony Packo's, etc.) only appear when navigating to `/restaurants`.

## Plan

### 1. Add RestaurantGrid to `src/pages/Index.tsx`
Insert a restaurant browsing section between `<Hero />` and `<Footer />` that mirrors what the Restaurants page does:

- Add a "Restaurants Near You" section using `<RestaurantGrid useNearbyByLocation={true} marketplaceType="restaurant" />` — this calls the `get_business_nearby` RPC which queries `restaurants_master`
- Add a "Browse All" section with `<RestaurantGrid useMarketplaceCatalog={true} />` as a fallback showing all seeded restaurants
- Use horizontal scroll layout for the "near you" section, grid layout for "browse all"
- Style consistently with the existing Restaurants page sections

### 2. Fix Build Errors (separate concern)
The 30+ edge function TypeScript errors are pre-existing and unrelated to this feature. They involve `getCorsHeaders` signature mismatches, `.catch()` on Postgrest builders, and type incompatibilities. These should be addressed separately to keep this change focused.

## Files Changed
- **`src/pages/Index.tsx`** — Add RestaurantGrid sections between Hero and Footer

