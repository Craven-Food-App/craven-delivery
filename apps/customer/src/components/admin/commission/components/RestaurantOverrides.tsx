import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Building2,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface RestaurantOverridesProps {
  overrides: any[];
  onRefresh: () => void;
}

export function RestaurantOverrides({ overrides, onRefresh }: RestaurantOverridesProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newOverride, setNewOverride] = useState({
    restaurant_id: '',
    commission_percent: 10,
    reason: '',
    notes: '',
    end_date: '',
  });

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      const { data } = await supabase
        .from('restaurants')
        .select('id, name, email')
        .order('name');
      
      setRestaurants(data || []);
    } catch (error) {
      console.error('Error fetching restaurants:', error);
    }
  };

  const handleAddOverride = async () => {
    if (!newOverride.restaurant_id) {
      toast.error('Please select a restaurant');
      return;
    }
    if (!newOverride.reason) {
      toast.error('Please provide a reason for the override');
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('restaurant_commission_overrides')
        .insert({
          restaurant_id: newOverride.restaurant_id,
          commission_percent: newOverride.commission_percent,
          reason: newOverride.reason,
          notes: newOverride.notes,
          end_date: newOverride.end_date || null,
          created_by: userData?.user?.id,
          is_active: true,
        });

      if (error) throw error;

      toast.success('Commission override created!');
      setShowAddDialog(false);
      setNewOverride({
        restaurant_id: '',
        commission_percent: 10,
        reason: '',
        notes: '',
        end_date: '',
      });
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create override');
    }
  };

  const handleDeleteOverride = async (id: string) => {
    if (!confirm('Are you sure you want to remove this commission override?')) return;

    try {
      const { error } = await supabase
        .from('restaurant_commission_overrides')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      toast.success('Override removed');
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove override');
    }
  };

  const filteredOverrides = overrides.filter(override =>
    override.restaurant?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search restaurants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Override
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">{overrides.length}</p>
              <p className="text-sm text-muted-foreground">Active Overrides</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">
                {overrides.filter(o => o.end_date === null).length}
              </p>
              <p className="text-sm text-muted-foreground">Permanent</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-orange-600">
                {overrides.filter(o => o.end_date !== null).length}
              </p>
              <p className="text-sm text-muted-foreground">Temporary</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overrides List */}
      <Card>
        <CardHeader>
          <CardTitle>Restaurant-Specific Commission Rates</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredOverrides.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-3" />
              <p className="text-muted-foreground">No commission overrides found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOverrides.map((override) => (
                <div
                  key={override.id}
                  className="flex items-start gap-3 p-4 rounded-lg border hover:border-primary transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h4 className="font-semibold flex items-center gap-2">
                          {override.restaurant?.name || 'Unknown Restaurant'}
                          <Badge className="bg-purple-600">
                            {override.commission_percent}% Commission
                          </Badge>
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {override.restaurant?.email}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteOverride(override.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <AlertCircle className="h-3 w-3" />
                        <span className="font-medium">Reason:</span>
                        {override.reason}
                      </div>
                      {override.notes && (
                        <div className="text-muted-foreground pl-5">
                          {override.notes}
                        </div>
                      )}
                      <div className="flex items-center gap-4 pl-5 pt-1">
                        <span className="flex items-center gap-1 text-xs">
                          <Calendar className="h-3 w-3" />
                          Started: {new Date(override.start_date).toLocaleDateString()}
                        </span>
                        {override.end_date && (
                          <span className="flex items-center gap-1 text-xs text-orange-600">
                            <Calendar className="h-3 w-3" />
                            Expires: {new Date(override.end_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Override Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Commission Override</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="restaurant">Restaurant *</Label>
              <select
                id="restaurant"
                value={newOverride.restaurant_id}
                onChange={(e) => setNewOverride({ ...newOverride, restaurant_id: e.target.value })}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Select a restaurant...</option>
                {restaurants.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="commission">Commission Percent (%) *</Label>
              <Input
                id="commission"
                type="number"
                step="0.5"
                min="0"
                max="30"
                value={newOverride.commission_percent}
                onChange={(e) => setNewOverride({ ...newOverride, commission_percent: Number(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Override *</Label>
              <Input
                id="reason"
                value={newOverride.reason}
                onChange={(e) => setNewOverride({ ...newOverride, reason: e.target.value })}
                placeholder="e.g., High volume partner, Promotional rate, Contract agreement"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                value={newOverride.notes}
                onChange={(e) => setNewOverride({ ...newOverride, notes: e.target.value })}
                placeholder="Optional: Add any additional context or details"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date (Optional)</Label>
              <Input
                id="endDate"
                type="date"
                value={newOverride.end_date}
                onChange={(e) => setNewOverride({ ...newOverride, end_date: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty for permanent override
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddOverride}>
              <Plus className="h-4 w-4 mr-2" />
              Create Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

