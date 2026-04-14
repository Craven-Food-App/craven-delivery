import React, { useEffect, useRef, useState } from 'react';
import { MAPBOX_CONFIG, ZONE_STYLES } from '@/config/mapbox';
import { AlertTriangle } from 'lucide-react';

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
  const map = useRef<any>(null);
  const [webglError, setWebglError] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || webglError) return;

    const initMap = async () => {
      try {
        const mapboxgl = (await import('mapbox-gl')).default;

        let mapInstance: any;
        try {
          mapInstance = new mapboxgl.Map({
            container: mapContainer.current!,
            accessToken: MAPBOX_CONFIG.accessToken,
            style: MAPBOX_CONFIG.style,
            center: MAPBOX_CONFIG.center as [number, number],
            zoom: MAPBOX_CONFIG.zoom,
            failIfMajorPerformanceCaveat: false,
          });
        } catch (e) {
          console.warn('Mapbox initialization failed:', e);
          setWebglError(true);
          return;
        }

        map.current = mapInstance;

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

          map.current.on('click', 'zones-active', (e: any) => {
            if (onZoneClick && e.features?.[0]) {
              const feature = e.features[0];
              const zone = zones.find(z => z.id === feature.properties.id);
              if (zone) onZoneClick(zone);
            }
          });

          map.current.on('mouseenter', 'zones-active', () => {
            if (map.current) map.current.getCanvas().style.cursor = 'pointer';
          });

          map.current.on('mouseleave', 'zones-active', () => {
            if (map.current) map.current.getCanvas().style.cursor = '';
          });
        });
      } catch (err) {
        console.warn('Map module loading failed:', err);
        setWebglError(true);
      }
    };

    initMap();

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [zones, onZoneClick, webglError]);

  if (webglError) {
    return (
      <div className="w-full h-96 rounded-lg border flex flex-col items-center justify-center bg-muted/30">
        <AlertTriangle className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm font-medium text-muted-foreground">Map Unavailable</p>
        <p className="text-xs text-muted-foreground">WebGL is not supported in this environment.</p>
      </div>
    );
  }

  return (
    <div 
      ref={mapContainer} 
      className="w-full h-96 rounded-lg border"
    />
  );
};

export default ZoneVisualizationMap;
