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
import { emitDriverOperationsChange } from '@/lib/driverOperationsEvents';

export function DriverPromoManagement() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [promos, setPromos] = useState<any[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingPromoId, setEditingPromoId] = useState<string | null>(null);
  const [newPromo, setNewPromo] = useState({
    title: '',
    description: '',
    challenge_type: 'delivery_count',
    requirement_value: 10,
    timeframe: 'week',
    reward_amount_cents: 2500,
    starts_at: new Date().toISOString().slice(0, 16),
    ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
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

  const resetPromoForm = () => {
    setEditingPromoId(null);
    setNewPromo({
      title: '',
      description: '',
      challenge_type: 'delivery_count',
      requirement_value: 10,
      timeframe: 'week',
      reward_amount_cents: 2500,
      starts_at: new Date().toISOString().slice(0, 16),
      ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    });
  };

  const handleSavePromo = async () => {
    if (!newPromo.title || !newPromo.description) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (newPromo.requirement_value < 1 || newPromo.reward_amount_cents < 0) {
      toast.error('Requirement and reward values must be valid');
      return;
    }

    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      const payload = {
        title: newPromo.title.trim(),
        description: newPromo.description.trim(),
        challenge_type: newPromo.challenge_type,
        requirement_value: newPromo.requirement_value,
        requirement_details: { timeframe: newPromo.timeframe },
        reward_type: 'cash_bonus',
        reward_amount_cents: newPromo.reward_amount_cents,
        starts_at: new Date(newPromo.starts_at).toISOString(),
        ends_at: new Date(newPromo.ends_at).toISOString(),
        created_by: user?.id,
      };
      const query = editingPromoId
        ? supabase.from('driver_promotions').update(payload).eq('id', editingPromoId)
        : supabase.from('driver_promotions').insert(payload);
      const { error } = await query;

      if (error) throw error;

      toast.success(editingPromoId ? 'Promotion updated' : 'Promotion created');
      setShowCreateDialog(false);
      resetPromoForm();
      emitDriverOperationsChange({ area: 'promos', entityId: editingPromoId || undefined, action: editingPromoId ? 'updated' : 'created' });
      await fetchPromos();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save promotion');
    } finally {
      setSaving(false);
    }
  };

  const handleEditPromo = (promo: any) => {
    setEditingPromoId(promo.id);
    setNewPromo({
      title: promo.title || '',
      description: promo.description || '',
      challenge_type: promo.challenge_type || 'delivery_count',
      requirement_value: Number(promo.requirement_value || 1),
      timeframe: promo.requirement_details?.timeframe || 'week',
      reward_amount_cents: Number(promo.reward_amount_cents || 0),
      starts_at: new Date(promo.starts_at).toISOString().slice(0, 16),
      ends_at: new Date(promo.ends_at).toISOString().slice(0, 16),
    });
    setShowCreateDialog(true);
  };

  const handleDeletePromo = async (promo: any) => {
    if (!window.confirm(`Delete "${promo.title}"? This cannot be undone.`)) return;
    const { error } = await supabase.from('driver_promotions').delete().eq('id', promo.id);
    if (error) {
      toast.error(error.message || 'Failed to delete promotion');
      return;
    }
    emitDriverOperationsChange({ area: 'promos', entityId: promo.id, action: 'deleted' });
    toast.success('Promotion deleted');
    await fetchPromos();
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('driver_promotions')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      toast.success(`Promo ${!currentStatus ? 'activated' : 'paused'}`);
      emitDriverOperationsChange({ area: 'promos', entityId: id, action: !currentStatus ? 'activated' : 'paused' });
      await fetchPromos();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update promo');
    }
  };

  const activePromos = promos.filter(p => p.is_active);
  const totalBudget = activePromos.reduce((sum, p) => 
    sum + Number(p.reward_amount_cents || 0), 0
  );
  const totalParticipants = activePromos.reduce((sum, p) => sum + Number(p.current_participants || 0), 0);

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
        <Button onClick={() => { resetPromoForm(); setShowCreateDialog(true); }}>
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
                  {totalParticipants}
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
                <p className="text-sm text-muted-foreground">Scheduled</p>
                <p className="text-3xl font-bold text-orange-600">
                  {promos.filter(p => new Date(p.starts_at).getTime() > Date.now()).length}
                </p>
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
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Loading promotions…</div>
            ) : promos.length === 0 ? (
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
                            ${(Number(promo.reward_amount_cents || 0) / 100).toFixed(2)}
                          </span>
                          <span className="text-muted-foreground">
                            {(promo.challenge_type || '').replace(/_/g, ' ')} · {promo.requirement_value} required
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
                      <Button variant="ghost" size="icon" onClick={() => handleEditPromo(promo)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeletePromo(promo)}>
                        <Trash2 className="h-4 w-4" />
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
            <DialogTitle>{editingPromoId ? 'Edit Driver Promotion' : 'Create New Driver Promotion'}</DialogTitle>
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
                  value={newPromo.challenge_type}
                  onChange={(e) => setNewPromo({ ...newPromo, challenge_type: e.target.value })}
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
                  value={(newPromo.reward_amount_cents / 100).toFixed(2)}
                  onChange={(e) => setNewPromo({ ...newPromo, reward_amount_cents: Math.round(parseFloat(e.target.value || '0') * 100) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="requirement_value">Required count / value</Label>
                <Input
                  id="requirement_value"
                  type="number"
                  min="1"
                  value={newPromo.requirement_value}
                  onChange={(e) => setNewPromo({ ...newPromo, requirement_value: Math.max(1, Number(e.target.value || 1)) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timeframe">Timeframe</Label>
                <select
                  id="timeframe"
                  value={newPromo.timeframe}
                  onChange={(e) => setNewPromo({ ...newPromo, timeframe: e.target.value })}
                  className="w-full p-2 border rounded-md bg-background"
                >
                  <option value="day">Day</option>
                  <option value="week">Week</option>
                  <option value="promotion">Promotion window</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Starts At</Label>
                <Input
                  id="start_date"
                  type="datetime-local"
                  value={newPromo.starts_at}
                  onChange={(e) => setNewPromo({ ...newPromo, starts_at: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_date">Ends At</Label>
                <Input
                  id="end_date"
                  type="datetime-local"
                  value={newPromo.ends_at}
                  onChange={(e) => setNewPromo({ ...newPromo, ends_at: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreateDialog(false); resetPromoForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleSavePromo} disabled={saving}>
              <Plus className="h-4 w-4 mr-2" />
              {saving ? 'Saving…' : editingPromoId ? 'Save Changes' : 'Create Promo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

