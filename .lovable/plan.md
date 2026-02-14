

# Show Restaurant Logo Icons on Map

## What Changes

Replace the current colored circle markers with each restaurant's actual logo image displayed at their map location.

## Approach

Instead of using Mapbox's built-in `circle` layer (which only supports solid colors), switch to **HTML-based markers** (`mapboxgl.Marker({ element })`) for individual restaurants. Each marker will be a small circular element showing the restaurant's `logo_url` from the database.

### RestaurantMapLayer.ts -- Full Rewrite of Unclustered Points

- Keep the **cluster circles** (orange dots with count) for zoomed-out views -- these stay as-is since clusters don't represent a single restaurant
- Replace the `circle` layer for individual (unclustered) points with **dynamic HTML markers**
- For each restaurant, create an HTML element:
  - 36px circular container with white border and drop shadow
  - `<img>` inside showing the restaurant's `logo_url`
  - Fallback: if no logo, show a colored circle with the first letter of the restaurant name
- On click, show the same popup (name, cuisine, rating)
- Track all created markers for cleanup on unmount

### Key Technical Detail

Since Mapbox clustering only works with GeoJSON source layers (not HTML markers), we need a hybrid approach:
- Keep the GeoJSON source with clustering enabled for the cluster circles
- Listen to `render` / `moveend` events on the map
- Query visible unclustered features using `map.querySourceFeatures()` 
- Create/remove HTML markers dynamically as the user pans and zooms

### Marker Design

```text
+------------------+
|  36px circle     |
|  white border    |
|  drop-shadow     |
|  [restaurant     |
|   logo image]    |
+------------------+
```

- Size: 36px diameter
- Border: 2px solid white
- Shadow: subtle drop shadow
- Border-radius: 50% (fully round)
- Fallback: orange circle with white initial letter

### Files Modified

| File | Change |
|------|--------|
| `src/components/map/RestaurantMapLayer.ts` | Replace circle layer with HTML logo markers using hybrid cluster + marker approach |
| `src/hooks/useRestaurantLocations.ts` | No changes needed -- already fetches `logo_url` |

No other files need changes since `MobileMapbox.tsx`, `ZoneVisualizationMap.tsx`, and `OrderMap.tsx` all call `addRestaurantLayer()` -- updating that one function updates all maps.

