import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, Clock, ExternalLink, Eye } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface InvestorIntake {
  id: string;
  full_name: string;
  email: string;
  entity_name: string | null;
  investor_type: string;
  jurisdiction: string | null;
  capital_range: string | null;
  acknowledgment_accepted: boolean;
  accepted_at: string | null;
  ip_address: string | null;
  user_agent: string | null;
  status: 'pending' | 'approved' | 'denied';
  reviewed_at: string | null;
  reviewed_by: string | null;
  admin_notes: string | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

const InvestorIntakeManager: React.FC = () => {
  const [intakes, setIntakes] = useState<InvestorIntake[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIntake, setSelectedIntake] = useState<InvestorIntake | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'denied'>('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchIntakes();
  }, [filterStatus]);

  const fetchIntakes = async () => {
    try {
      let query = supabase
        .from('investor_intake')
        .select('*')
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;
      setIntakes(data || []);
    } catch (error: any) {
      console.error('Error fetching investor intakes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load investor intake requests',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (intakeId: string, newStatus: 'approved' | 'denied') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Error',
          description: 'You must be logged in',
          variant: 'destructive',
        });
        return;
      }

      // Update the intake
      const { error: intakeError } = await supabase
        .from('investor_intake')
        .update({
          status: newStatus,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          admin_notes: adminNotes || null,
        })
        .eq('id', intakeId);

      if (intakeError) throw intakeError;

      // If approved, grant investor portal access
      const intake = intakes.find(i => i.id === intakeId);
      if (intake && newStatus === 'approved') {
        // Update or create investor profile
        if (intake.user_id) {
          await supabase
            .from('investor_profiles')
            .upsert({
              user_id: intake.user_id,
              access_status: 'approved',
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'user_id',
            });
        }

        // TODO: Send approval email notification
        // You can add an edge function call here to send email
      }

      toast({
        title: 'Success',
        description: `Request ${newStatus === 'approved' ? 'approved' : 'denied'}`,
      });

      setSelectedIntake(null);
      setAdminNotes('');
      fetchIntakes();
    } catch (error: any) {
      console.error('Error updating intake:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update request',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500">Approved</Badge>;
      case 'denied':
        return <Badge className="bg-red-500">Denied</Badge>;
      default:
        return <Badge className="bg-yellow-500">Pending</Badge>;
    }
  };

  const filteredIntakes = filterStatus === 'all' 
    ? intakes 
    : intakes.filter(i => i.status === filterStatus);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (selectedIntake) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => setSelectedIntake(null)}>
          ← Back to List
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Investor Intake Details</CardTitle>
            <CardDescription>
              Review and approve or deny investor access requests
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Full Name</Label>
                <p className="font-medium">{selectedIntake.full_name}</p>
              </div>
              <div>
                <Label>Email</Label>
                <p className="font-medium">{selectedIntake.email}</p>
              </div>
              <div>
                <Label>Investor Type</Label>
                <p className="font-medium capitalize">{selectedIntake.investor_type}</p>
              </div>
              <div>
                <Label>Status</Label>
                <div className="mt-1">{getStatusBadge(selectedIntake.status)}</div>
              </div>
              {selectedIntake.entity_name && (
                <div>
                  <Label>Company / Fund</Label>
                  <p className="font-medium">{selectedIntake.entity_name}</p>
                </div>
              )}
              {selectedIntake.jurisdiction && (
                <div>
                  <Label>Jurisdiction</Label>
                  <p className="font-medium">{selectedIntake.jurisdiction}</p>
                </div>
              )}
              {selectedIntake.capital_range && (
                <div>
                  <Label>Capital Range</Label>
                  <p className="font-medium">{selectedIntake.capital_range}</p>
                </div>
              )}
              <div>
                <Label>Acknowledgment Accepted</Label>
                <p className="font-medium">
                  {selectedIntake.acknowledgment_accepted ? (
                    <span className="text-green-600">Yes</span>
                  ) : (
                    <span className="text-red-600">No</span>
                  )}
                </p>
              </div>
              {selectedIntake.accepted_at && (
                <div>
                  <Label>Acknowledgment Accepted At</Label>
                  <p className="text-sm text-gray-600">
                    {new Date(selectedIntake.accepted_at).toLocaleString()}
                  </p>
                </div>
              )}
              <div>
                <Label>Submitted</Label>
                <p className="text-sm text-gray-600">
                  {new Date(selectedIntake.created_at).toLocaleString()}
                </p>
              </div>
              {selectedIntake.reviewed_at && (
                <div>
                  <Label>Reviewed</Label>
                  <p className="text-sm text-gray-600">
                    {new Date(selectedIntake.reviewed_at).toLocaleString()}
                  </p>
                </div>
              )}
              {selectedIntake.ip_address && (
                <div>
                  <Label>IP Address</Label>
                  <p className="text-sm text-gray-600 font-mono">{selectedIntake.ip_address}</p>
                </div>
              )}
            </div>

            {selectedIntake.user_agent && (
              <div>
                <Label>User Agent</Label>
                <p className="text-sm text-gray-600 font-mono break-all">{selectedIntake.user_agent}</p>
              </div>
            )}

            {selectedIntake.admin_notes && (
              <div>
                <Label>Previous Admin Notes</Label>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                  {selectedIntake.admin_notes}
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="admin-notes">Admin Notes</Label>
              <Textarea
                id="admin-notes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add notes about this request..."
                rows={4}
              />
            </div>

            <div className="flex gap-4 pt-4 border-t">
              <Button
                onClick={() => handleStatusUpdate(selectedIntake.id, 'approved')}
                className="bg-green-500 hover:bg-green-600"
                disabled={selectedIntake.status === 'approved'}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Approve & Grant Access
              </Button>
              <Button
                onClick={() => handleStatusUpdate(selectedIntake.id, 'denied')}
                variant="destructive"
                disabled={selectedIntake.status === 'denied'}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Deny Access
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Investor Intake Review</h2>
          <p className="text-gray-600">Manage investor interest submissions and approvals</p>
        </div>
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="denied">Denied</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredIntakes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No intake requests found
                  </TableCell>
                </TableRow>
              ) : (
                filteredIntakes.map((intake) => (
                  <TableRow key={intake.id}>
                    <TableCell className="font-medium">{intake.full_name}</TableCell>
                    <TableCell>{intake.email}</TableCell>
                    <TableCell className="capitalize">{intake.investor_type}</TableCell>
                    <TableCell>{intake.entity_name || '-'}</TableCell>
                    <TableCell>{getStatusBadge(intake.status)}</TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {new Date(intake.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedIntake(intake)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="text-sm text-gray-600">
        <p><strong>Total Requests:</strong> {intakes.length}</p>
        <p><strong>Pending:</strong> {intakes.filter(i => i.status === 'pending').length}</p>
        <p><strong>Approved:</strong> {intakes.filter(i => i.status === 'approved').length}</p>
        <p><strong>Denied:</strong> {intakes.filter(i => i.status === 'denied').length}</p>
      </div>
    </div>
  );
};

export default InvestorIntakeManager;

