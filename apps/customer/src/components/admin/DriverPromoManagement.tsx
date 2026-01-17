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
  Gift,
  Plus,
  TrendingUp,
  Users,
  DollarSign,
  Edit,
  Trash2,
  Pause,
  Play
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export function DriverPromoManagement() {
  const [loading, setLoading] = useState(true);
  const [promos, setPromos] = useState<any[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPromo, setNewPromo] = useState({
    title: '',
    description: '',
    promo_type: 'delivery_count',
    requirements: {
      count: 10,
      timeframe: 'week'
    },
    reward_amount: 2500,
    start_date: new Date().toISOString().slice(0, 16),
    end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
  });

  useEffect(() => {
    fetchPromos();
  }, []);

  const fetchPromos = async () => {
    try {
      const { data, error } = await supabase
        .from('driver_promotions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPromos(data || []);
    } catch (error) {
      console.error('Error fetching promos:', error);
      toast.error('Failed to load promotions');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePromo = async () => {
    if (!newPromo.title || !newPromo.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('driver_promotions')
        .insert({
          title: newPromo.title,
          description: newPromo.description,
          promo_type: newPromo.promo_type,
          requirements: newPromo.requirements,
          reward_amount: newPromo.reward_amount,
          start_date: new Date(newPromo.start_date).toISOString(),
          end_date: new Date(newPromo.end_date).toISOString(),
        });

      if (error) throw error;

      toast.success('Promo created successfully!');
      setShowCreateDialog(false);
      setNewPromo({
        title: '',
        description: '',
        promo_type: 'delivery_count',
        requirements: {
          count: 10,
          timeframe: 'week'
        },
        reward_amount: 2500,
        start_date: new Date().toISOString().slice(0, 16),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      });
      fetchPromos();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create promo');
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('driver_promotions')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      toast.success(`Promo ${!currentStatus ? 'activated' : 'paused'}`);
      fetchPromos();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update promo');
    }
  };

  const activePromos = promos.filter(p => p.is_active);
  const totalBudget = activePromos.reduce((sum, p) => 
    sum + (p.reward_amount * 100), 0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Driver Promotions & Challenges
          </h2>
          <p className="text-muted-foreground mt-1">
            Create and manage driver incentive programs
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Promo
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Promos</p>
                <p className="text-3xl font-bold text-purple-600">{activePromos.length}</p>
              </div>
              <Gift className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Budget</p>
                <p className="text-3xl font-bold text-green-600">
                  ${(totalBudget / 100).toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Participants</p>
                <p className="text-3xl font-bold text-blue-600">
                  {activePromos.reduce((sum, p) => sum + (p.current_participants || 0), 0)}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completion Rate</p>
                <p className="text-3xl font-bold text-orange-600">67%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Promos List */}
      <Card>
        <CardHeader>
          <CardTitle>All Promotions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {promos.length === 0 ? (
              <div className="text-center py-12">
                <Gift className="h-16 w-16 mx-auto text-muted-foreground opacity-50 mb-4" />
                <p className="text-muted-foreground">No promotions created yet</p>
              </div>
            ) : (
              promos.map((promo) => (
                <div
                  key={promo.id}
                  className="p-4 rounded-lg border hover:border-primary transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="text-3xl">🎯</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{promo.title}</h4>
                          <Badge variant={promo.is_active ? 'default' : 'secondary'}>
                            {promo.is_active ? 'Active' : 'Paused'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{promo.description}</p>
                        
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className="flex items-center gap-1 text-green-600 font-medium">
                            <DollarSign className="h-3 w-3" />
                            ${(promo.reward_amount / 100).toFixed(2)}
                          </span>
                          <span className="text-muted-foreground">
                            {promo.promo_type.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleActive(promo.id, promo.is_active)}
                      >
                        {promo.is_active ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create Promo Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Driver Promotion</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={newPromo.title}
                onChange={(e) => setNewPromo({ ...newPromo, title: e.target.value })}
                placeholder="Weekend Warrior"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={newPromo.description}
                onChange={(e) => setNewPromo({ ...newPromo, description: e.target.value })}
                placeholder="Complete 20 deliveries this weekend and earn a $50 bonus!"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="promo_type">Promo Type</Label>
                <select
                  id="promo_type"
                  value={newPromo.promo_type}
                  onChange={(e) => setNewPromo({ ...newPromo, promo_type: e.target.value })}
                  className="w-full p-2 border rounded-md bg-background"
                >
                  <option value="delivery_count">Delivery Count</option>
                  <option value="time_based">Time Based</option>
                  <option value="peak_hours">Peak Hours</option>
                  <option value="geographic">Geographic</option>
                  <option value="rating_based">Rating Based</option>
                  <option value="streak_based">Streak Based</option>
                  <option value="referral">Referral</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reward_amount">Reward Amount ($)</Label>
                <Input
                  id="reward_amount"
                  type="number"
                  step="0.01"
                  value={(newPromo.reward_amount / 100).toFixed(2)}
                  onChange={(e) => setNewPromo({ ...newPromo, reward_amount: Math.round(parseFloat(e.target.value) * 100) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Starts At</Label>
                <Input
                  id="start_date"
                  type="datetime-local"
                  value={newPromo.start_date}
                  onChange={(e) => setNewPromo({ ...newPromo, start_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_date">Ends At</Label>
                <Input
                  id="end_date"
                  type="datetime-local"
                  value={newPromo.end_date}
                  onChange={(e) => setNewPromo({ ...newPromo, end_date: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePromo}>
              <Plus className="h-4 w-4 mr-2" />
              Create Promo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

