import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Phone, 
  MessageSquare, 
  MapPin,
  Navigation,
  Home,
  Clock
} from 'lucide-react';
import { NavigationMapbox } from './NavigationMapbox';
import { MapNavigationHelper } from './MapNavigationHelper';
import { useNavigation } from '@/hooks/useNavigation';

interface CustomerNavigationStepProps {
  customerName?: string;
  deliveryTime: string;
  customerPhone?: string;
  dropoffAddress: string | any;
  apartmentInfo?: string;
  deliveryInstructions?: string;
  onCall: () => void;
  onMessage: () => void;
  onDirections: () => void;
}

export const CustomerNavigationStep: React.FC<CustomerNavigationStepProps> = ({
  customerName = 'Customer',
  deliveryTime,
  customerPhone,
  dropoffAddress,
  apartmentInfo,
  deliveryInstructions,
  onCall,
  onMessage,
  onDirections
}) => {
  const { navigationSettings } = useNavigation();

  const formatAddress = (addressData: string | any): { street: string; cityStateZip: string } => {
    if (typeof addressData === 'string') {
      // Try to split the address into parts
      const parts = addressData.split(',').map(part => part.trim());
      if (parts.length >= 2) {
        return {
          street: parts[0],
          cityStateZip: parts.slice(1).join(', ')
        };
      }
      return {
        street: addressData,
        cityStateZip: ''
      };
    }
    
    if (addressData?.address) {
      return formatAddress(addressData.address);
    }
    
    const street = `${addressData?.street || ''} ${addressData?.apartment || ''}`.trim();
    const cityStateZip = `${addressData?.city || ''}, ${addressData?.state || ''} ${addressData?.zip_code || ''}`.trim();
    
    return {
      street: street || 'Address not available',
      cityStateZip
    };
  };

  const addressParts = formatAddress(dropoffAddress);

  return (
    <div className="min-h-screen bg-background">
      {/* Status Bar Simulation */}
      <div className="flex justify-between items-center p-4 text-sm text-foreground">
        <div className="flex items-center gap-1">
          <span className="font-medium">12:31</span>
          <Navigation className="h-4 w-4" />
        </div>
        <div className="flex items-center gap-1">
          <div className="flex gap-1">
            <div className="w-1 h-3 bg-foreground"></div>
            <div className="w-1 h-3 bg-foreground"></div>
            <div className="w-1 h-3 bg-muted"></div>
          </div>
          <span className="ml-1">5G</span>
          <Badge variant="secondary" className="ml-2 bg-muted text-foreground">66</Badge>
        </div>
      </div>

      <div className="px-4 space-y-4">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            Deliver to {customerName}
          </h1>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>by {deliveryTime}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="lg" 
            className="flex-1 h-12 rounded-full bg-muted hover:bg-muted/80"
            onClick={onCall}
          >
            <Phone className="h-4 w-4 mr-2" />
            Call
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="flex-1 h-12 rounded-full bg-muted hover:bg-muted/80"
            onClick={onMessage}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Message
          </Button>
        </div>

        {/* Address Card */}
        <Card className="bg-muted/30 border-0">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-foreground rounded-sm flex items-center justify-center mt-1">
                <Home className="h-4 w-4 text-background" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-foreground">
                  {addressParts.street}
                </h3>
                <p className="text-muted-foreground">
                  {addressParts.cityStateZip}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Map */}
        <div className="h-64 rounded-lg overflow-hidden bg-muted">
          {navigationSettings.provider === 'mapbox' ? (
            <NavigationMapbox
              destination={{
                address: typeof dropoffAddress === 'string' ? dropoffAddress : dropoffAddress?.address || 'Address not available',
                name: customerName
              }}
            />
          ) : (
            <MapNavigationHelper 
              destination={{
                address: typeof dropoffAddress === 'string' ? dropoffAddress : dropoffAddress?.address || 'Address not available',
                name: customerName
              }}
              type="delivery"
            />
          )}
        </div>

        {/* Apartment/Suite Info */}
        {apartmentInfo && (
          <Card className="bg-muted/30 border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <h4 className="font-medium text-foreground">Apt/Suite</h4>
                  <p className="text-muted-foreground">{apartmentInfo}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Leave at Door Option */}
        <Card className="bg-muted/30 border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-8 bg-gradient-to-br from-blue-400 to-orange-400 rounded flex items-center justify-center">
                <Home className="h-4 w-4 text-white" />
              </div>
              <div>
                <h4 className="font-medium text-foreground">Leave it at the door</h4>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Instructions */}
        {deliveryInstructions && (
          <Card className="bg-muted/50 border border-muted">
            <CardContent className="p-4">
              <p className="text-sm text-foreground leading-relaxed">
                "{deliveryInstructions}"
              </p>
            </CardContent>
          </Card>
        )}

        {/* Directions Button */}
        <div className="pb-8">
          <Button
            onClick={onDirections}
            className="w-full h-14 text-lg font-medium bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg"
          >
            Directions
          </Button>
        </div>
      </div>
    </div>
  );
};