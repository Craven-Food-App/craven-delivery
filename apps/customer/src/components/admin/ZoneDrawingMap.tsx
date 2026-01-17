import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import { MAPBOX_CONFIG, ZONE_STYLES } from "@/config/mapbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Search, MapPin, Save, X } from "lucide-react";

interface ZoneDrawingMapProps {
  mode: "create" | "edit";
  onSave: (zone: { id?: string; name: string; city: string; state: string; zip_code: string; geojson: any }) => void;
  onCancel: () => void;
  initialZone?: any;
  isSaving?: boolean;
}

const ZoneDrawingMap: React.FC<ZoneDrawingMapProps> = ({ onSave, onCancel, initialZone, mode, isSaving }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const draw = useRef<MapboxDraw | null>(null);
  const [hasPolygon, setHasPolygon] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [zoneData, setZoneData] = useState({
    name: initialZone?.name || "",
    city: initialZone?.city || "",
    state: initialZone?.state || "",
    zip_code: initialZone?.zip_code || "",
  });
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Set access token explicitly (ensures all plugins use it)
    mapboxgl.accessToken = MAPBOX_CONFIG.accessToken;

    // Initialize map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      accessToken: MAPBOX_CONFIG.accessToken,
      style: MAPBOX_CONFIG.style,
      center: MAPBOX_CONFIG.center as [number, number],
      zoom: MAPBOX_CONFIG.zoom,
    });

    // Initialize draw
    draw.current = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true,
      },
      defaultMode: "draw_polygon",
      styles: [
        {
          id: "gl-draw-polygon-fill-inactive",
          type: "fill",
          filter: ["all", ["==", "active", "false"], ["==", "$type", "Polygon"]],
          paint: {
            "fill-color": ZONE_STYLES.drawing.fill,
            "fill-opacity": ZONE_STYLES.drawing.fillOpacity,
          },
        },
        {
          id: "gl-draw-polygon-stroke-inactive",
          type: "line",
          filter: ["all", ["==", "active", "false"], ["==", "$type", "Polygon"]],
          paint: {
            "line-color": ZONE_STYLES.drawing.stroke,
            "line-width": ZONE_STYLES.drawing.strokeWidth,
            "line-dasharray": ZONE_STYLES.drawing.strokeDasharray,
          },
        },
      ],
    });

    map.current.addControl(draw.current);

    // Ensure draw mode is active and limit map interactions while drawing
    map.current.on("load", () => {
      draw.current?.changeMode("draw_polygon");
      map.current?.dragPan.disable();
      map.current?.doubleClickZoom.disable();
      // boxZoom may not exist on some versions
      // @ts-ignore
      map.current?.boxZoom?.disable?.();
      setMapReady(true);
    });

    // Toggle interactions based on draw mode
    map.current.on("draw.modechange", (e: any) => {
      const mode = e?.mode;
      if (mode && (mode === "draw_polygon" || mode.startsWith("draw_"))) {
        map.current?.dragPan.disable();
        map.current?.doubleClickZoom.disable();
      } else {
        map.current?.dragPan.enable();
        map.current?.doubleClickZoom.enable();
      }
    });

    // Handle drawing events
    map.current.on("draw.create", () => {
      setHasPolygon(true);
    });

    map.current.on("draw.update", () => {
      setHasPolygon(true);
    });

    map.current.on("draw.delete", () => {
      setHasPolygon(false);
    });

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    setZoneData({
      name: initialZone?.name || "",
      city: initialZone?.city || "",
      state: initialZone?.state || "",
      zip_code: initialZone?.zip_code || "",
    });
  }, [initialZone?.id]);

  useEffect(() => {
    if (!mapReady || !draw.current) return;

    // Reset any existing drawings
    draw.current.deleteAll();
    setHasPolygon(false);

    if (initialZone?.geom) {
      const feature = {
        id: initialZone.id || "editing-zone",
        type: "Feature",
        properties: {},
        geometry: initialZone.geom,
      };

      try {
        draw.current.add(feature as any);
        setHasPolygon(true);

        // Fit map to feature bounds
        const coordinates = (initialZone.geom?.coordinates?.[0] || []) as [number, number][];
        if (coordinates.length > 0 && map.current) {
          const bounds = coordinates.reduce((b, coord) => b.extend(coord as [number, number]), new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));
          map.current.fitBounds(bounds, { padding: 40 });
        }

        draw.current.changeMode("direct_select", { featureIds: [feature.id] });
      } catch (error) {
        console.error("Failed to load existing zone geometry:", error);
        toast.error("Unable to load existing zone polygon for editing.");
      }
    } else if (map.current) {
      // Reset map back to default view for new zone creation
      map.current.flyTo({
        center: MAPBOX_CONFIG.center as [number, number],
        zoom: MAPBOX_CONFIG.zoom,
      });
    }
  }, [initialZone, mapReady]);

  const searchLocation = async () => {
    if (!searchQuery || !map.current) {
      toast.error("Enter a city, ZIP, or address to search");
      return;
    }

    // Try Mapbox first
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${MAPBOX_CONFIG.accessToken}&country=US&limit=1`,
      );
      if (!response.ok) throw new Error("Mapbox geocoding failed");
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        const [lng, lat] = feature.center;

        map.current.flyTo({
          center: [lng, lat],
          zoom: 12,
        });

        // Extract location data
        const context = feature.context || [];
        const city = context.find((c: any) => c.id.startsWith("place"))?.text || "";
        const state = context.find((c: any) => c.id.startsWith("region"))?.text || "";
        const zip = context.find((c: any) => c.id.startsWith("postcode"))?.text || "";

        setZoneData((prev) => ({
          ...prev,
          city: city || prev.city,
          state: state || prev.state,
          zip_code: zip || prev.zip_code,
        }));
        return;
      }
    } catch (err) {
      // Fall back to Nominatim if Mapbox fails
    }

    // Fallback to OpenStreetMap Nominatim (no API key required)
    try {
      const nomRes = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&addressdetails=1&limit=1`,
        {
          headers: {
            "Accept-Language": "en",
          },
        },
      );
      if (!nomRes.ok) throw new Error("Nominatim request failed");
      const nomData = await nomRes.json();

      if (nomData && nomData.length > 0) {
        const r = nomData[0];
        const lat = parseFloat(r.lat);
        const lng = parseFloat(r.lon);

        map.current.flyTo({
          center: [lng, lat],
          zoom: 12,
        });

        const addr = r.address || {};
        setZoneData((prev) => ({
          ...prev,
          city: addr.city || addr.town || addr.village || prev.city,
          state: addr.state || prev.state,
          zip_code: addr.postcode || prev.zip_code,
        }));
      } else {
        toast.error("No results found for that location");
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      toast.error("Search failed. Please try again.");
    }
  };

  const saveZone = () => {
    if (!draw.current) return;

    const features = draw.current.getAll();
    if (!features || features.features.length === 0) {
      toast.error("Draw a delivery zone on the map before saving.");
      return;
    }

    const polygon = features.features[0];

    // Validate polygon
    if (polygon.geometry.type !== "Polygon") {
      toast.error("Only polygon shapes are supported for delivery zones.");
      return;
    }
    if (polygon.geometry.coordinates[0].length < 4) {
      toast.error("The polygon must have at least three points.");
      return;
    }

    onSave({
      id: initialZone?.id,
      ...zoneData,
      geojson: polygon.geometry,
    });
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex space-x-2">
        <div className="flex-1">
          <Label htmlFor="search">Search Location</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              id="search"
              placeholder="Enter ZIP code, city, or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Button onClick={searchLocation} className="mt-6">
          <MapPin className="h-4 w-4 mr-2" />
          Search
        </Button>
      </div>

      {/* Zone Details */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Zone Name</Label>
          <Input
            id="name"
            value={zoneData.name}
            onChange={(e) => setZoneData({ ...zoneData, name: e.target.value })}
            placeholder="e.g., Downtown Toledo"
          />
        </div>
        <div>
          <Label htmlFor="zip_code">ZIP Code</Label>
          <Input
            id="zip_code"
            value={zoneData.zip_code}
            onChange={(e) => setZoneData({ ...zoneData, zip_code: e.target.value })}
            placeholder="e.g., 43604"
          />
        </div>
        <div>
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={zoneData.city}
            onChange={(e) => setZoneData({ ...zoneData, city: e.target.value })}
            placeholder="e.g., Toledo"
          />
        </div>
        <div>
          <Label htmlFor="state">State</Label>
          <Input
            id="state"
            value={zoneData.state}
            onChange={(e) => setZoneData({ ...zoneData, state: e.target.value })}
            placeholder="e.g., OH"
          />
        </div>
      </div>

      {/* Map Container */}
      <div className="relative">
        <div ref={mapContainer} className="w-full h-96 rounded-lg border" />
        <div className="absolute top-4 right-4 bg-white p-2 rounded shadow pointer-events-none">
          <p className="text-sm text-gray-600">Click to draw polygon points</p>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-2">How to draw a delivery zone:</h4>
        <ol className="text-sm text-blue-800 space-y-1">
          <li>1. Search for your location or enter ZIP code</li>
          <li>2. Click on the map to start drawing polygon points</li>
          <li>3. Click each corner of your delivery area</li>
          <li>4. Double-click to finish the polygon</li>
          <li>5. Fill in zone details and save</li>
        </ol>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onCancel}>
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button
          onClick={saveZone}
          disabled={!hasPolygon || !zoneData.name || Boolean(isSaving)}
          className="bg-orange-500 hover:bg-orange-600"
        >
          <Save className="h-4 w-4 mr-2" />
          {mode === "edit" ? "Update Zone" : "Save Zone"}
        </Button>
      </div>
    </div>
  );
};

export default ZoneDrawingMap;
