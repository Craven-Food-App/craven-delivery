// Preferred map style (matches customer app map view — light, clean)
export const MAPBOX_STYLE = 'mapbox://styles/mapbox/light-v11';

/** Orange color for highway overlay on feeder maps (motorway, trunk, primary). */
export const HIGHWAY_OVERLAY_COLOR = '#f97316';

export const MAPBOX_CONFIG = {
  accessToken: import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1IjoiY3JhdmUtbiIsImEiOiJjbWVxb21qbTQyNTRnMm1vaHg5bDZwcmw2In0.aOsYrL2B0cjfcCGW1jHAdw',
  style: MAPBOX_STYLE,
  center: [-83.5555, 41.6528], // Toledo, OH default
  zoom: 10
};

export const ZONE_STYLES = {
  active: {
    fill: '#ff6600',
    fillOpacity: 0.3,
    stroke: '#ff6600',
    strokeWidth: 2
  },
  inactive: {
    fill: '#6b7280',
    fillOpacity: 0.2,
    stroke: '#6b7280',
    strokeWidth: 1
  },
  drawing: {
    fill: '#ff6600',
    fillOpacity: 0.1,
    stroke: '#ff6600',
    strokeWidth: 2,
    strokeDasharray: [5, 5]
  }
};
