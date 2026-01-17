import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Truck,
  Package,
  CheckCircle,
  Clock,
  MapPin,
  ExternalLink,
  AlertCircle
} from 'lucide-react';

interface ActiveShipmentsProps {
  shipments: any[];
  onRefresh: () => void;
}

export function ActiveShipments({ shipments, onRefresh }: ActiveShipmentsProps) {
  const activeShipments = shipments.filter(s => s.status === 'in_transit');
  const deliveredShipments = shipments.filter(s => s.status === 'delivered');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in_transit':
        return (
          <Badge className="bg-blue-600">
            <Truck className="h-3 w-3 mr-1" />
            In Transit
          </Badge>
        );
      case 'delivered':
        return (
          <Badge className="bg-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            Delivered
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getCarrierTrackingUrl = (carrier: string, tracking: string) => {
    const carriers: any = {
      'USPS': `https://tools.usps.com/go/TrackConfirmAction?tLabels=${tracking}`,
      'UPS': `https://www.ups.com/track?tracknum=${tracking}`,
      'FedEx': `https://www.fedex.com/fedextrack/?trknbr=${tracking}`,
    };
    return carriers[carrier] || '#';
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Transit</p>
                <p className="text-3xl font-bold text-blue-600">{activeShipments.length}</p>
              </div>
              <Truck className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Delivered</p>
                <p className="text-3xl font-bold text-green-600">{deliveredShipments.length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Shipments</p>
                <p className="text-3xl font-bold">{shipments.length}</p>
              </div>
              <Package className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Shipments List */}
      <Card>
        <CardHeader>
          <CardTitle>In Transit Shipments</CardTitle>
        </CardHeader>
        <CardContent>
          {activeShipments.length === 0 ? (
            <div className="text-center py-12">
              <Truck className="h-16 w-16 mx-auto text-muted-foreground opacity-50 mb-4" />
              <p className="text-muted-foreground">No active shipments</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeShipments.map((shipment) => (
                <div
                  key={shipment.id}
                  className="p-4 rounded-lg border hover:border-primary transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold mb-1">{shipment.restaurant?.name || 'Unknown'}</h4>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {shipment.restaurant?.city}, {shipment.restaurant?.state}
                      </p>
                    </div>
                    {getStatusBadge(shipment.status)}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-2 bg-gray-50 rounded border">
                      <p className="text-xs text-muted-foreground">Tracking #</p>
                      <p className="font-mono text-sm">{shipment.tracking_number || 'N/A'}</p>
                    </div>
                    <div className="p-2 bg-gray-50 rounded border">
                      <p className="text-xs text-muted-foreground">Carrier</p>
                      <p className="text-sm font-medium">{shipment.carrier || 'N/A'}</p>
                    </div>
                    <div className="p-2 bg-gray-50 rounded border">
                      <p className="text-xs text-muted-foreground">Shipped</p>
                      <p className="text-sm">
                        {shipment.shipped_at ? new Date(shipment.shipped_at).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>

                  {shipment.tracking_number && shipment.carrier && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => window.open(getCarrierTrackingUrl(shipment.carrier, shipment.tracking_number), '_blank')}
                    >
                      <ExternalLink className="h-3 w-3 mr-2" />
                      Track Shipment
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

