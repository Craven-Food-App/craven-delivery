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
import { Target, Edit, TrendingUp, DollarSign, Crown } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface TierManagementProps {
  tiers: any[];
  onRefresh: () => void;
}

export function TierManagement({ tiers, onRefresh }: TierManagementProps) {
  const [editingTier, setEditingTier] = useState<any>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const handleEditTier = (tier: any) => {
    setEditingTier({ ...tier });
    setShowEditDialog(true);
  };

  const handleSaveTier = async () => {
    if (!editingTier) return;

    try {
      const { error } = await supabase
        .from('commission_tiers')
        .update({
          commission_percent: editingTier.commission_percent,
          min_monthly_volume: editingTier.min_monthly_volume,
          max_monthly_volume: editingTier.max_monthly_volume,
        })
        .eq('id', editingTier.id);

      if (error) throw error;

      toast.success(`${editingTier.tier_name} tier updated!`);
      setShowEditDialog(false);
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update tier');
    }
  };

  const getTierIcon = (icon: string) => {
    return <span className="text-2xl">{icon}</span>;
  };

  const getTierColor = (color: string) => {
    return { backgroundColor: color + '20', borderColor: color };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-2">
            <Crown className="h-6 w-6 text-purple-600" />
            <h3 className="text-xl font-bold">Performance-Based Tier System</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Restaurants automatically upgrade to better tiers based on monthly order volume. Lower commission = higher volume incentive!
          </p>
        </CardContent>
      </Card>

      {/* Tier Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tiers.map((tier) => (
          <Card
            key={tier.id}
            className="border-2 hover:shadow-lg transition-all"
            style={getTierColor(tier.color)}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getTierIcon(tier.icon)}
                  <CardTitle>{tier.tier_name}</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEditTier(tier)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Commission Rate */}
              <div className="text-center p-4 bg-white rounded-lg border-2" style={{ borderColor: tier.color }}>
                <p className="text-sm text-muted-foreground">Commission Rate</p>
                <p className="text-3xl font-bold" style={{ color: tier.color }}>
                  {tier.commission_percent}%
                </p>
              </div>

              {/* Volume Range */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="h-4 w-4" />
                  <span className="font-medium">Monthly Volume:</span>
                </div>
                <div className="text-sm">
                  ${(tier.min_monthly_volume / 1000).toFixed(0)}k
                  {tier.max_monthly_volume ? (
                    <> - ${(tier.max_monthly_volume / 1000).toFixed(0)}k</>
                  ) : (
                    <> and above</>
                  )}
                </div>
              </div>

              {/* Benefits */}
              {tier.benefits && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4" />
                    <span className="font-medium">Benefits:</span>
                  </div>
                  <div className="space-y-1">
                    {Object.entries(tier.benefits as Record<string, string>).map(([key, value]) => (
                      <Badge key={key} variant="outline" className="text-xs mr-1 mb-1">
                        {value}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Target className="h-5 w-5 text-blue-600 mt-1" />
            <div className="space-y-2">
              <h4 className="font-semibold text-blue-900">How Tier Auto-Upgrade Works:</h4>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Tiers are calculated based on last 30 days order volume</li>
                <li>System automatically upgrades restaurants when they hit thresholds</li>
                <li>Commission rate updates take effect at start of next billing cycle</li>
                <li>Higher tiers get premium benefits + lower commission rates</li>
                <li>Restaurants can see their current tier and next tier goal in merchant portal</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Tier Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {editingTier?.tier_name} Tier</DialogTitle>
          </DialogHeader>
          {editingTier && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="commission">Commission Percent (%)</Label>
                <Input
                  id="commission"
                  type="number"
                  step="0.5"
                  value={editingTier.commission_percent}
                  onChange={(e) => setEditingTier({
                    ...editingTier,
                    commission_percent: Number(e.target.value)
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minVolume">Minimum Monthly Volume ($)</Label>
                <Input
                  id="minVolume"
                  type="number"
                  value={editingTier.min_monthly_volume}
                  onChange={(e) => setEditingTier({
                    ...editingTier,
                    min_monthly_volume: Number(e.target.value)
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxVolume">Maximum Monthly Volume ($)</Label>
                <Input
                  id="maxVolume"
                  type="number"
                  value={editingTier.max_monthly_volume || ''}
                  onChange={(e) => setEditingTier({
                    ...editingTier,
                    max_monthly_volume: e.target.value ? Number(e.target.value) : null
                  })}
                  placeholder="Leave empty for no cap"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTier}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

