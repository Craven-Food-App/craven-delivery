import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { AlertTriangle } from 'lucide-react';
import { MAPBOX_CONFIG, ZONE_STYLES } from '@/config/mapbox';

interface Zone {
  id: string;
  name: string;
  city: string;
  state: string;
  zip_code: string;
  active: boolean;
  geom: any;
}

interface ZoneVisualizationMapProps {
  zones: Zone[];
  onZoneClick?: (zone: Zone) => void;
}

const ZoneVisualizationMap: React.FC<ZoneVisualizationMapProps> = ({
  zones,
  onZoneClick
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [webglError, setWebglError] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || webglError) return;

    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setWebglError(true);
        return;
      }

      let mapInstance: mapboxgl.Map;
      try {
        mapInstance = new mapboxgl.Map({
          container: mapContainer.current,
          accessToken: MAPBOX_CONFIG.accessToken,
          style: MAPBOX_CONFIG.style,
          center: MAPBOX_CONFIG.center as [number, number],
          zoom: MAPBOX_CONFIG.zoom,
          failIfMajorPerformanceCaveat: false,
        });
      } catch (error) {
        console.warn('Failed to initialize zone visualization map', error);
        setWebglError(true);
        return;
      }

      map.current = mapInstance;

      map.current.on('error', (event: any) => {
        const message = event?.error?.message ?? event?.error?.toString?.() ?? '';
        if (typeof message === 'string' && message.includes('Failed to initialize WebGL')) {
          console.warn('Zone visualization map WebGL error', event.error);
          setWebglError(true);
        }
      });

      map.current.on('load', () => {
        if (!map.current) return;

        const zonesGeoJSON: GeoJSON.FeatureCollection = {
          type: 'FeatureCollection',
          features: zones.map(zone => ({
            type: 'Feature',
            properties: {
              id: zone.id,
              name: zone.name,
              city: zone.city,
              state: zone.state,
              zip_code: zone.zip_code,
              active: zone.active
            },
            geometry: zone.geom
          }))
        };

        map.current.addSource('zones', {
          type: 'geojson',
          data: zonesGeoJSON as any
        });

        map.current.addLayer({
          id: 'zones-active',
          type: 'fill',
          source: 'zones',
          filter: ['==', ['get', 'active'], true],
          paint: {
            'fill-color': ZONE_STYLES.active.fill,
            'fill-opacity': ZONE_STYLES.active.fillOpacity
          }
        });

        map.current.addLayer({
          id: 'zones-inactive',
          type: 'fill',
          source: 'zones',
          filter: ['==', ['get', 'active'], false],
          paint: {
            'fill-color': ZONE_STYLES.inactive.fill,
            'fill-opacity': ZONE_STYLES.inactive.fillOpacity
          }
        });

        map.current.addLayer({
          id: 'zones-borders',
          type: 'line',
          source: 'zones',
          paint: {
            'line-color': [
              'case',
              ['==', ['get', 'active'], true],
              ZONE_STYLES.active.stroke,
              ZONE_STYLES.inactive.stroke
            ],
            'line-width': [
              'case',
              ['==', ['get', 'active'], true],
              ZONE_STYLES.active.strokeWidth,
              ZONE_STYLES.inactive.strokeWidth
            ]
          }
        });

        map.current.on('click', 'zones-active', (e) => {
          if (onZoneClick && e.features?.[0]) {
            const feature = e.features[0];
            const zone = zones.find(z => z.id === feature.properties.id);
            if (zone) onZoneClick(zone);
          }
        });

        map.current.on('mouseenter', 'zones-active', () => {
          if (map.current) {
            map.current.getCanvas().style.cursor = 'pointer';
          }
        });

        map.current.on('mouseleave', 'zones-active', () => {
          if (map.current) {
            map.current.getCanvas().style.cursor = '';
          }
        });
      });
    } catch (error) {
      console.warn('Failed to initialize zone visualization map', error);
      setWebglError(true);
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [zones, onZoneClick, webglError]);

  if (webglError) {
    return (
      <div className="flex h-96 w-full flex-col items-center justify-center rounded-lg border border-border bg-muted/30">
        <AlertTriangle className="mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">Map Unavailable</p>
        <p className="text-xs text-muted-foreground">WebGL is not supported in this environment.</p>
      </div>
    );
  }

  return (
    <div
      ref={mapContainer}
      className="h-96 w-full rounded-lg border border-border"
    />
  );
};

export default ZoneVisualizationMap;
