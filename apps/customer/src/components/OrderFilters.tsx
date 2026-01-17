import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Filter, Search, MapPin, DollarSign, Clock, X } from 'lucide-react';

interface Order {
  id: string;
  pickup_name: string;
  pickup_address: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_name: string;
  dropoff_address: string;
  dropoff_lat: number;
  dropoff_lng: number;
  payout_cents: number;
  distance_km: number;
  status: 'pending' | 'assigned' | 'picked_up' | 'delivered' | 'cancelled';
  assigned_craver_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface FilterCriteria {
  searchTerm: string;
  minPayout: number;
  maxDistance: number;
  sortBy: 'payout' | 'distance' | 'time';
  sortOrder: 'asc' | 'desc';
  showHighPayoutOnly: boolean;
  restaurantType: string;
}

interface OrderFiltersProps {
  orders: Order[];
  onFilteredOrdersChange: (filteredOrders: Order[]) => void;
  userLocation?: { lat: number; lng: number };
}

const OrderFilters: React.FC<OrderFiltersProps> = ({ 
  orders, 
  onFilteredOrdersChange, 
  userLocation 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState<FilterCriteria>({
    searchTerm: '',
    minPayout: 0,
    maxDistance: 50,
    sortBy: 'payout',
    sortOrder: 'desc',
    showHighPayoutOnly: false,
    restaurantType: 'all'
  });

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const applyFilters = (newFilters: FilterCriteria) => {
    let filteredOrders = [...orders];

    // Search filter
    if (newFilters.searchTerm) {
      const searchLower = newFilters.searchTerm.toLowerCase();
      filteredOrders = filteredOrders.filter(order =>
        order.pickup_name.toLowerCase().includes(searchLower) ||
        order.pickup_address.toLowerCase().includes(searchLower) ||
        order.dropoff_name.toLowerCase().includes(searchLower) ||
        order.dropoff_address.toLowerCase().includes(searchLower)
      );
    }

    // Payout filter
    filteredOrders = filteredOrders.filter(order => 
      order.payout_cents >= newFilters.minPayout * 100
    );

    // Distance filter
    if (userLocation) {
      filteredOrders = filteredOrders.filter(order => {
        const distanceToPickup = calculateDistance(
          userLocation.lat, userLocation.lng,
          order.pickup_lat, order.pickup_lng
        );
        return distanceToPickup <= newFilters.maxDistance;
      });
    }

    // High payout filter
    if (newFilters.showHighPayoutOnly) {
      filteredOrders = filteredOrders.filter(order => order.payout_cents >= 1000); // $10+
    }

    // Restaurant type filter
    if (newFilters.restaurantType !== 'all') {
      // This would need to be enhanced with actual restaurant categorization
      // For now, we'll do a simple name-based filter
      const typeKeywords: Record<string, string[]> = {
        'fast-food': ['McDonald', 'Burger', 'KFC', 'Taco', 'Subway', 'Pizza'],
        'restaurant': ['Bistro', 'Grill', 'Kitchen', 'Cafe', 'Restaurant'],
        'coffee': ['Starbucks', 'Coffee', 'Cafe', 'Dunkin'],
        'grocery': ['Market', 'Store', 'Grocery', 'Whole Foods']
      };
      
      const keywords = typeKeywords[newFilters.restaurantType] || [];
      filteredOrders = filteredOrders.filter(order =>
        keywords.some(keyword => 
          order.pickup_name.toLowerCase().includes(keyword.toLowerCase())
        )
      );
    }

    // Sort orders
    filteredOrders.sort((a, b) => {
      let aValue: number, bValue: number;
      
      switch (newFilters.sortBy) {
        case 'payout':
          aValue = a.payout_cents;
          bValue = b.payout_cents;
          break;
        case 'distance':
          if (userLocation) {
            aValue = calculateDistance(userLocation.lat, userLocation.lng, a.pickup_lat, a.pickup_lng);
            bValue = calculateDistance(userLocation.lat, userLocation.lng, b.pickup_lat, b.pickup_lng);
          } else {
            aValue = a.distance_km;
            bValue = b.distance_km;
          }
          break;
        case 'time':
          aValue = new Date(a.created_at || a.updated_at || '').getTime();
          bValue = new Date(b.created_at || b.updated_at || '').getTime();
          break;
        default:
          return 0;
      }

      return newFilters.sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

    onFilteredOrdersChange(filteredOrders);
  };

  const updateFilter = (key: keyof FilterCriteria, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    applyFilters(newFilters);
  };

  const clearFilters = () => {
    const defaultFilters: FilterCriteria = {
      searchTerm: '',
      minPayout: 0,
      maxDistance: 50,
      sortBy: 'payout',
      sortOrder: 'desc',
      showHighPayoutOnly: false,
      restaurantType: 'all'
    };
    setFilters(defaultFilters);
    applyFilters(defaultFilters);
  };

  const activeFiltersCount = 
    (filters.searchTerm ? 1 : 0) +
    (filters.minPayout > 0 ? 1 : 0) +
    (filters.maxDistance < 50 ? 1 : 0) +
    (filters.showHighPayoutOnly ? 1 : 0) +
    (filters.restaurantType !== 'all' ? 1 : 0);

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Order Filters
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFiltersCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Less' : 'More'}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Quick Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search restaurants or addresses..."
            value={filters.searchTerm}
            onChange={(e) => updateFilter('searchTerm', e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Quick Sort */}
        <div className="flex gap-2">
          <Select 
            value={filters.sortBy} 
            onValueChange={(value) => updateFilter('sortBy', value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="payout">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  By Payout
                </div>
              </SelectItem>
              <SelectItem value="distance">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  By Distance
                </div>
              </SelectItem>
              <SelectItem value="time">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  By Time
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
          >
            {filters.sortOrder === 'asc' ? '↑' : '↓'}
          </Button>
        </div>

        {/* Expanded Filters */}
        {isExpanded && (
          <>
            <Separator />
            
            {/* Min Payout */}
            <div className="space-y-2">
              <Label className="text-sm">Minimum Payout: ${filters.minPayout}</Label>
              <Slider
                value={[filters.minPayout]}
                onValueChange={([value]) => updateFilter('minPayout', value)}
                max={20}
                step={0.5}
                className="w-full"
              />
            </div>

            {/* Max Distance */}
            <div className="space-y-2">
              <Label className="text-sm">Max Distance: {(filters.maxDistance * 0.621371).toFixed(1)} mi</Label>
              <Slider
                value={[filters.maxDistance]}
                onValueChange={([value]) => updateFilter('maxDistance', value)}
                max={50}
                step={1}
                className="w-full"
              />
            </div>

            {/* Restaurant Type */}
            <div className="space-y-2">
              <Label className="text-sm">Restaurant Type</Label>
              <Select 
                value={filters.restaurantType} 
                onValueChange={(value) => updateFilter('restaurantType', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="fast-food">Fast Food</SelectItem>
                  <SelectItem value="restaurant">Restaurants</SelectItem>
                  <SelectItem value="coffee">Coffee Shops</SelectItem>
                  <SelectItem value="grocery">Grocery</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* High Payout Only */}
            <div className="flex items-center justify-between">
              <Label htmlFor="high-payout" className="text-sm">High Payout Only ($10+)</Label>
              <Switch
                id="high-payout"
                checked={filters.showHighPayoutOnly}
                onCheckedChange={(checked) => updateFilter('showHighPayoutOnly', checked)}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default OrderFilters;