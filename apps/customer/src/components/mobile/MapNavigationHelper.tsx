import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Navigation, ExternalLink, Map as MapIcon, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigation } from '@/hooks/useNavigation';

interface NavigationDestination {
  address: string;
  latitude?: number;
  longitude?: number;
  name?: string;
}

interface MapNavigationHelperProps {
  destination: NavigationDestination;
  type: 'pickup' | 'delivery';
  onNavigate?: () => void;
}

export const MapNavigationHelper: React.FC<MapNavigationHelperProps> = ({
  destination,
  type,
  onNavigate
}) => {
  const { navigationSettings } = useNavigation();
  const preferredMapApp = navigationSettings.provider;
  
  const openInMaps = (app?: 'google' | 'apple' | 'waze') => {
    // Use preferred app if no specific app is requested
    const mapApp = app || preferredMapApp;
    const address = encodeURIComponent(destination.address);
    const coords = destination.latitude && destination.longitude 
      ? `${destination.latitude},${destination.longitude}`
      : null;
    
    let url = '';
    let appName = '';
    
    switch (mapApp) {
      case 'google':
        appName = 'Google Maps';
        if (coords) {
          url = `https://www.google.com/maps/dir/?api=1&destination=${coords}&destination_place_id=${address}`;
        } else {
          url = `https://www.google.com/maps/search/?api=1&query=${address}`;
        }
        break;
        
      case 'apple':
        appName = 'Apple Maps';
        if (coords) {
          url = `http://maps.apple.com/?daddr=${coords}`;
        } else {
          url = `http://maps.apple.com/?daddr=${address}`;
        }
        break;
        
      case 'waze':
        appName = 'Waze';
        if (coords) {
          url = `https://waze.com/ul?ll=${coords}&navigate=yes`;
        } else {
          url = `https://waze.com/ul?q=${address}&navigate=yes`;
        }
        break;
        
      default:
        // Fallback to Google Maps
        appName = 'Google Maps';
        url = `https://www.google.com/maps/dir/?api=1&destination=${address}`;
        break;
    }
    
    if (url) {
      try {
        // Use location.href for mobile to trigger deep links
        if (window.navigator.userAgent.includes('Mobile')) {
          window.location.href = url;
        } else {
          window.open(url, '_blank');
        }
        toast.success(`Opening ${appName} for navigation`);
        onNavigate?.();
      } catch (error) {
        console.error('Error opening navigation:', error);
        toast.error('Failed to open navigation app');
      }
    }
  };

  const callLocation = () => {
    // In a real app, you'd have the phone number from the order
    const phoneNumber = type === 'pickup' ? 'restaurant' : 'customer';
    alert(`Call ${phoneNumber} - Feature coming soon!`);
  };

  const getMapAppName = () => {
    const names: { [key: string]: string } = {
      'google': 'Google Maps',
      'apple': 'Apple Maps',
      'waze': 'Waze',
      'mapbox': "Crave'N Navigation"
    };
    return names[preferredMapApp] || 'Maps';
  };

  return (
    <Card className="bg-blue-50 border-blue-200">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <MapIcon className="h-5 w-5 text-blue-600 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-800">
                Navigate to {type === 'pickup' ? 'Restaurant' : 'Customer'}
              </h3>
              <p className="text-sm text-blue-700">{destination.address}</p>
              {destination.name && (
                <p className="text-sm font-medium text-blue-800">{destination.name}</p>
              )}
            </div>
          </div>

          {/* Primary Navigation Button - Uses preferred map */}
          <Button 
            onClick={() => openInMaps()}
            className="flex items-center gap-2 h-14 text-base w-full bg-orange-600 hover:bg-orange-700 text-white shadow-lg"
          >
            <Navigation className="h-5 w-5" />
            Open {getMapAppName()}
          </Button>

          {/* Alternative Navigation Options */}
          <div className="grid grid-cols-2 gap-2">
            {preferredMapApp !== 'google' && (
              <Button 
                onClick={() => openInMaps('google')}
                variant="outline"
                className="flex items-center gap-2 h-10 text-sm"
              >
                <Navigation className="h-4 w-4" />
                Google Maps
              </Button>
            )}

            {preferredMapApp !== 'apple' && /iPad|iPhone|iPod/.test(navigator.userAgent) && (
              <Button 
                onClick={() => openInMaps('apple')}
                variant="outline"
                className="flex items-center gap-2 h-10 text-sm"
              >
                <MapIcon className="h-4 w-4" />
                Apple Maps
              </Button>
            )}

            {preferredMapApp !== 'waze' && (
              <Button 
                onClick={() => openInMaps('waze')}
                variant="outline"
                className="flex items-center gap-2 h-10 text-sm"
              >
                <Navigation className="h-4 w-4" />
                Waze
              </Button>
            )}

            {/* Call Button */}
            <Button 
              onClick={callLocation}
              variant="outline"
              className="flex items-center gap-2 h-12 text-sm border-green-300 text-green-700 hover:bg-green-100"
            >
              <Phone className="h-4 w-4" />
              Call {type === 'pickup' ? 'Restaurant' : 'Customer'}
            </Button>
          </div>

          {/* Quick Tips */}
          <div className="text-xs text-blue-600 bg-blue-100 p-2 rounded-lg">
            💡 <strong>Tip:</strong> {type === 'pickup' 
              ? 'Call ahead if the restaurant is busy or you can\'t find parking.' 
              : 'Text the customer if you can\'t find their address or they\'re not available.'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};