import { Feature, FeatureCollection, Polygon } from 'geojson';

export type DeliveryZone = {
  id: number;
  name: string;
  demand: number; // 0.0 (low) to 1.0 (high)
  coordinates: [number, number][]; // [latitude, longitude]
};

export type ZoneDemandLevel = 'high' | 'moderate' | 'low';

export interface ZoneStyle {
  fillColor: string;
  strokeColor: string;
  demandLabel: string;
  demandLevel: ZoneDemandLevel;
  badgeClass: string;
  textClass: string;
}

// Toledo, OH and surrounding areas (no Chicago zones)
export const DELIVERY_ZONES: DeliveryZone[] = [
  {
    id: 1,
    name: 'Downtown Toledo',
    demand: 0.7,
    coordinates: [
      [41.662, -83.555],
      [41.662, -83.528],
      [41.638, -83.528],
      [41.638, -83.555],
      [41.662, -83.555],
    ],
  },
  {
    id: 2,
    name: 'West Toledo / Sylvania',
    demand: 0.5,
    coordinates: [
      [41.673, -83.692],
      [41.673, -83.618],
      [41.708, -83.618],
      [41.708, -83.692],
      [41.673, -83.692],
    ],
  },
  {
    id: 3,
    name: 'Perrysburg / Maumee',
    demand: 0.3,
    coordinates: [
      [41.562, -83.722],
      [41.562, -83.618],
      [41.518, -83.618],
      [41.518, -83.722],
      [41.562, -83.722],
    ],
  },
];

export function getZoneStyle(demand: number): ZoneStyle {
  if (demand > 0.7) {
    return {
      fillColor: '#ef4444',
      strokeColor: '#b91c1c',
      demandLabel: 'HIGH (BUSY)',
      demandLevel: 'high',
      badgeClass: 'bg-red-500',
      textClass: 'text-red-600',
    };
  }
  if (demand > 0.3) {
    return {
      fillColor: '#f59e0b',
      strokeColor: '#d97706',
      demandLabel: 'MODERATE',
      demandLevel: 'moderate',
      badgeClass: 'bg-amber-500',
      textClass: 'text-amber-600',
    };
  }
  return {
    fillColor: '#10b981',
    strokeColor: '#059669',
    demandLabel: 'LOW (OPEN)',
    demandLevel: 'low',
    badgeClass: 'bg-emerald-500',
    textClass: 'text-emerald-600',
  };
}

export function zonesToGeoJSON(zones: DeliveryZone[]): FeatureCollection<Polygon> {
  const features: Feature<Polygon>[] = zones.map((zone) => {
    const style = getZoneStyle(zone.demand);
    const coordinates = zone.coordinates.map(([lat, lng]) => [lng, lat]);

    return {
      type: 'Feature',
      properties: {
        id: zone.id,
        name: zone.name,
        demand: zone.demand,
        ...style,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [coordinates],
      },
    } as Feature<Polygon>;
  });

  return {
    type: 'FeatureCollection',
    features,
  };
}

export function isPointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  const [lat, lng] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [latI, lngI] = polygon[i];
    const [latJ, lngJ] = polygon[j];

    const intersect = (lngI > lng) !== (lngJ > lng) &&
      lat < ((latJ - latI) * (lng - lngI)) / (lngJ - lngI) + latI;

    if (intersect) inside = !inside;
  }

  return inside;
}

export function getZoneForLocation(point: [number, number], zones: DeliveryZone[] = DELIVERY_ZONES): DeliveryZone | null {
  for (const zone of zones) {
    if (isPointInPolygon(point, zone.coordinates)) {
      return zone;
    }
  }
  return null;
}

export function randomizeZoneDemand(zones: DeliveryZone[]): DeliveryZone[] {
  return zones.map((zone) => ({
    ...zone,
    demand: Math.random(),
  }));
}
