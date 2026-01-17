import React, { useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import type { Feature, FeatureCollection, Polygon } from 'geojson';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import { MAPBOX_CONFIG } from '@/config/mapbox';

type ZoneGeometry = Polygon | { type: string; coordinates: any } | null;

type AdminZone = {
  id: string;
  name: string | null;
  city: string;
  state: string;
  zip_code: string;
  active: boolean;
  geom?: ZoneGeometry;
  demand: number;
};

interface AdminZoneMapProps {
  zones: AdminZone[];
  selectedZoneId: string | null;
  mode: 'create' | 'edit';
  driverLocation: [number, number];
  onZoneSelect: (zoneId: string | null) => void;
  onPolygonChange: (polygon: Polygon | null) => void;
  onDriverZoneChange?: (info: { isInside: boolean; zoneName?: string | null }) => void;
}

const AdminZoneMap: React.FC<AdminZoneMapProps> = ({
  zones,
  selectedZoneId,
  mode,
  driverLocation,
  onZoneSelect,
  onPolygonChange,
  onDriverZoneChange,
}) => {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const selectedZone = useMemo(() => zones.find((zone) => zone.id === selectedZoneId) ?? null, [zones, selectedZoneId]);

  const selectedGeometry = useMemo<Polygon | null>(() => {
    if (!selectedZone?.geom) return null;
    const geo = selectedZone.geom as any;
    if (geo?.type === 'Polygon') {
      return geo as Polygon;
    }
    if (geo?.type === 'MultiPolygon' && Array.isArray(geo.coordinates)) {
      const firstPolygon = geo.coordinates[0];
      if (firstPolygon) {
        return {
          type: 'Polygon',
          coordinates: firstPolygon,
        };
      }
    }
    if (typeof geo === 'string') {
      try {
        const parsed = JSON.parse(geo);
        if (parsed?.type === 'Polygon') return parsed as Polygon;
      } catch (error) {
        console.error('Failed to parse zone geometry', error);
      }
    }
    return null;
  }, [selectedZone?.geom]);

  useEffect(() => {
    if (!mapRef.current) {
      mapboxgl.accessToken = MAPBOX_CONFIG.accessToken;
      mapRef.current = new mapboxgl.Map({
        container: 'admin-zone-map',
        style: MAPBOX_CONFIG.style,
        center: MAPBOX_CONFIG.center as [number, number],
        zoom: MAPBOX_CONFIG.zoom,
      });

      mapRef.current.on('load', () => {
        if (!mapRef.current) return;

        drawRef.current = new MapboxDraw({
          displayControlsDefault: false,
          controls: {
            polygon: true,
            trash: true,
          },
          defaultMode: mode === 'create' ? 'draw_polygon' : 'simple_select',
        });

        mapRef.current.addControl(drawRef.current, 'top-right');

        mapRef.current.addSource('admin-delivery-zones', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });

        mapRef.current.addLayer({
          id: 'admin-zones-fill',
          type: 'fill',
          source: 'admin-delivery-zones',
          paint: {
            'fill-color': [
              'case',
              ['==', ['get', 'id'], selectedZoneId ?? ''], '#f97316',
              ['>', ['get', 'demand'], 0.7], '#ef4444',
              ['>', ['get', 'demand'], 0.3], '#f59e0b',
              '#10b981',
            ],
            'fill-opacity': 0.45,
          },
        });

        mapRef.current.addLayer({
          id: 'admin-zones-outline',
          type: 'line',
          source: 'admin-delivery-zones',
          paint: {
            'line-color': [
              'case',
              ['==', ['get', 'id'], selectedZoneId ?? ''], '#ea580c',
              ['==', ['get', 'active'], true], '#2563eb',
              '#6b7280',
            ],
            'line-width': 2,
          },
        });

        mapRef.current.on('click', 'admin-zones-fill', (event: any) => {
          const feature = event.features?.[0];
          const zoneId = feature?.properties?.id as string | undefined;
          if (zoneId) {
            onZoneSelect(zoneId);
          }
        });

        mapRef.current.on('mouseenter', 'admin-zones-fill', () => {
          if (mapRef.current) {
            mapRef.current.getCanvas().style.cursor = 'pointer';
          }
        });

        mapRef.current.on('mouseleave', 'admin-zones-fill', () => {
          if (mapRef.current) {
            mapRef.current.getCanvas().style.cursor = '';
          }
        });

        const handleDrawUpdate = () => {
          if (!drawRef.current) return;
          const all = drawRef.current.getAll();
          const polygonFeature = all.features?.[0];
          if (polygonFeature?.geometry?.type === 'Polygon') {
            onPolygonChange(polygonFeature.geometry as Polygon);
          }
        };

        mapRef.current.on('draw.create', handleDrawUpdate);
        mapRef.current.on('draw.update', handleDrawUpdate);
        mapRef.current.on('draw.delete', () => onPolygonChange(null));

        setMapReady(true);
      });
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      drawRef.current = null;
      setMapReady(false);
    };
  }, [mode, onPolygonChange, onZoneSelect, selectedZoneId]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const source = mapRef.current.getSource('admin-delivery-zones') as mapboxgl.GeoJSONSource | undefined;
    if (!source) return;

    const geojson: FeatureCollection = {
      type: 'FeatureCollection',
      features: zones
        .map((zone) => {
          let geometry: any = zone.geom;
          if (!geometry) return null;
          if (typeof geometry === 'string') {
            try {
              geometry = JSON.parse(geometry);
            } catch (error) {
              console.error('Invalid geometry JSON', error);
              return null;
            }
          }
          if (geometry?.type === 'MultiPolygon' && Array.isArray(geometry.coordinates)) {
            geometry = {
              type: 'Polygon',
              coordinates: geometry.coordinates[0],
            };
          }
          if (geometry?.type !== 'Polygon') return null;

          return {
            type: 'Feature',
            properties: {
              id: zone.id,
              name: zone.name,
              city: zone.city,
              state: zone.state,
              zip_code: zone.zip_code,
              demand: zone.demand,
              active: zone.active,
            },
            geometry,
          } as Feature;
        })
        .filter(Boolean) as Feature[],
    };

    source.setData(geojson as any);

    try {
      const bounds = new mapboxgl.LngLatBounds();
      let hasBounds = false;
      geojson.features.forEach((feature) => {
        const coordinates = (feature.geometry as Polygon).coordinates[0];
        coordinates.forEach(([lng, lat]) => {
          bounds.extend([lng, lat]);
          hasBounds = true;
        });
      });
      if (hasBounds && mapRef.current) {
        mapRef.current.fitBounds(bounds, { padding: 40, maxZoom: 14 });
      }
    } catch (error) {
      // Ignore fit bounds errors
    }
  }, [zones, mapReady]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const filter = selectedZoneId ? ['==', ['get', 'id'], selectedZoneId] : ['==', ['get', 'id'], ''];
    if (mapRef.current.getLayer('admin-zones-fill')) {
      mapRef.current.setPaintProperty('admin-zones-fill', 'fill-color', [
        'case',
        ['==', ['get', 'id'], selectedZoneId ?? ''], '#f97316',
        ['>', ['get', 'demand'], 0.7], '#ef4444',
        ['>', ['get', 'demand'], 0.3], '#f59e0b',
        '#10b981',
      ]);
    }
    if (mapRef.current.getLayer('admin-zones-outline')) {
      mapRef.current.setPaintProperty('admin-zones-outline', 'line-color', [
        'case',
        ['==', ['get', 'id'], selectedZoneId ?? ''], '#ea580c',
        ['==', ['get', 'active'], true], '#2563eb',
        '#6b7280',
      ]);
    }
  }, [selectedZoneId, mapReady]);

  useEffect(() => {
    if (
      !mapReady ||
      !drawRef.current ||
      typeof drawRef.current.deleteAll !== 'function' ||
      typeof drawRef.current.changeMode !== 'function'
    ) {
      return;
    }
    if (mode === 'create') {
      drawRef.current.deleteAll();
      drawRef.current.changeMode('draw_polygon');
      onPolygonChange(null);
    } else if (mode === 'edit' && selectedGeometry) {
      drawRef.current.deleteAll();
      const feature: Feature = {
        id: selectedZoneId ?? 'selected-zone',
        type: 'Feature',
        properties: {},
        geometry: selectedGeometry,
      } satisfies Feature;
      try {
        drawRef.current.add(feature as any);
        drawRef.current.changeMode('direct_select', { featureIds: [feature.id as string] });
        onPolygonChange(selectedGeometry);
      } catch (error) {
        console.error('Failed to load zone geometry into draw control', error);
      }
    }
  }, [mode, selectedGeometry, selectedZoneId, mapReady, onPolygonChange]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !selectedGeometry) return;
    try {
      const bounds = new mapboxgl.LngLatBounds();
      let hasBounds = false;
      selectedGeometry.coordinates[0]?.forEach(([lng, lat]) => {
        bounds.extend([lng, lat]);
        hasBounds = true;
      });
      if (hasBounds) {
        mapRef.current.fitBounds(bounds, { padding: 40, maxZoom: 14 });
      }
    } catch (error) {
      console.warn('Failed to adjust map bounds for selected zone', error);
    }
  }, [selectedGeometry, mapReady]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    if (!markerRef.current) {
      markerRef.current = new mapboxgl.Marker({
        color: '#f97316',
      })
        .setLngLat([driverLocation[1], driverLocation[0]])
        .addTo(mapRef.current);
    } else {
      markerRef.current.setLngLat([driverLocation[1], driverLocation[0]]);
    }

    if (mapRef.current) {
      mapRef.current.easeTo({ center: [driverLocation[1], driverLocation[0]], duration: 500, zoom: Math.max(mapRef.current.getZoom(), 13) });
    }

    if (onDriverZoneChange) {
      const point = [driverLocation[1], driverLocation[0]] as [number, number];
      let isInside = false;
      let zoneName: string | null = null;

      zones.forEach((zone) => {
        const geometry = zone.geom as Polygon;
        if (!geometry?.coordinates) return;
        if (isPointInsidePolygon(point, geometry.coordinates[0] as [number, number][])) {
          isInside = true;
          zoneName = zone.name;
        }
      });

      onDriverZoneChange({ isInside, zoneName });
    }
  }, [driverLocation, mapReady, onDriverZoneChange, zones]);

  return <div id="admin-zone-map" className="w-full h-[520px] rounded-2xl border border-gray-200 shadow-sm overflow-hidden" />;
};

function isPointInsidePolygon(point: [number, number], polygon: [number, number][]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];

    const intersect = yi > point[1] !== yj > point[1] && point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export default AdminZoneMap;
