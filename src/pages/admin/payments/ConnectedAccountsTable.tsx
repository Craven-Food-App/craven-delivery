import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { RefreshCw, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface ConnectedAccount {
  id: string;
  owner_type: string;
  owner_id: string;
  stripe_account_id: string;
  details_submitted: boolean;
  payouts_enabled: boolean;
  charges_enabled: boolean;
  requirements: any;
  owner_name: string | null;
  created_at: string;
  updated_at: string;
}

export default function ConnectedAccountsTable() {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('stripe_accounts_summary')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAccounts(data || []);
    } catch (error: any) {
      console.error('Error loading accounts:', error);
      toast.error('Failed to load connected accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleRefreshStatus = async (stripeAccountId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('get-connect-status', {
        body: { stripe_account_id: stripeAccountId },
      });

      if (error) throw error;
      toast.success('Status refreshed');
      loadAccounts();
    } catch (error: any) {
      toast.error(`Failed to refresh: ${error.message}`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Connected Accounts</CardTitle>
          <Button variant="outline" size="sm" onClick={loadAccounts}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Owner</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Stripe Account ID</TableHead>
                <TableHead>Details Submitted</TableHead>
                <TableHead>Payouts Enabled</TableHead>
                <TableHead>Requirements</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : accounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    No connected accounts
                  </TableCell>
                </TableRow>
              ) : (
                accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell>
                      <div className="font-medium">{account.owner_name || 'N/A'}</div>
                      <div className="text-xs text-slate-500 font-mono">
                        {account.owner_id.slice(0, 8)}...
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {account.owner_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-slate-100 px-2 py-1 rounded">
                          {account.stripe_account_id.slice(0, 12)}...
                        </code>
                        <a
                          href={`https://dashboard.stripe.com/connect/accounts/${account.stripe_account_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          account.details_submitted
                            ? 'bg-green-100 text-green-800 border-green-200'
                            : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                        }
                      >
                        {account.details_submitted ? 'Yes' : 'No'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          account.payouts_enabled
                            ? 'bg-green-100 text-green-800 border-green-200'
                            : 'bg-red-100 text-red-800 border-red-200'
                        }
                      >
                        {account.payouts_enabled ? 'Yes' : 'No'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {account.requirements && typeof account.requirements === 'object' ? (
                        <div className="text-xs text-slate-600">
                          {Object.keys(account.requirements).length > 0
                            ? `${Object.keys(account.requirements).length} requirements`
                            : 'None'}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRefreshStatus(account.stripe_account_id)}
                      >
                        Refresh
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

