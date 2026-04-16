import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, CalendarClock, Star } from 'lucide-react';

type RestaurantRow = {
  id: string;
  name: string;
  email: string | null;
  tier_reset_cycle: string;
  is_founding_merchant: boolean;
  founding_merchant_approved_at: string | null;
  founding_merchant_slot_number: number | null;
};

export function MerchantCycleSettings() {
  const [rows, setRows] = useState<RestaurantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select(
          'id, name, email, tier_reset_cycle, is_founding_merchant, founding_merchant_approved_at, founding_merchant_slot_number'
        )
        .order('name');
      if (error) throw error;
      setRows((data as RestaurantRow[]) || []);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to load restaurants');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateLocal = (id: string, patch: Partial<RestaurantRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const save = async (r: RestaurantRow) => {
    setSavingId(r.id);
    try {
      const { error } = await supabase
        .from('restaurants')
        .update({
          tier_reset_cycle: r.tier_reset_cycle,
          is_founding_merchant: r.is_founding_merchant,
          founding_merchant_approved_at: r.founding_merchant_approved_at || null,
          founding_merchant_slot_number:
            r.founding_merchant_slot_number === null || r.founding_merchant_slot_number === undefined
              ? null
              : Number(r.founding_merchant_slot_number),
        })
        .eq('id', r.id);
      if (error) throw error;
      toast.success(`Saved ${r.name}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-2">
            <CalendarClock className="h-6 w-6 text-amber-700" />
            <h3 className="text-xl font-bold">Commission cycle & founding merchants</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Monthly (default): tier volume resets each calendar month. Quarterly: volume accumulates for the
            calendar quarter (Q1–Q4). Tier rates are the same; only the measurement window changes. Founding
            flags are for reporting and the early-incentive cohort.
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => load()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-600" />
            Restaurants
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No restaurants found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4">Merchant</th>
                  <th className="pb-2 pr-4">Cycle</th>
                  <th className="pb-2 pr-4">Founding</th>
                  <th className="pb-2 pr-4">Approved at</th>
                  <th className="pb-2 pr-4">Slot #</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-muted/40 align-top">
                    <td className="py-3 pr-4">
                      <div className="font-medium">{r.name}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[220px]">
                        {r.email || r.id}
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <Select
                        value={r.tier_reset_cycle || 'monthly'}
                        onValueChange={(v) => updateLocal(r.id, { tier_reset_cycle: v })}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={!!r.is_founding_merchant}
                          onCheckedChange={(c) => updateLocal(r.id, { is_founding_merchant: c })}
                        />
                        {r.is_founding_merchant && (
                          <Badge variant="secondary" className="text-xs">
                            Founding
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <Input
                        type="datetime-local"
                        className="w-[200px]"
                        value={
                          r.founding_merchant_approved_at
                            ? r.founding_merchant_approved_at.slice(0, 16)
                            : ''
                        }
                        onChange={(e) =>
                          updateLocal(r.id, {
                            founding_merchant_approved_at: e.target.value
                              ? new Date(e.target.value).toISOString()
                              : null,
                          })
                        }
                      />
                    </td>
                    <td className="py-3 pr-4">
                      <Input
                        type="number"
                        className="w-[90px]"
                        min={1}
                        placeholder="—"
                        value={r.founding_merchant_slot_number ?? ''}
                        onChange={(e) =>
                          updateLocal(r.id, {
                            founding_merchant_slot_number: e.target.value
                              ? parseInt(e.target.value, 10)
                              : null,
                          })
                        }
                      />
                    </td>
                    <td className="py-3">
                      <Button
                        size="sm"
                        variant="default"
                        disabled={savingId === r.id}
                        onClick={() => save(r)}
                      >
                        {savingId === r.id ? 'Saving…' : 'Save'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
