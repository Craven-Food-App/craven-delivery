import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle } from 'lucide-react';

interface Shareholder {
  id: string;
  name: string;
  position: string;
  shares_total: number;
  shares_percentage: number;
  equity_type: string;
  vesting_schedule: any;
  grant_date: string;
}

export function CapTableView() {
  const [shareholders, setShareholders] = useState<Shareholder[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalAllocated, setTotalAllocated] = useState(0);

  useEffect(() => {
    fetchCapTable();

    // Set up real-time subscription
    const channel = supabase
      .channel('employee_equity_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'employee_equity'
        },
        (payload) => {
          console.log('Cap table change detected:', payload);
          fetchCapTable();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchCapTable = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('employee_equity')
        .select(`
          id,
          shares_total,
          shares_percentage,
          equity_type,
          vesting_schedule,
          grant_date,
          employees (
            first_name,
            last_name,
            position
          )
        `)
        .order('shares_percentage', { ascending: false });

      if (error) throw error;

      const formatted = data?.map((eq: any) => ({
        id: eq.id,
        name: `${eq.employees?.first_name} ${eq.employees?.last_name}`,
        position: eq.employees?.position || 'N/A',
        shares_total: eq.shares_total,
        shares_percentage: eq.shares_percentage,
        equity_type: eq.equity_type,
        vesting_schedule: eq.vesting_schedule,
        grant_date: eq.grant_date,
      })) || [];

      setShareholders(formatted);

      const total = formatted.reduce((sum, sh) => sum + (sh.shares_percentage || 0), 0);
      setTotalAllocated(total);
    } catch (error: any) {
      console.error('Error fetching cap table:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatVesting = (schedule: any) => {
    if (!schedule) return 'N/A';
    if (typeof schedule === 'string') return schedule;
    if (schedule.type === 'immediate') return 'Immediate';
    if (schedule.cliff_months && schedule.duration_months) {
      const years = Math.floor(schedule.duration_months / 12);
      const cliffYears = Math.floor(schedule.cliff_months / 12);
      return cliffYears > 0 
        ? `${years}y / ${cliffYears}y cliff`
        : `${years} years`;
    }
    return 'Custom';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Capitalization Table</CardTitle>
        <CardDescription>
          Current equity ownership across all shareholders
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Allocation Summary */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Total Allocated</span>
            <span className={totalAllocated > 100 ? 'text-destructive font-bold' : 'font-medium'}>
              {totalAllocated.toFixed(2)}%
            </span>
          </div>
          <Progress value={Math.min(totalAllocated, 100)} className="h-2" />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Unallocated</span>
            <span>{Math.max(0, 100 - totalAllocated).toFixed(2)}%</span>
          </div>
        </div>

        {totalAllocated > 100 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Cap table exceeds 100%! Total allocation is {totalAllocated.toFixed(2)}%. 
              Please review and adjust equity grants.
            </AlertDescription>
          </Alert>
        )}

        {/* Cap Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shareholder</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Share Class</TableHead>
                <TableHead className="text-right">Shares</TableHead>
                <TableHead className="text-right">Percentage</TableHead>
                <TableHead>Vesting</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shareholders.map((sh) => (
                <TableRow key={sh.id}>
                  <TableCell className="font-medium">{sh.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{sh.position}</TableCell>
                  <TableCell className="text-sm">{sh.equity_type || 'Common Stock'}</TableCell>
                  <TableCell className="text-right">{sh.shares_total.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-medium">{sh.shares_percentage}%</TableCell>
                  <TableCell className="text-sm">{formatVesting(sh.vesting_schedule)}</TableCell>
                </TableRow>
              ))}
              {shareholders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No equity grants yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold">{shareholders.length}</div>
            <div className="text-sm text-muted-foreground">Shareholders</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{totalAllocated.toFixed(1)}%</div>
            <div className="text-sm text-muted-foreground">Allocated</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {shareholders.reduce((sum, sh) => sum + sh.shares_total, 0).toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Total Shares</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
