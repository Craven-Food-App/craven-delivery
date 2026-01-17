import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface Executive {
  id: string;
  user_id: string;
  role: string;
  access_level: number;
  title: string;
  employee_id: string;
  full_name?: string;
  email?: string;
}

interface VestingSchedule {
  type: 'immediate' | 'standard' | 'custom';
  cliff_months?: number;
  duration_months?: number;
}

export function EquityGrantForm({ onGrantCreated }: { onGrantCreated?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [executives, setExecutives] = useState<Executive[]>([]);
  const [selectedExecutive, setSelectedExecutive] = useState<string>('');
  const [sharesTotal, setSharesTotal] = useState<string>('');
  const [sharesPercentage, setSharesPercentage] = useState<string>('');
  const [shareClass, setShareClass] = useState<string>('Common Stock');
  const [strikePrice, setStrikePrice] = useState<string>('0.0001');
  const [vestingType, setVestingType] = useState<string>('standard');
  const [cliffMonths, setCliffMonths] = useState<string>('12');
  const [durationMonths, setDurationMonths] = useState<string>('48');
  const [considerationTypes, setConsiderationTypes] = useState<string[]>(['Services Rendered and to be rendered']);
  const [notes, setNotes] = useState<string>('');
  const [currentCapTableTotal, setCurrentCapTableTotal] = useState<number>(0);
  const [remainingEquity, setRemainingEquity] = useState<number>(100);

  useEffect(() => {
    fetchExecutives();
    fetchCurrentCapTable();

    // Set up real-time subscription for cap table updates
    const channel = supabase
      .channel('equity_cap_table_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'employee_equity'
        },
        (payload) => {
          console.log('Equity change detected, refreshing cap table:', payload);
          fetchCurrentCapTable();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchCurrentCapTable = async () => {
    try {
      const { data, error } = await supabase
        .from('employee_equity')
        .select('shares_percentage');

      if (error) throw error;

      const total = data?.reduce((sum, eq) => sum + (eq.shares_percentage || 0), 0) || 0;
      setCurrentCapTableTotal(total);
      setRemainingEquity(100 - total);
    } catch (error) {
      console.error('Error fetching cap table:', error);
    }
  };

  const fetchExecutives = async () => {
    try {
      // First get all exec_users
      const { data: execData, error: execError } = await supabase
        .from('exec_users')
        .select('id, user_id, role, access_level, title');

      if (execError) throw execError;

      // Then get corresponding employee data
      const userIds = execData?.map(e => e.user_id) || [];
      
      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select('id, user_id, first_name, last_name, email')
        .in('user_id', userIds);

      if (empError) throw empError;

      // Merge the data
      const formatted = execData?.map((exec: any) => {
        const employee = empData?.find(emp => emp.user_id === exec.user_id);
        return {
          id: exec.id,
          user_id: exec.user_id,
          role: exec.role,
          access_level: exec.access_level,
          title: exec.title,
          employee_id: employee?.id,
          full_name: employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown',
          email: employee?.email || '',
        };
      }) || [];

      console.log('Fetched executives:', formatted);
      setExecutives(formatted);
    } catch (error) {
      console.error('Error fetching executives:', error);
      toast({
        title: 'Error',
        description: 'Failed to load executives',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const executive = executives.find(e => e.id === selectedExecutive);
      if (!executive) {
        throw new Error('Please select an executive');
      }

      const proposedPercentage = parseFloat(sharesPercentage);
      if (proposedPercentage > remainingEquity) {
        throw new Error(`Cannot grant ${proposedPercentage}%. Only ${remainingEquity.toFixed(2)}% remaining in cap table.`);
      }

      let vestingSchedule: VestingSchedule;
      if (vestingType === 'immediate') {
        vestingSchedule = { type: 'immediate' };
      } else if (vestingType === 'standard') {
        vestingSchedule = {
          type: 'standard',
          cliff_months: 12,
          duration_months: 48,
        };
      } else {
        vestingSchedule = {
          type: 'custom',
          cliff_months: parseInt(cliffMonths),
          duration_months: parseInt(durationMonths),
        };
      }

      const { data, error } = await supabase.functions.invoke('grant-equity', {
        body: {
          executive_id: selectedExecutive,
          employee_id: executive.employee_id,
          shares_total: parseInt(sharesTotal),
          shares_percentage: parseFloat(sharesPercentage),
          share_class: shareClass,
          strike_price: parseFloat(strikePrice),
          vesting_schedule: vestingSchedule,
          consideration_type: considerationTypes.join(', '),
          notes,
        },
      });

      if (error) throw error;

      toast({
        title: 'Equity Grant Created',
        description: `Grant created for ${executive.full_name}. Status: Draft (pending approval)`,
      });

      // Reset form
      setSelectedExecutive('');
      setSharesTotal('');
      setSharesPercentage('');
      setNotes('');

      if (onGrantCreated) {
        onGrantCreated();
      }
    } catch (error: any) {
      console.error('Error creating grant:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create equity grant',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Grant Equity</CardTitle>
        <CardDescription>
          Create a new equity grant. This will be saved as a draft until approved by the board.
        </CardDescription>
        <div className="mt-4 p-4 rounded-lg bg-muted">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Current Cap Table:</span>
            <span className="font-semibold">{currentCapTableTotal.toFixed(2)}%</span>
          </div>
          <div className="flex justify-between text-sm mt-2">
            <span className="text-muted-foreground">Remaining Available:</span>
            <span className="font-semibold text-primary">{remainingEquity.toFixed(2)}%</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="executive">Executive</Label>
            <Select value={selectedExecutive} onValueChange={setSelectedExecutive}>
              <SelectTrigger>
                <SelectValue placeholder="Select executive" />
              </SelectTrigger>
              <SelectContent>
                {executives.map((exec) => (
                  <SelectItem key={exec.id} value={exec.id}>
                    {exec.full_name} ({exec.title})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="shares">Total Shares</Label>
              <Input
                id="shares"
                type="number"
                value={sharesTotal}
                onChange={(e) => setSharesTotal(e.target.value)}
                placeholder="1000000"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="percentage">Ownership %</Label>
              <Input
                id="percentage"
                type="number"
                step="0.01"
                max={remainingEquity}
                value={sharesPercentage}
                onChange={(e) => setSharesPercentage(e.target.value)}
                placeholder="10.00"
                required
              />
              {sharesPercentage && parseFloat(sharesPercentage) > remainingEquity && (
                <p className="text-sm text-destructive">
                  Exceeds remaining equity by {(parseFloat(sharesPercentage) - remainingEquity).toFixed(2)}%
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="shareClass">Share Class</Label>
              <Select value={shareClass} onValueChange={setShareClass}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Common Stock">Common Stock</SelectItem>
                  <SelectItem value="Preferred A">Preferred A</SelectItem>
                  <SelectItem value="Preferred B">Preferred B</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="strike">Strike Price ($)</Label>
              <Input
                id="strike"
                type="number"
                step="0.0001"
                value={strikePrice}
                onChange={(e) => setStrikePrice(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vesting">Vesting Schedule</Label>
            <Select value={vestingType} onValueChange={setVestingType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="immediate">Immediate Vesting</SelectItem>
                <SelectItem value="standard">Standard (4 years, 1 year cliff)</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {vestingType === 'custom' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cliff">Cliff (months)</Label>
                <Input
                  id="cliff"
                  type="number"
                  value={cliffMonths}
                  onChange={(e) => setCliffMonths(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (months)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={durationMonths}
                  onChange={(e) => setDurationMonths(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Consideration Type (Select all that apply)</Label>
            <div className="space-y-3 p-4 border rounded-md">
              {[
                'Services Rendered and to be rendered',
                'Cash',
                'IP Assignment'
              ].map((type) => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={type}
                    checked={considerationTypes.includes(type)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setConsiderationTypes([...considerationTypes, type]);
                      } else {
                        setConsiderationTypes(considerationTypes.filter(t => t !== type));
                      }
                    }}
                  />
                  <Label htmlFor={type} className="font-normal cursor-pointer">
                    {type}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes about this grant..."
              rows={3}
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Equity Grant (Draft)
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
