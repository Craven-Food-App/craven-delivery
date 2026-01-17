import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, FileText } from 'lucide-react';
import { format } from 'date-fns';

interface EquityGrant {
  id: string;
  executive_id: string;
  employee_id: string;
  grant_date: string;
  shares_total: number;
  shares_percentage: number;
  share_class: string;
  strike_price: number;
  vesting_schedule: any;
  consideration_type: string;
  status: string;
  approved_at: string | null;
  created_at: string;
  notes: string | null;
  executive_name?: string;
  executive_title?: string;
}

export function EquityGrantReview({ refreshTrigger }: { refreshTrigger?: number }) {
  const [grants, setGrants] = useState<EquityGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);

  useEffect(() => {
    fetchGrants();
  }, [refreshTrigger]);

  const fetchGrants = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('equity_grants')
        .select(`
          *,
          executive:exec_users!equity_grants_executive_id_fkey (
            title
          ),
          employee:employees!equity_grants_employee_id_fkey (
            first_name,
            last_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted = data?.map((grant: any) => ({
        ...grant,
        executive_name: grant.employee 
          ? `${grant.employee.first_name} ${grant.employee.last_name}`
          : 'Unknown',
        executive_title: grant.executive?.title || 'N/A',
      })) || [];

      setGrants(formatted);
    } catch (error: any) {
      console.error('Error fetching grants:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch equity grants',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (grantId: string) => {
    setApproving(grantId);
    try {
      const { data, error } = await supabase.functions.invoke('approve-equity-grant', {
        body: { grant_id: grantId },
      });

      if (error) throw error;

      toast({
        title: 'Grant Approved',
        description: 'Equity grant has been approved and employee_equity has been updated.',
      });

      fetchGrants();
    } catch (error: any) {
      console.error('Error approving grant:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve grant',
        variant: 'destructive',
      });
    } finally {
      setApproving(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      draft: 'secondary',
      approved: 'default',
      documents_generated: 'outline',
      sent: 'outline',
    };

    return (
      <Badge variant={variants[status] || 'secondary'}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const formatVesting = (schedule: any) => {
    if (!schedule) return 'N/A';
    if (schedule.type === 'immediate') return 'Immediate';
    if (schedule.cliff_months && schedule.duration_months) {
      const years = Math.floor(schedule.duration_months / 12);
      const cliffYears = Math.floor(schedule.cliff_months / 12);
      return cliffYears > 0 
        ? `${years} years with ${cliffYears} year cliff`
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
        <CardTitle>Equity Grants Review</CardTitle>
        <CardDescription>
          Review and approve equity grants. Approved grants will update employee_equity records.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {grants.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No equity grants yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Executive</TableHead>
                  <TableHead>Shares</TableHead>
                  <TableHead>Percentage</TableHead>
                  <TableHead>Strike Price</TableHead>
                  <TableHead>Vesting</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Grant Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grants.map((grant) => (
                  <TableRow key={grant.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{grant.executive_name}</div>
                        <div className="text-sm text-muted-foreground">{grant.executive_title}</div>
                      </div>
                    </TableCell>
                    <TableCell>{grant.shares_total.toLocaleString()}</TableCell>
                    <TableCell>{grant.shares_percentage}%</TableCell>
                    <TableCell>${grant.strike_price}</TableCell>
                    <TableCell className="text-sm">{formatVesting(grant.vesting_schedule)}</TableCell>
                    <TableCell>{getStatusBadge(grant.status)}</TableCell>
                    <TableCell>{format(new Date(grant.grant_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      {grant.status === 'draft' && (
                        <Button
                          size="sm"
                          onClick={() => handleApprove(grant.id)}
                          disabled={approving === grant.id}
                        >
                          {approving === grant.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </>
                          )}
                        </Button>
                      )}
                      {grant.status === 'approved' && (
                        <Badge variant="outline">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Approved
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
