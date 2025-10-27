export const MAPBOX_CONFIG = {
  accessToken: import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1IjoiY3JhdmUtbiIsImEiOiJjbWVxb21qbTQyNTRnMm1vaHg5bDZwcmw2In0.aOsYrL2B0cjfcCGW1jHAdw',
  // Use public basemap as fallback if no Mapbox token
  style: import.meta.env.VITE_MAPBOX_ACCESS_TOKEN 
    ? 'mapbox://styles/mapbox/streets-v12'
    : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
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
