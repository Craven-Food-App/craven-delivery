// @ts-nocheck
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Utensils,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  MessageSquare,
  Search,
  Filter,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { RestaurantOnboardingData } from '../../restaurant-onboarding/types';
import { getOnboardingStage } from '../../restaurant-onboarding/utils/helpers';
import { format } from 'date-fns';

interface MenuPreparationManagerProps {
  restaurants: RestaurantOnboardingData[];
  onUpdate?: () => void;
}

type MenuStatus = 'not_started' | 'in_progress' | 'ready';

interface MenuItemStats {
  restaurantId: string;
  itemCount: number;
  categoryCount: number;
  hasModifiers: boolean;
  lastUpdated: string | null;
}

export function MenuPreparationManager({
  restaurants,
  onUpdate,
}: MenuPreparationManagerProps) {
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantOnboardingData | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [statusNotes, setStatusNotes] = useState('');
  const [newStatus, setNewStatus] = useState<MenuStatus>('not_started');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<MenuStatus | 'all'>('all');
  const [menuStats, setMenuStats] = useState<Record<string, MenuItemStats>>({});
  const [loading, setLoading] = useState(false);

  // Filter restaurants
  const filteredRestaurants = useMemo(() => {
    return restaurants.filter(r => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matches =
          r.restaurant.name.toLowerCase().includes(query) ||
          r.restaurant.email?.toLowerCase().includes(query) ||
          r.restaurant.city?.toLowerCase().includes(query);
        if (!matches) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && r.menu_preparation_status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [restaurants, searchQuery, statusFilter]);

  // Group restaurants by status
  const groupedByStatus = useMemo(() => {
    const groups: Record<MenuStatus, RestaurantOnboardingData[]> = {
      not_started: [],
      in_progress: [],
      ready: [],
    };

    filteredRestaurants.forEach(r => {
      groups[r.menu_preparation_status].push(r);
    });

    return groups;
  }, [filteredRestaurants]);

  // Fetch menu stats for a restaurant
  const fetchMenuStats = async (restaurantId: string) => {
    try {
      const { data: categories, error: catError } = await supabase
        .from('menu_categories')
        .select('id, updated_at')
        .eq('restaurant_id', restaurantId);

      if (catError) throw catError;

      const { data: items, error: itemsError } = await supabase
        .from('menu_items')
        .select('id, updated_at')
        .eq('restaurant_id', restaurantId);

      if (itemsError) throw itemsError;

      const { data: modifiers, error: modError } = await supabase
        .from('menu_item_modifiers')
        .select('id')
        .eq('restaurant_id', restaurantId)
        .limit(1) as { data: Array<{ id: string }> | null; error: any };

      if (modError) throw modError;

      const latestUpdate = [
        ...(categories?.map(c => c.updated_at) || []),
        ...(items?.map(i => i.updated_at) || []),
      ]
        .filter(Boolean)
        .sort()
        .reverse()[0] || null;

      setMenuStats(prev => ({
        ...prev,
        [restaurantId]: {
          restaurantId,
          itemCount: items?.length || 0,
          categoryCount: categories?.length || 0,
          hasModifiers: (modifiers?.length || 0) > 0,
          lastUpdated: latestUpdate,
        },
      }));
    } catch (error) {
      console.error('Error fetching menu stats:', error);
    }
  };

  // Handle status update
  const handleUpdateStatus = async () => {
    if (!selectedRestaurant) return;

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { error: funcError } = await supabase.functions.invoke('update-menu-preparation-status', {
        body: {
          restaurant_id: selectedRestaurant.restaurant_id,
          status: newStatus,
          notes: statusNotes,
        },
      });

      if (funcError) throw funcError;

      toast.success('Menu preparation status updated successfully');
      setIsDialogOpen(false);
      setStatusNotes('');
      onUpdate?.();
    } catch (error) {
      console.error('Error updating menu status:', error);
      toast.error('Failed to update menu preparation status');
    } finally {
      setLoading(false);
    }
  };

  // Open dialog for status update
  const handleOpenDialog = (restaurant: RestaurantOnboardingData, status: MenuStatus) => {
    setSelectedRestaurant(restaurant);
    setNewStatus(status);
    setStatusNotes('');
    setIsDialogOpen(true);
    
    // Fetch menu stats if not already loaded
    if (!menuStats[restaurant.restaurant_id]) {
      fetchMenuStats(restaurant.restaurant_id);
    }
  };

  const getStatusColor = (status: MenuStatus) => {
    switch (status) {
      case 'ready':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'not_started':
        return 'bg-red-100 text-red-700 border-red-300';
    }
  };

  const getStatusIcon = (status: MenuStatus) => {
    switch (status) {
      case 'ready':
        return <CheckCircle className="h-4 w-4" />;
      case 'in_progress':
        return <Clock className="h-4 w-4" />;
      case 'not_started':
        return <XCircle className="h-4 w-4" />;
    }
  };

  const statusCounts = useMemo(() => {
    return {
      not_started: groupedByStatus.not_started.length,
      in_progress: groupedByStatus.in_progress.length,
      ready: groupedByStatus.ready.length,
    };
  }, [groupedByStatus]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent">
            Menu Preparation Management
          </h2>
          <p className="text-muted-foreground mt-1">
            Track and manage restaurant menu preparation progress
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Not Started
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{statusCounts.not_started}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Restaurants that haven't started menu setup
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{statusCounts.in_progress}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Currently setting up their menus
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ready
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{statusCounts.ready}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Menus are complete and verified
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search restaurants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as MenuStatus | 'all')}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="not_started">Not Started</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="ready">Ready</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Restaurant Cards by Status */}
      {(['not_started', 'in_progress', 'ready'] as MenuStatus[]).map((status) => {
        const restaurantsInStatus = groupedByStatus[status];
        if (restaurantsInStatus.length === 0 && statusFilter !== status) return null;

        return (
          <Card key={status}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {getStatusIcon(status)}
                  <span className="capitalize">{status.replace('_', ' ')}</span>
                  <Badge variant="outline">{restaurantsInStatus.length}</Badge>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {restaurantsInStatus.map((restaurant) => {
                  const stats = menuStats[restaurant.restaurant_id];
                  return (
                    <Card key={restaurant.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-lg truncate">
                              {restaurant.restaurant.name}
                            </h3>
                            {restaurant.restaurant.city && (
                              <p className="text-sm text-muted-foreground">
                                {restaurant.restaurant.city}, {restaurant.restaurant.state}
                              </p>
                            )}
                          </div>
                          <Badge
                            variant="outline"
                            className={`${getStatusColor(status)} border`}
                          >
                            {status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {stats && (
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Menu Items:</span>
                              <span className="font-medium">{stats.itemCount}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Categories:</span>
                              <span className="font-medium">{stats.categoryCount}</span>
                            </div>
                            {stats.lastUpdated && (
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Last Updated:</span>
                                <span className="font-medium text-xs">
                                  {format(new Date(stats.lastUpdated), 'MMM d, yyyy')}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                        {restaurant.menu_ready_at && (
                          <div className="text-xs text-muted-foreground">
                            Ready since: {format(new Date(restaurant.menu_ready_at), 'MMM d, yyyy')}
                          </div>
                        )}
                        <div className="flex gap-2">
                          {status !== 'not_started' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenDialog(restaurant, 'not_started')}
                              className="flex-1"
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Not Started
                            </Button>
                          )}
                          {status !== 'in_progress' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenDialog(restaurant, 'in_progress')}
                              className="flex-1"
                            >
                              <Clock className="h-3 w-3 mr-1" />
                              In Progress
                            </Button>
                          )}
                          {status !== 'ready' && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleOpenDialog(restaurant, 'ready')}
                              className="flex-1"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Mark Ready
                            </Button>
                          )}
                        </div>
                        {!stats && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => fetchMenuStats(restaurant.restaurant_id)}
                            className="w-full text-xs"
                          >
                            <Utensils className="h-3 w-3 mr-1" />
                            Load Menu Stats
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Status Update Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Update Menu Preparation Status</DialogTitle>
            <DialogDescription>
              Update the menu preparation status for {selectedRestaurant?.restaurant.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">New Status</label>
              <Select value={newStatus} onValueChange={(value) => setNewStatus(value as MenuStatus)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_started">Not Started</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {selectedRestaurant && menuStats[selectedRestaurant.restaurant_id] && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <h4 className="font-medium">Current Menu Stats</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Items:</span>{' '}
                    <span className="font-medium">
                      {menuStats[selectedRestaurant.restaurant_id].itemCount}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Categories:</span>{' '}
                    <span className="font-medium">
                      {menuStats[selectedRestaurant.restaurant_id].categoryCount}
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Notes (Optional)</label>
              <Textarea
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                placeholder="Add notes about the menu preparation status..."
                className="mt-1"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateStatus} disabled={loading}>
              {loading ? 'Updating...' : 'Update Status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

