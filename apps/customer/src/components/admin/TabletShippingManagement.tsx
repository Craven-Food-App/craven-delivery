import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Package, 
  Truck, 
  CheckCircle,
  AlertCircle,
  MapPin,
  Phone,
  Mail,
  Building2,
  Printer,
  Download
} from 'lucide-react';
import { format } from 'date-fns';
import { generateShippingLabel } from '@/utils/generateShippingLabel';

interface RestaurantWithProgress {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  owner_id: string;
  progress: {
    business_info_verified: boolean;
    menu_preparation_status: string;
    tablet_preparing_shipment: boolean;
    tablet_shipped: boolean;
    tablet_tracking_number: string | null;
    tablet_shipping_carrier: string | null;
    tablet_preparing_at: string | null;
    tablet_shipped_at: string | null;
    tablet_shipping_label_url: string | null;
  };
}

export const TabletShippingManagement = () => {
  const [restaurants, setRestaurants] = useState<RestaurantWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantWithProgress | null>(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [shippingCarrier, setShippingCarrier] = useState('USPS');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingLabel, setIsGeneratingLabel] = useState(false);
  const [generatedLabelUrl, setGeneratedLabelUrl] = useState<string | null>(null);
  const [showTrackingInput, setShowTrackingInput] = useState(false);

  useEffect(() => {
    fetchRestaurants();
    
    // Real-time subscription
    const channel = supabase
      .channel('tablet-shipping-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'restaurant_onboarding_progress'
        },
        () => {
          fetchRestaurants();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchRestaurants = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select(`
          id,
          name,
          email,
          phone,
          address,
          city,
          state,
          zip_code,
          owner_id,
          restaurant_onboarding_progress (
            business_info_verified,
            menu_preparation_status,
            tablet_preparing_shipment,
            tablet_shipped,
            tablet_tracking_number,
            tablet_shipping_carrier,
            tablet_preparing_at,
            tablet_shipped_at,
            tablet_shipping_label_url
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted = data?.map(r => ({
        ...r,
        progress: Array.isArray(r.restaurant_onboarding_progress) 
          ? r.restaurant_onboarding_progress[0] 
          : r.restaurant_onboarding_progress
      })) as RestaurantWithProgress[];

      setRestaurants(formatted || []);
    } catch (error: any) {
      toast.error('Failed to load restaurants');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrepareShipment = async (restaurant: RestaurantWithProgress) => {
    // Open dialog and set restaurant first
    setSelectedRestaurant(restaurant);
    setIsGeneratingLabel(true);
    
    try {
      // Auto-generate the label
      const { pdfUrl, labelUrl } = await generateShippingLabel({
        id: restaurant.id,
        name: restaurant.name,
        address: restaurant.address,
        city: restaurant.city || '',
        state: restaurant.state || '',
        zip_code: restaurant.zip_code || '',
        phone: restaurant.phone || undefined,
      });

      // Update progress with label URL
      const { error } = await supabase
        .from('restaurant_onboarding_progress')
        .update({
          tablet_preparing_shipment: true,
          tablet_preparing_at: new Date().toISOString(),
          tablet_shipping_label_url: pdfUrl,
        })
        .eq('restaurant_id', restaurant.id);

      if (error) throw error;

      setGeneratedLabelUrl(labelUrl);
      toast.success('Shipping label generated! Ready to print.');
      fetchRestaurants();
    } catch (error: any) {
      toast.error(`Failed to generate label: ${error.message}`);
      console.error(error);
      setSelectedRestaurant(null); // Close dialog on error
    } finally {
      setIsGeneratingLabel(false);
    }
  };

  const handlePrintLabel = () => {
    if (generatedLabelUrl) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Print Shipping Label</title>
              <style>
                body { margin: 0; padding: 0; }
                img { width: 100%; height: auto; }
                @media print {
                  body { margin: 0; }
                  img { width: 100%; height: auto; }
                }
              </style>
            </head>
            <body>
              <img src="${generatedLabelUrl}" />
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 250);
      }
    }
  };

  const handleDownloadLabel = () => {
    if (selectedRestaurant?.progress?.tablet_shipping_label_url) {
      window.open(selectedRestaurant.progress.tablet_shipping_label_url, '_blank');
    }
  };

  const handleMarkShipped = async () => {
    if (!selectedRestaurant || !trackingNumber.trim()) {
      toast.error('Please enter a tracking number');
      return;
    }

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('restaurant_onboarding_progress')
        .update({
          tablet_shipped: true,
          tablet_shipped_at: new Date().toISOString(),
          tablet_tracking_number: trackingNumber,
          tablet_shipping_carrier: shippingCarrier
        })
        .eq('restaurant_id', selectedRestaurant.id);

      if (error) throw error;

      toast.success('Tablet marked as shipped');
      setSelectedRestaurant(null);
      setTrackingNumber('');
      setShippingCarrier('USPS');
      setGeneratedLabelUrl(null);
      setShowTrackingInput(false);
      fetchRestaurants();
    } catch (error: any) {
      toast.error('Failed to mark as shipped');
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const readyForShipment = restaurants.filter(r => 
    r.progress?.business_info_verified && 
    r.progress?.menu_preparation_status === 'ready' &&
    !r.progress?.tablet_preparing_shipment &&
    !r.progress?.tablet_shipped
  );

  const preparingShipment = restaurants.filter(r => 
    r.progress?.tablet_preparing_shipment && 
    !r.progress?.tablet_shipped
  );

  const shipped = restaurants.filter(r => r.progress?.tablet_shipped);

  const RestaurantCard = ({ restaurant, showAction }: { restaurant: RestaurantWithProgress; showAction: 'ready' | 'preparing' | 'shipped' }) => (
    <Card key={restaurant.id} className="relative">
      {showAction === 'ready' && (
        <div className="absolute -top-1 -right-1">
          <span className="relative flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-yellow-500"></span>
          </span>
        </div>
      )}
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CardTitle className="text-lg">{restaurant.name}</CardTitle>
              {showAction === 'shipped' && (
                <Badge className="bg-green-500">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Shipped
                </Badge>
              )}
              {showAction === 'preparing' && (
                <Badge className="bg-yellow-500">
                  <Package className="w-3 h-3 mr-1" />
                  Preparing
                </Badge>
              )}
              {showAction === 'ready' && (
                <Badge className="bg-blue-500">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Ready
                </Badge>
              )}
            </div>
            <CardDescription className="space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4" />
                {restaurant.address}, {restaurant.city}, {restaurant.state} {restaurant.zip_code}
              </div>
              {restaurant.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4" />
                  {restaurant.email}
                </div>
              )}
              {restaurant.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4" />
                  {restaurant.phone}
                </div>
              )}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {showAction === 'ready' && (
          <Button
            onClick={() => handlePrepareShipment(restaurant)}
            disabled={isGeneratingLabel || isProcessing}
            className="w-full"
          >
            <Package className="w-4 h-4 mr-2" />
            Prepare Shipment
          </Button>
        )}
        {showAction === 'preparing' && (
          <div className="space-y-2">
            {restaurant.progress?.tablet_shipping_label_url && (
              <Button
                onClick={() => window.open(restaurant.progress.tablet_shipping_label_url!, '_blank')}
                variant="outline"
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                View Label
              </Button>
            )}
            <Button
              onClick={() => {
                setSelectedRestaurant(restaurant);
                setGeneratedLabelUrl(null); // Don't show preview, just tracking
                setShowTrackingInput(true);
                setTrackingNumber(restaurant.progress?.tablet_tracking_number || '');
                setShippingCarrier(restaurant.progress?.tablet_shipping_carrier || 'USPS');
              }}
              disabled={isProcessing}
              className="w-full"
            >
              <Truck className="w-4 h-4 mr-2" />
              Enter Tracking & Ship
            </Button>
          </div>
        )}
        {showAction === 'shipped' && restaurant.progress?.tablet_tracking_number && (
          <div className="bg-muted p-3 rounded-lg space-y-2">
            <p className="text-sm font-semibold">Tracking Information</p>
            <p className="text-sm">
              <span className="text-muted-foreground">Carrier:</span> {restaurant.progress.tablet_shipping_carrier || 'USPS'}
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">Tracking #:</span> {restaurant.progress.tablet_tracking_number}
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">Shipped:</span> {format(new Date(restaurant.progress.tablet_shipped_at!), 'PPP')}
            </p>
            {restaurant.progress?.tablet_shipping_label_url && (
              <Button
                onClick={() => window.open(restaurant.progress.tablet_shipping_label_url!, '_blank')}
                variant="outline"
                size="sm"
                className="w-full mt-2"
              >
                <Download className="w-3 h-3 mr-2" />
                View Label
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading restaurants...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Tablet Shipping Management</h2>
        <p className="text-muted-foreground">
          Manage tablet shipments for merchant onboarding
        </p>
      </div>

      {/* Ready for Shipment */}
      <div>
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-blue-500" />
          Ready for Shipment ({readyForShipment.length})
        </h3>
        {readyForShipment.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No merchants ready for tablet shipment</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {readyForShipment.map(restaurant => (
              <RestaurantCard key={restaurant.id} restaurant={restaurant} showAction="ready" />
            ))}
          </div>
        )}
      </div>

      {/* Preparing Shipment */}
      <div>
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Package className="w-5 h-5 text-yellow-500" />
          Preparing Shipment ({preparingShipment.length})
        </h3>
        {preparingShipment.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No tablets currently being prepared</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {preparingShipment.map(restaurant => (
              <RestaurantCard key={restaurant.id} restaurant={restaurant} showAction="preparing" />
            ))}
          </div>
        )}
      </div>

      {/* Shipped */}
      <div>
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Truck className="w-5 h-5 text-green-500" />
          Shipped ({shipped.length})
        </h3>
        {shipped.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Truck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No tablets have been shipped yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {shipped.map(restaurant => (
              <RestaurantCard key={restaurant.id} restaurant={restaurant} showAction="shipped" />
            ))}
          </div>
        )}
      </div>

      {/* Shipping Label Dialog */}
      <Dialog 
        open={!!selectedRestaurant} 
        onOpenChange={(open) => {
          if (!open) {
            setSelectedRestaurant(null);
            setGeneratedLabelUrl(null);
            setShowTrackingInput(false);
            setTrackingNumber('');
            setShippingCarrier('USPS');
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Prepare Shipment - {selectedRestaurant?.name}</DialogTitle>
            <DialogDescription>
              {isGeneratingLabel 
                ? 'Generating shipping label...' 
                : generatedLabelUrl && !showTrackingInput
                ? 'Print the label and prepare package for shipment'
                : 'Enter tracking information after shipping'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Generating State */}
            {isGeneratingLabel && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <p className="text-muted-foreground">Generating shipping label...</p>
              </div>
            )}

            {/* Restaurant Address */}
            {!isGeneratingLabel && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex items-start gap-2">
                  <MapPin className="w-5 h-5 text-muted-foreground mt-1" />
                  <div>
                    <p className="font-semibold">{selectedRestaurant?.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedRestaurant?.address}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedRestaurant?.city}, {selectedRestaurant?.state} {selectedRestaurant?.zip_code}
                    </p>
                  </div>
                </div>
                {selectedRestaurant?.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span>{selectedRestaurant.phone}</span>
                  </div>
                )}
              </div>
            )}

            {/* Step 1: Print Label */}
            {!isGeneratingLabel && generatedLabelUrl && !showTrackingInput && (
              <div className="space-y-4">
                <div className="border rounded-lg p-4 bg-white">
                  <img 
                    src={generatedLabelUrl} 
                    alt="Shipping Label" 
                    className="w-full h-auto"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={handlePrintLabel} size="lg" className="flex-1">
                    <Printer className="w-4 h-4 mr-2" />
                    Print Label
                  </Button>
                  {selectedRestaurant?.progress?.tablet_shipping_label_url && (
                    <Button onClick={handleDownloadLabel} variant="outline" size="lg" className="flex-1">
                      <Download className="w-4 h-4 mr-2" />
                      Download PDF
                    </Button>
                  )}
                </div>

                <Button 
                  onClick={() => setShowTrackingInput(true)}
                  variant="default"
                  size="lg"
                  className="w-full"
                >
                  <Truck className="w-4 h-4 mr-2" />
                  I've Shipped the Package
                </Button>
              </div>
            )}

            {/* Step 2: Enter Tracking */}
            {!isGeneratingLabel && showTrackingInput && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <div className="flex items-start gap-3">
                  <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 mt-1">
                    2
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">Enter Carrier Tracking Information</h4>
                    <p className="text-sm text-muted-foreground">
                      Enter the official tracking details from your shipping carrier
                    </p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="carrier">Shipping Carrier</Label>
                  <Select value={shippingCarrier} onValueChange={setShippingCarrier}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USPS">USPS</SelectItem>
                      <SelectItem value="UPS">UPS</SelectItem>
                      <SelectItem value="FedEx">FedEx</SelectItem>
                      <SelectItem value="DHL">DHL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="tracking">Tracking Number</Label>
                  <Input
                    id="tracking"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="Enter tracking number from carrier"
                  />
                </div>

                <Button 
                  onClick={handleMarkShipped} 
                  disabled={isProcessing || !trackingNumber.trim()}
                  size="lg"
                  className="w-full"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {isProcessing ? 'Marking as Shipped...' : 'Mark as Shipped'}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
