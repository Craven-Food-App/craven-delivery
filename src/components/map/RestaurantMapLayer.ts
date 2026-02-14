import { RestaurantLocation, restaurantsToGeoJSON } from '@/hooks/useRestaurantLocations';

const SOURCE_ID = 'restaurants-source';
const CLUSTER_LAYER_ID = 'restaurant-clusters';
const CLUSTER_COUNT_LAYER_ID = 'restaurant-cluster-count';

// Track markers per map instance
const markerRegistry = new WeakMap<any, Map<string, any>>();

/**
 * Adds restaurant markers to a Mapbox map instance with clustering.
 * Clusters use circle layers; individual restaurants use HTML markers with logo images.
 * Returns a cleanup function to remove all layers/sources/markers.
 */
export function addRestaurantLayer(
  map: any,
  restaurants: RestaurantLocation[],
  options?: { onClick?: (restaurantId: string) => void }
): () => void {
  if (!map || !map.isStyleLoaded()) return () => {};

  const geoJson = restaurantsToGeoJSON(restaurants);

  // Remove existing layers/source/markers if present
  removeRestaurantLayer(map);

  map.addSource(SOURCE_ID, {
    type: 'geojson',
    data: geoJson,
    cluster: true,
    clusterMaxZoom: 14,
    clusterRadius: 50,
  });

  // Cluster circles
  map.addLayer({
    id: CLUSTER_LAYER_ID,
    type: 'circle',
    source: SOURCE_ID,
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': '#f97316',
      'circle-radius': ['step', ['get', 'point_count'], 18, 10, 24, 30, 32],
      'circle-stroke-width': 2,
      'circle-stroke-color': '#fff',
    },
  });

  // Cluster count text
  map.addLayer({
    id: CLUSTER_COUNT_LAYER_ID,
    type: 'symbol',
    source: SOURCE_ID,
    filter: ['has', 'point_count'],
    layout: {
      'text-field': ['get', 'point_count_abbreviated'],
      'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
      'text-size': 13,
    },
    paint: {
      'text-color': '#ffffff',
    },
  });

  // Click on cluster to zoom in
  map.on('click', CLUSTER_LAYER_ID, (e: any) => {
    const features = map.queryRenderedFeatures(e.point, { layers: [CLUSTER_LAYER_ID] });
    if (!features.length) return;
    const clusterId = features[0].properties.cluster_id;
    map.getSource(SOURCE_ID).getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
      if (err) return;
      map.easeTo({ center: features[0].geometry.coordinates, zoom });
    });
  });

  // Cursor pointer on cluster hover
  map.on('mouseenter', CLUSTER_LAYER_ID, () => {
    map.getCanvas().style.cursor = 'pointer';
  });
  map.on('mouseleave', CLUSTER_LAYER_ID, () => {
    map.getCanvas().style.cursor = '';
  });

  // Build a lookup of restaurant data by id for popups
  const restaurantMap = new Map<string, RestaurantLocation>();
  restaurants.forEach((r) => restaurantMap.set(r.id, r));

  // Initialize marker registry for this map
  const markers = new Map<string, any>();
  markerRegistry.set(map, markers);

  // Sync HTML logo markers for unclustered points
  function syncMarkers() {
    if (!map.getSource(SOURCE_ID)) return;

    const features = map.querySourceFeatures(SOURCE_ID, {
      filter: ['!', ['has', 'point_count']],
    });

    const visibleIds = new Set<string>();

    for (const feature of features) {
      const id = feature.properties?.id;
      if (!id || visibleIds.has(id)) continue;
      visibleIds.add(id);

      if (markers.has(id)) continue;

      const coords = (feature.geometry as any).coordinates;
      const props = feature.properties!;
      const r = restaurantMap.get(id);

      const el = createLogoMarkerElement(
        props.logo_url || r?.logo_url || '',
        props.name || r?.name || ''
      );

      const marker = new (window as any).mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat(coords)
        .addTo(map);

      el.addEventListener('click', (e: Event) => {
        e.stopPropagation();
        const ratingStars = props.rating ? `⭐ ${Number(props.rating).toFixed(1)}` : '';
        const typeLabel = getTypeLabel(props.restaurant_type);

        new (window as any).mapboxgl.Popup({ offset: 15, maxWidth: '220px' })
          .setLngLat(coords)
          .setHTML(`
            <div style="font-family: system-ui, sans-serif; padding: 4px;">
              <div style="font-weight: 600; font-size: 14px; margin-bottom: 2px;">${props.name}</div>
              <div style="font-size: 12px; color: #666; margin-bottom: 2px;">${props.cuisine_type || 'General'}</div>
              <div style="display: flex; gap: 8px; font-size: 12px;">
                ${ratingStars ? `<span>${ratingStars}</span>` : ''}
                <span style="color: #f97316; font-weight: 500;">${typeLabel}</span>
              </div>
            </div>
          `)
          .addTo(map);

        if (options?.onClick) {
          options.onClick(id);
        }
      });

      markers.set(id, marker);
    }

    // Remove markers that are no longer visible (clustered or out of view)
    markers.forEach((marker, id) => {
      if (!visibleIds.has(id)) {
        marker.remove();
        markers.delete(id);
      }
    });
  }

  map.on('render', syncMarkers);

  return () => {
    map.off('render', syncMarkers);
    removeRestaurantLayer(map);
  };
}

function createLogoMarkerElement(logoUrl: string, name: string): HTMLDivElement {
  const size = 36;
  const el = document.createElement('div');
  el.style.cssText = `
    width: ${size}px;
    height: ${size}px;
    border-radius: 50%;
    border: 2px solid #fff;
    overflow: hidden;
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    background-color: #f97316;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.15s ease;
  `;

  el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.15)'; });
  el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)'; });

  if (logoUrl) {
    const img = document.createElement('img');
    img.src = logoUrl;
    img.alt = name;
    img.style.cssText = `width: 100%; height: 100%; object-fit: cover;`;
    img.onerror = () => {
      img.remove();
      el.appendChild(createFallbackLetter(name));
    };
    el.appendChild(img);
  } else {
    el.appendChild(createFallbackLetter(name));
  }

  return el;
}

function createFallbackLetter(name: string): HTMLSpanElement {
  const span = document.createElement('span');
  span.textContent = (name || '?')[0].toUpperCase();
  span.style.cssText = `color: #fff; font-weight: 700; font-size: 16px; font-family: system-ui, sans-serif;`;
  return span;
}

function removeRestaurantLayer(map: any) {
  // Remove HTML markers
  const markers = markerRegistry.get(map);
  if (markers) {
    markers.forEach((m) => m.remove());
    markers.clear();
  }

  try {
    if (map.getLayer(CLUSTER_COUNT_LAYER_ID)) map.removeLayer(CLUSTER_COUNT_LAYER_ID);
    if (map.getLayer(CLUSTER_LAYER_ID)) map.removeLayer(CLUSTER_LAYER_ID);
    if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
  } catch {
    // ignore
  }
}

function getTypeLabel(type: string): string {
  switch (type) {
    case 'fast_food': return '⚡ Fast Food';
    case 'full_service': return '🍴 Restaurant';
    case 'retail_store': return '🛍️ Store';
    default: return '📍 Eatery';
  }
}

export function updateRestaurantData(map: any, restaurants: RestaurantLocation[]) {
  if (!map) return;
  const source = map.getSource(SOURCE_ID);
  if (source) {
    source.setData(restaurantsToGeoJSON(restaurants));
  }
}
