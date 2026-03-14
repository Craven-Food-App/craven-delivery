import { Feature, FeatureCollection, Polygon } from 'geojson';

export type DeliveryZone = {
  id: number | string;
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

/** Minimal shape of a delivery_zones row from Supabase (geom can be GeoJSON or WKT string). */
export interface DbDeliveryZoneRow {
  id: string;
  name: string | null;
  city: string;
  state: string;
  zip_code: string;
  active: boolean;
  geom?: unknown;
}

const parseWktPolygon = (value: string): Polygon | null => {
  const trimmed = value.trim();
  const cleaned = trimmed.startsWith('SRID=')
    ? trimmed.slice(trimmed.indexOf(';') + 1).trim()
    : trimmed;
  if (!cleaned.toUpperCase().startsWith('POLYGON')) return null;

  const startIndex = cleaned.indexOf('((');
  const endIndex = cleaned.lastIndexOf('))');
  if (startIndex === -1 || endIndex === -1) return null;

  const body = cleaned.slice(startIndex + 2, endIndex);
  const rings = body.split('),(').map((ring) => {
    const points = ring.split(',').map((segment) => {
      const [x, y] = segment
        .trim()
        .split(/\s+/)
        .map((part) => Number.parseFloat(part));
      return [x, y] as [number, number];
    });
    if (points.length && (points[0][0] !== points[points.length - 1][0] || points[0][1] !== points[points.length - 1][1])) {
      points.push([...points[0]] as [number, number]);
    }
    return points;
  });

  return {
    type: 'Polygon',
    coordinates: rings,
  };
};

function ensurePolygon(geom: unknown): Polygon | null {
  if (!geom) return null;
  const geo = geom as Record<string, unknown>;
  if (geo?.type === 'Polygon') {
    return geo as unknown as Polygon;
  }
  if (geo?.type === 'MultiPolygon' && Array.isArray(geo.coordinates)) {
    const firstPolygon = geo.coordinates[0];
    if (firstPolygon) {
      return {
        type: 'Polygon',
        coordinates: firstPolygon as Polygon['coordinates'],
      };
    }
  }
  if (typeof geo === 'string') {
    try {
      const parsed = JSON.parse(geo) as Record<string, unknown>;
      if (parsed?.type === 'Polygon') {
        return parsed as unknown as Polygon;
      }
      if (parsed?.type === 'MultiPolygon' && Array.isArray(parsed.coordinates)) {
        const firstPolygon = parsed.coordinates[0];
        if (firstPolygon) {
          return {
            type: 'Polygon',
            coordinates: firstPolygon as Polygon['coordinates'],
          };
        }
      }
    } catch {
      const wktPolygon = parseWktPolygon(geo);
      if (wktPolygon) return wktPolygon;
    }
    const wktPolygon = parseWktPolygon(geo);
    if (wktPolygon) return wktPolygon;
  }
  return null;
}

/** Convert GeoJSON Polygon exterior ring to [lat, lng][] (our DeliveryZone format). GeoJSON uses [lng, lat]. */
function polygonToCoordinates(polygon: Polygon): [number, number][] {
  const ring = polygon.coordinates?.[0];
  if (!ring || ring.length === 0) return [];
  return ring.map(([lng, lat]) => [lat, lng] as [number, number]);
}

/**
 * Convert a delivery_zones row from the database into a DeliveryZone for map/zone logic.
 * Returns null if geom cannot be parsed.
 */
export function dbZoneToDeliveryZone(row: DbDeliveryZoneRow, demand = 0.5): DeliveryZone | null {
  const polygon = ensurePolygon(row.geom);
  if (!polygon) return null;
  const coordinates = polygonToCoordinates(polygon);
  if (coordinates.length === 0) return null;
  return {
    id: row.id,
    name: row.name ?? `${row.city}, ${row.state}`,
    demand,
    coordinates,
  };
}

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

export function getZoneForLocation(point: [number, number], zones: DeliveryZone[] = []): DeliveryZone | null {
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
