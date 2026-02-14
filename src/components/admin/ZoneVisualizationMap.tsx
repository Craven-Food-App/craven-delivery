import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
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

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      accessToken: MAPBOX_CONFIG.accessToken,
      style: MAPBOX_CONFIG.style,
      center: MAPBOX_CONFIG.center as [number, number],
      zoom: MAPBOX_CONFIG.zoom
    });

    map.current.on('load', () => {
      if (!map.current) return;

      // Add zones as GeoJSON source
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

      // Add active zones layer
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

      // Add inactive zones layer
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

      // Add zone borders
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

      // Add click handler
      map.current.on('click', 'zones-active', (e) => {
        if (onZoneClick && e.features?.[0]) {
          const feature = e.features[0];
          const zone = zones.find(z => z.id === feature.properties.id);
          if (zone) onZoneClick(zone);
        }
      });

      // Add hover effects
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

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, [zones, onZoneClick]);

  return (
    <div 
      ref={mapContainer} 
      className="w-full h-96 rounded-lg border"
    />
  );
};

export default ZoneVisualizationMap;
