import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import AdminZoneMap from './AdminZoneMap';
import {
  RefreshCw,
  CircleDashed,
  MapPin,
  PencilLine,
  Plus,
  RotateCw,
  Trash2,
} from 'lucide-react';
import type { Polygon } from 'geojson';
import { MAPBOX_CONFIG } from '@/config/mapbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DeliveryZone {
  id: string;
  name: string | null;
  city: string;
  state: string;
  zip_code: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  geom?: any;
}

type ZoneWithMeta = DeliveryZone & { demand: number };

type Mode = 'create' | 'edit';

const fallbackDriverLocation: [number, number] = [MAPBOX_CONFIG.center[1], MAPBOX_CONFIG.center[0]];

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
  const rings = body.split('),(');
  const coordinates = rings.map((ring) => {
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
    coordinates,
  };
};

const ensurePolygon = (geom: DeliveryZone['geom']): Polygon | null => {
  if (!geom) return null;
  const geo = geom as any;
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
      if (parsed?.type === 'Polygon') {
        return parsed as Polygon;
      }
      if (parsed?.type === 'MultiPolygon' && Array.isArray(parsed.coordinates)) {
        const firstPolygon = parsed.coordinates[0];
        if (firstPolygon) {
          return {
            type: 'Polygon',
            coordinates: firstPolygon,
          };
        }
      }
    } catch (error) {
      const wktPolygon = parseWktPolygon(geo);
      if (wktPolygon) return wktPolygon;
      console.warn('Unable to parse stored zone geometry', error);
    }
    const wktPolygon = parseWktPolygon(geo);
    if (wktPolygon) return wktPolygon;
  }
  return null;
};

const getPolygonCentroid = (polygon: Polygon): [number, number] | null => {
  const ring = polygon.coordinates?.[0];
  if (!ring || ring.length === 0) return null;

  let area = 0;
  let centroidX = 0;
  let centroidY = 0;

  for (let i = 0; i < ring.length - 1; i += 1) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    const cross = x1 * y2 - x2 * y1;
    area += cross;
    centroidX += (x1 + x2) * cross;
    centroidY += (y1 + y2) * cross;
  }

  area *= 0.5;
  if (area === 0) {
    const [lng, lat] = ring[0];
    return [lat, lng];
  }

  centroidX /= 6 * area;
  centroidY /= 6 * area;
  return [centroidY, centroidX];
};

const DeliveryZoneManager: React.FC = () => {
  const [zones, setZones] = useState<ZoneWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('create');
  const [form, setForm] = useState({ name: '', city: '', state: '', zip_code: '' });
  const [currentPolygon, setCurrentPolygon] = useState<Polygon | null>(null);
  const [driverLocations, setDriverLocations] = useState<[number, number][]>([fallbackDriverLocation]);
  const [driverIndex, setDriverIndex] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Map loaded. Move the driver to check their current zone.');
  const [isSaving, setIsSaving] = useState(false);

  const loadZones = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('delivery_zones')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const withMeta = (data || []).map((zone) => {
        const polygon = ensurePolygon(zone.geom);
        return {
          ...zone,
          geom: polygon ?? zone.geom ?? null,
          demand: Math.random(),
        };
      });
      setZones(withMeta);
    } catch (error) {
      console.error('Error loading zones:', error);
      toast.error('Failed to load delivery zones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadZones();
  }, []);

  const selectedZone = useMemo(() => zones.find((zone) => zone.id === selectedZoneId) ?? null, [zones, selectedZoneId]);

  useEffect(() => {
    if (!zones.length) {
      setDriverLocations([fallbackDriverLocation]);
      setDriverIndex(0);
      return;
    }

    const centroids = zones
      .map((zone) => {
        const polygon = ensurePolygon(zone.geom);
        if (!polygon) return null;
        const centroid = getPolygonCentroid(polygon);
        return centroid;
      })
      .filter(Boolean) as [number, number][];

    if (centroids.length) {
      setDriverLocations(centroids);
      setDriverIndex(0);
    } else {
      setDriverLocations([fallbackDriverLocation]);
      setDriverIndex(0);
    }
  }, [zones]);

  useEffect(() => {
    if (selectedZone) {
      setForm({
        name: selectedZone.name ?? '',
        city: selectedZone.city ?? '',
        state: selectedZone.state ?? '',
        zip_code: selectedZone.zip_code ?? '',
      });
      setMode('edit');
    } else {
      setForm({ name: '', city: '', state: '', zip_code: '' });
      setMode('create');
    }
  }, [selectedZone]);

  const handleDriverZoneChange = ({ isInside, zoneName }: { isInside: boolean; zoneName?: string | null }) => {
    if (isInside && zoneName) {
      setStatusMessage(`✅ Driver is currently in the ${zoneName} zone.`);
    } else {
      setStatusMessage('⚠️ Driver is outside all delivery zones.');
    }
  };

  const handlePolygonChange = (polygon: Polygon | null) => {
    setCurrentPolygon(polygon);
  };

  const createZone = async (zoneData: {
    name: string;
    city: string;
    state: string;
    zip_code: string;
    geojson: Polygon;
  }) => {
    try {
      setIsSaving(true);
      const { data, error } = await supabase.functions.invoke('create-delivery-zone', {
        body: zoneData,
      });

      if (error || data?.error) {
        throw new Error(error?.message || data?.error || 'Failed to create zone');
      }

      toast.success('Delivery zone created successfully');
      await loadZones();
      setSelectedZoneId(null);
    } catch (error) {
      console.error('Error creating zone:', error);
      toast.error('Failed to create delivery zone');
    } finally {
      setIsSaving(false);
    }
  };

  const updateZone = async (zoneId: string, zoneData: {
    name: string;
    city: string;
    state: string;
    zip_code: string;
    geojson: Polygon | null;
  }) => {
    try {
      setIsSaving(true);
      const payload = {
        id: zoneId,
        name: zoneData.name,
        city: zoneData.city,
        state: zoneData.state,
        zip_code: zoneData.zip_code,
        geojson: zoneData.geojson,
      };

      const { data, error } = await supabase.functions.invoke('update-delivery-zone', {
        body: payload,
      });

      if (error || data?.error) {
        throw new Error(error?.message || data?.error || 'Failed to update zone');
      }

      toast.success('Delivery zone updated successfully');
      await loadZones();
      setSelectedZoneId(null);
    } catch (error) {
      console.error('Error updating zone:', error);
      toast.error('Failed to update delivery zone');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleZoneStatus = async (zoneId: string, currentStatus: boolean) => {
    try {
      const { data, error } = await supabase.functions.invoke('update-delivery-zone', {
        body: {
          id: zoneId,
          active: !currentStatus,
        },
      });

      if (error || data?.error) {
        throw new Error(error?.message || data?.error || 'Failed to update status');
      }

      toast.success(`Zone ${!currentStatus ? 'activated' : 'deactivated'}`);
      await loadZones();
    } catch (error) {
      console.error('Error updating zone:', error);
      toast.error('Failed to update zone status');
    }
  };

  const deleteZone = async (zoneId: string) => {
    if (!confirm('Are you sure you want to delete this delivery zone?')) return;
    try {
      const { data, error } = await supabase.functions.invoke('delete-delivery-zone', {
        body: { id: zoneId },
      });

      if (error || data?.error) {
        throw new Error(error?.message || data?.error || 'Failed to delete zone');
      }

      toast.success('Delivery zone deleted');
      await loadZones();
      setSelectedZoneId(null);
    } catch (error) {
      console.error('Error deleting zone:', error);
      toast.error('Failed to delete delivery zone');
    }
  };

  const handleSave = async () => {
    const trimmed = {
      name: form.name.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      zip_code: form.zip_code.trim(),
    };

    if (!trimmed.name || !trimmed.city || !trimmed.state || !trimmed.zip_code) {
      toast.error('Please fill out all zone details');
      return;
    }

    const geojson = currentPolygon ?? ensurePolygon(selectedZone?.geom) ?? null;
    if (!geojson) {
      toast.error('Draw a delivery zone on the map before saving');
      return;
    }

    if (mode === 'edit' && selectedZoneId) {
      await updateZone(selectedZoneId, { ...trimmed, geojson });
    } else {
      await createZone({ ...trimmed, geojson });
    }
    setStatusMessage('Zone saved successfully.');
  };

  const handleNewZone = () => {
    setSelectedZoneId(null);
    setMode('create');
    setForm({ name: '', city: '', state: '', zip_code: '' });
    setCurrentPolygon(null);
    setStatusMessage('Ready to create a new delivery zone. Draw the area on the map.');
  };

  const handleRandomizeDemand = () => {
    setZones((prev) => prev.map((zone) => ({ ...zone, demand: Math.random() })));
    setStatusMessage('Zone demand levels updated.');
  };

  const handleMoveDriver = () => {
    setDriverIndex((prev) => {
      if (driverLocations.length <= 1) return prev;
      return (prev + 1) % driverLocations.length;
    });
    setStatusMessage('Driver location updated.');
  };

  const filteredZones = zones.filter((zone) => {
    const term = searchTerm.toLowerCase();
    return (
      (zone.name ?? '').toLowerCase().includes(term) ||
      (zone.city ?? '').toLowerCase().includes(term) ||
      (zone.state ?? '').toLowerCase().includes(term) ||
      (zone.zip_code ?? '').toLowerCase().includes(term)
    );
  });

  const driverLocation = driverLocations[driverIndex] ?? fallbackDriverLocation;

  return (
    <div className="space-y-3">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Delivery Zone Management</h2>
          <p className="text-xs text-gray-500 mt-0.5">Visualize, create, and manage delivery coverage areas</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleNewZone} size="sm" className="h-7 px-2.5 text-xs bg-orange-500 hover:bg-orange-600">
            <Plus className="h-3 w-3 mr-1.5" />
            New Zone
          </Button>
          {selectedZone && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-xs border-red-200 text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => deleteZone(selectedZone.id)}
            >
              <Trash2 className="h-3 w-3 mr-1.5" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Map - Compact */}
      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="p-0">
          <div className="h-[400px]">
            <AdminZoneMap
              zones={zones}
              selectedZoneId={selectedZoneId}
              mode={mode}
              driverLocation={driverLocation}
              onZoneSelect={(zoneId) => setSelectedZoneId(zoneId)}
              onPolygonChange={handlePolygonChange}
              onDriverZoneChange={handleDriverZoneChange}
            />
          </div>
        </CardContent>
      </Card>

      {/* Two Column Layout - Compact */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        {/* Zone Controls - Left */}
        <div className="xl:col-span-2 space-y-3">
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader className="px-3 py-2 border-b border-gray-200 bg-[#fafbfc]">
              <CardTitle className="text-sm font-semibold">Zone Controls</CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-3">
              <div className="flex gap-2">
                <Button
                  onClick={handleRandomizeDemand}
                  size="sm"
                  className="flex-1 h-7 px-2 text-xs bg-orange-500 hover:bg-orange-600"
                >
                  <RotateCw className="h-3 w-3 mr-1.5" />
                  Update Demand
                </Button>
                <Button
                  onClick={handleMoveDriver}
                  size="sm"
                  className="flex-1 h-7 px-2 text-xs bg-orange-500 hover:bg-orange-600"
                >
                  <CircleDashed className="h-3 w-3 mr-1.5" />
                  Move Driver
                </Button>
              </div>
              <div className="p-2.5 rounded-md bg-gray-50 border border-gray-200 text-xs font-medium text-center text-gray-700">
                {statusMessage}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-gray-700 uppercase tracking-wide">Zone Name</label>
                  <Input
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="e.g., Downtown Core"
                    className="mt-1 h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-700 uppercase tracking-wide">City</label>
                  <Input
                    value={form.city}
                    onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
                    placeholder="City"
                    className="mt-1 h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-700 uppercase tracking-wide">State</label>
                  <Input
                    value={form.state}
                    onChange={(event) => setForm((prev) => ({ ...prev, state: event.target.value }))}
                    placeholder="State"
                    className="mt-1 h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-700 uppercase tracking-wide">ZIP Code</label>
                  <Input
                    value={form.zip_code}
                    onChange={(event) => setForm((prev) => ({ ...prev, zip_code: event.target.value }))}
                    placeholder="ZIP"
                    className="mt-1 h-8 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-gray-200 pt-2">
                <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
                  <PencilLine className="h-3 w-3" />
                  {mode === 'edit' && selectedZone ? (
                    <span>Editing zone created {new Date(selectedZone.created_at).toLocaleDateString()}</span>
                  ) : (
                    <span>Draw a polygon on the map to create a new zone.</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {selectedZone && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <Switch
                        checked={selectedZone.active}
                        onCheckedChange={() => toggleZoneStatus(selectedZone.id, selectedZone.active)}
                      />
                      <span className="text-[10px] text-gray-600">{selectedZone.active ? 'Active' : 'Inactive'}</span>
                    </div>
                  )}
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    size="sm"
                    className="h-7 px-2.5 text-xs bg-orange-500 hover:bg-orange-600"
                  >
                    <MapPin className="h-3 w-3 mr-1.5" />
                    {mode === 'edit' ? 'Update' : 'Save'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Zone List - Right */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="px-3 py-2 border-b border-gray-200 bg-[#fafbfc]">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Zone Details</CardTitle>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">{filteredZones.length} zones</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-3 space-y-2">
            <div className="relative">
              <MapPin className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 h-3 w-3" />
              <Input
                className="pl-8 h-7 text-xs"
                placeholder="Search by name, city, or ZIP"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
            <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
              {loading ? (
                <div className="flex items-center justify-center py-8 text-gray-500 text-xs gap-2">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Loading zones...
                </div>
              ) : filteredZones.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-xs">
                  No zones match your search.
                </div>
              ) : (
                filteredZones.map((zone) => (
                  <button
                    key={zone.id}
                    onClick={() => setSelectedZoneId(zone.id)}
                    className={`w-full text-left px-3 py-2 rounded-md border transition text-xs ${
                      selectedZoneId === zone.id 
                        ? 'border-orange-500 bg-orange-50' 
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">{zone.name || 'Untitled Zone'}</h3>
                      <Badge 
                        variant={zone.active ? 'default' : 'secondary'}
                        className="text-[10px] px-1.5 py-0.5 flex-shrink-0"
                      >
                        {zone.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-gray-500 mb-1">{zone.city}, {zone.state} · {zone.zip_code}</p>
                    <div className="flex items-center justify-between text-[10px] text-gray-400">
                      <span>{new Date(zone.created_at).toLocaleDateString()}</span>
                      <span>Demand: {(zone.demand * 100).toFixed(0)}%</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DeliveryZoneManager;
