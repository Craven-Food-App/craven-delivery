

# Show Restaurants, Stores, and Fast Food on Mapbox Maps

## Overview

Add restaurant/store markers to the Mapbox maps so drivers and customers can see nearby food locations visually. The restaurants table already has `latitude` and `longitude` data, and Mapbox is already configured in the project.

## What Gets Built

### 1. Restaurant Map Markers Component

A reusable component that fetches restaurants from Supabase and plots them as markers on any Mapbox map instance.

- Fetch all active restaurants with valid lat/lng from the `restaurants` table
- Use the existing branded Crave'N pin (from `createCravenMapPin.ts`) for markers
- Show a popup on tap/click with restaurant name, cuisine type, rating, and delivery time
- Color-code or use icons by `restaurant_type` (full_service, retail_store, fast_food, etc.)

### 2. Integration Points

**Driver Dashboard Map (MobileDriverDashboard.tsx)**
- When the driver is online and viewing the map, show nearby restaurant markers
- Tapping a restaurant marker shows a quick info popup (name, cuisine, rating)
- Markers help drivers orient themselves relative to pickup locations

**Zone Visualization Map (ZoneVisualizationMap.tsx)**
- Add restaurant markers as an optional overlay on the admin zone map
- Admins can see where restaurants are located relative to delivery zones
- Toggle layer on/off to avoid clutter

**Customer Order Map (OrderMap.tsx)**
- Show restaurant locations on the customer-facing map
- Tapping a marker could navigate to that restaurant's menu

### 3. Data Flow

- Query: `SELECT id, name, latitude, longitude, cuisine_type, rating, restaurant_type, logo_url, is_active FROM restaurants WHERE is_active = true AND latitude IS NOT NULL AND longitude IS NOT NULL`
- Cache with React Query to avoid repeated fetches
- Convert to GeoJSON FeatureCollection for Mapbox source layer

## Technical Details

### New Files

**`src/hooks/useRestaurantLocations.ts`**
- React Query hook to fetch restaurant locations from Supabase
- Returns GeoJSON-formatted data ready for Mapbox
- Caches for 5 minutes

**`src/components/map/RestaurantMapLayer.ts`**
- Helper function that takes a `mapboxgl.Map` instance and adds:
  - A GeoJSON source (`restaurants-source`) with all restaurant points
  - A symbol/circle layer (`restaurants-layer`) for the markers
  - Click handlers for popups showing restaurant info
- Supports the branded Crave'N pin as custom marker image
- Includes a cleanup function to remove layers on unmount

### Modified Files

**`src/components/admin/ZoneVisualizationMap.tsx`**
- After zones load, also add the restaurant markers layer
- Add a toggle button to show/hide restaurants

**`src/components/mobile/MobileDriverDashboard.tsx`**
- Where the Mapbox map is initialized, call the restaurant layer helper
- Show restaurant pins alongside the driver's current location

**`src/components/OrderMap.tsx`** (and `apps/customer/` version)
- Replace the Google Maps iframe with the Mapbox map
- Add restaurant markers using the shared helper

### Marker Design

- Use the existing Crave'N gold compass pin (`feeder_nav_button_compressed.png`) for restaurant markers
- Size: 32px for standard, 40px for promoted restaurants
- Popup content: Restaurant name, cuisine type, star rating, estimated delivery time
- Cluster markers when zoomed out (Mapbox clustering) to avoid visual clutter

### Restaurant Type Indicators

| Type | Visual |
|------|--------|
| Fast Food | Orange pin with lightning icon overlay |
| Full Service | Orange pin with fork/knife overlay |
| Retail Store | Orange pin with shopping bag overlay |
| Default | Standard Crave'N pin |

## Summary of Changes

| File | Action |
|------|--------|
| `src/hooks/useRestaurantLocations.ts` | **New** -- React Query hook for restaurant lat/lng data |
| `src/components/map/RestaurantMapLayer.ts` | **New** -- Reusable Mapbox layer helper |
| `src/components/admin/ZoneVisualizationMap.tsx` | **Edit** -- Add restaurant markers overlay |
| `src/components/mobile/MobileDriverDashboard.tsx` | **Edit** -- Show restaurants on driver map |
| `src/components/OrderMap.tsx` | **Edit** -- Add restaurant markers |

