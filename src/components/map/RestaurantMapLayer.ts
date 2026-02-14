import { RestaurantLocation, restaurantsToGeoJSON } from '@/hooks/useRestaurantLocations';

const SOURCE_ID = 'restaurants-source';
const CLUSTER_LAYER_ID = 'restaurant-clusters';
const CLUSTER_COUNT_LAYER_ID = 'restaurant-cluster-count';
const UNCLUSTERED_LAYER_ID = 'restaurant-points';

/**
 * Adds restaurant markers to a Mapbox map instance with clustering.
 * Returns a cleanup function to remove all layers/sources.
 */
export function addRestaurantLayer(
  map: any,
  restaurants: RestaurantLocation[],
  options?: { onClick?: (restaurantId: string) => void }
): () => void {
  if (!map || !map.isStyleLoaded()) return () => {};

  const geoJson = restaurantsToGeoJSON(restaurants);

  // Remove existing layers/source if present
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
      'circle-color': '#f97316', // Orange for Crave'N brand
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

  // Individual restaurant points
  map.addLayer({
    id: UNCLUSTERED_LAYER_ID,
    type: 'circle',
    source: SOURCE_ID,
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': [
        'match',
        ['get', 'restaurant_type'],
        'fast_food', '#ea580c',
        'full_service', '#f97316',
        'retail_store', '#fb923c',
        '#f97316', // default orange
      ],
      'circle-radius': 8,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#fff',
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

  // Click on individual restaurant
  map.on('click', UNCLUSTERED_LAYER_ID, (e: any) => {
    const features = map.queryRenderedFeatures(e.point, { layers: [UNCLUSTERED_LAYER_ID] });
    if (!features.length) return;
    const props = features[0].properties;
    const coords = features[0].geometry.coordinates.slice();

    // Build popup HTML
    const ratingStars = props.rating ? `⭐ ${Number(props.rating).toFixed(1)}` : '';
    const typeLabel = getTypeLabel(props.restaurant_type);

    const popup = new (window as any).mapboxgl.Popup({ offset: 15, maxWidth: '220px' })
      .setLngLat(coords)
      .setHTML(`
        <div style="font-family: system-ui, sans-serif; padding: 4px;">
          <div style="font-weight: 600; font-size: 14px; margin-bottom: 2px;">${props.name}</div>
          <div style="font-size: 12px; color: #666; margin-bottom: 2px;">${props.cuisine_type}</div>
          <div style="display: flex; gap: 8px; font-size: 12px;">
            ${ratingStars ? `<span>${ratingStars}</span>` : ''}
            <span style="color: #f97316; font-weight: 500;">${typeLabel}</span>
          </div>
        </div>
      `)
      .addTo(map);

    if (options?.onClick) {
      options.onClick(props.id);
    }
  });

  // Cursor pointer on hover
  map.on('mouseenter', UNCLUSTERED_LAYER_ID, () => {
    map.getCanvas().style.cursor = 'pointer';
  });
  map.on('mouseleave', UNCLUSTERED_LAYER_ID, () => {
    map.getCanvas().style.cursor = '';
  });
  map.on('mouseenter', CLUSTER_LAYER_ID, () => {
    map.getCanvas().style.cursor = 'pointer';
  });
  map.on('mouseleave', CLUSTER_LAYER_ID, () => {
    map.getCanvas().style.cursor = '';
  });

  return () => removeRestaurantLayer(map);
}

function removeRestaurantLayer(map: any) {
  try {
    if (map.getLayer(CLUSTER_COUNT_LAYER_ID)) map.removeLayer(CLUSTER_COUNT_LAYER_ID);
    if (map.getLayer(CLUSTER_LAYER_ID)) map.removeLayer(CLUSTER_LAYER_ID);
    if (map.getLayer(UNCLUSTERED_LAYER_ID)) map.removeLayer(UNCLUSTERED_LAYER_ID);
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
