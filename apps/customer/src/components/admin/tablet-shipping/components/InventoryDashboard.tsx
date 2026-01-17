import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Tablet,
  Package,
  AlertTriangle,
  CheckCircle,
  Search,
  Plus,
  Edit,
  Trash2,
  MapPin
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface InventoryDashboardProps {
  inventory: any[];
  onRefresh: () => void;
}

export function InventoryDashboard({ inventory, onRefresh }: InventoryDashboardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newDevice, setNewDevice] = useState({
    serial_number: '',
    model: 'Standard Tablet',
    condition: 'new',
    warehouse_location: 'Main Warehouse',
  });

  // Calculate stats
  const totalDevices = inventory.length;
  const availableDevices = inventory.filter(d => d.status === 'available').length;
  const shippedDevices = inventory.filter(d => d.status === 'shipped').length;
  const inRepair = inventory.filter(d => d.status === 'repair').length;

  const handleAddDevice = async () => {
    if (!newDevice.serial_number.trim()) {
      toast.error('Please enter a serial number');
      return;
    }

    try {
      const { error } = await supabase
        .from('tablet_inventory')
        .insert({
          serial_number: newDevice.serial_number,
          model: newDevice.model,
          condition: newDevice.condition,
          warehouse_location: newDevice.warehouse_location,
          status: 'available',
          created_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast.success('Device added to inventory');
      setShowAddDialog(false);
      setNewDevice({
        serial_number: '',
        model: 'Standard Tablet',
        condition: 'new',
        warehouse_location: 'Main Warehouse',
      });
      onRefresh();
    } catch (error) {
      console.error('Error adding device:', error);
      toast.error('Failed to add device');
    }
  };

  const filteredInventory = inventory.filter(device =>
    device.serial_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    device.model?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Devices</p>
                <p className="text-3xl font-bold">{totalDevices}</p>
              </div>
              <Tablet className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Available</p>
                <p className="text-3xl font-bold text-green-600">{availableDevices}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            {availableDevices < 10 && (
              <Badge variant="destructive" className="mt-2">Low Stock!</Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Shipped</p>
                <p className="text-3xl font-bold text-blue-600">{shippedDevices}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Repair</p>
                <p className="text-3xl font-bold text-orange-600">{inRepair}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by serial number or model..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Device
        </Button>
      </div>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle>Device Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Serial Number</th>
                  <th className="text-left py-3 px-4 font-medium">Model</th>
                  <th className="text-left py-3 px-4 font-medium">Status</th>
                  <th className="text-left py-3 px-4 font-medium">Condition</th>
                  <th className="text-left py-3 px-4 font-medium">Location</th>
                  <th className="text-left py-3 px-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12">
                      <Package className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-3" />
                      <p className="text-muted-foreground">No devices found</p>
                    </td>
                  </tr>
                ) : (
                  filteredInventory.map((device) => (
                    <tr key={device.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-mono text-sm">{device.serial_number}</td>
                      <td className="py-3 px-4">{device.model}</td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={device.status === 'available' ? 'default' : 'secondary'}
                          className={
                            device.status === 'available' ? 'bg-green-600' :
                            device.status === 'shipped' ? 'bg-blue-600' :
                            device.status === 'repair' ? 'bg-orange-600' :
                            'bg-gray-600'
                          }
                        >
                          {device.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline">{device.condition}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <span className="flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3" />
                          {device.warehouse_location}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add Device Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Device to Inventory</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="serial">Serial Number *</Label>
              <Input
                id="serial"
                value={newDevice.serial_number}
                onChange={(e) => setNewDevice({ ...newDevice, serial_number: e.target.value })}
                placeholder="TB-2024-001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                value={newDevice.model}
                onChange={(e) => setNewDevice({ ...newDevice, model: e.target.value })}
                placeholder="Standard Tablet"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="condition">Condition</Label>
              <select
                id="condition"
                value={newDevice.condition}
                onChange={(e) => setNewDevice({ ...newDevice, condition: e.target.value })}
                className="w-full p-2 border rounded-md"
              >
                <option value="new">New</option>
                <option value="refurbished">Refurbished</option>
                <option value="used">Used</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="warehouse">Warehouse Location</Label>
              <Input
                id="warehouse"
                value={newDevice.warehouse_location}
                onChange={(e) => setNewDevice({ ...newDevice, warehouse_location: e.target.value })}
                placeholder="Main Warehouse"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddDevice}>
              <Plus className="h-4 w-4 mr-2" />
              Add Device
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

