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
import { Loader2, CheckCircle2, XCircle, Clock, ExternalLink, Eye, ArrowLeft } from 'lucide-react';
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
        return <Badge className="bg-green-50 text-green-700 border border-green-200 text-[10px] px-1.5 py-0.5">Approved</Badge>;
      case 'denied':
        return <Badge className="bg-red-50 text-red-700 border border-red-200 text-[10px] px-1.5 py-0.5">Denied</Badge>;
      default:
        return <Badge className="bg-yellow-50 text-yellow-700 border border-yellow-200 text-[10px] px-1.5 py-0.5">Pending</Badge>;
    }
  };

  const filteredIntakes = filterStatus === 'all' 
    ? intakes 
    : intakes.filter(i => i.status === filterStatus);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (selectedIntake) {
    return (
      <div className="space-y-3">
        <Button variant="outline" onClick={() => setSelectedIntake(null)} size="sm" className="h-7 px-2.5 text-xs">
          <ArrowLeft className="h-3 w-3 mr-1.5" />
          Back to List
        </Button>
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="px-3 py-2 border-b border-gray-200 bg-[#fafbfc]">
            <CardTitle className="text-sm font-semibold">Investor Intake Details</CardTitle>
            <CardDescription className="text-xs mt-1">
              Review and approve or deny investor access requests
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px] font-semibold text-gray-700 uppercase tracking-wide">Full Name</Label>
                <p className="text-sm font-medium text-gray-900 mt-1">{selectedIntake.full_name}</p>
              </div>
              <div>
                <Label className="text-[10px] font-semibold text-gray-700 uppercase tracking-wide">Email</Label>
                <p className="text-sm font-medium text-gray-900 mt-1">{selectedIntake.email}</p>
              </div>
              <div>
                <Label className="text-[10px] font-semibold text-gray-700 uppercase tracking-wide">Investor Type</Label>
                <p className="text-sm font-medium text-gray-900 mt-1 capitalize">{selectedIntake.investor_type}</p>
              </div>
              <div>
                <Label className="text-[10px] font-semibold text-gray-700 uppercase tracking-wide">Status</Label>
                <div className="mt-1">{getStatusBadge(selectedIntake.status)}</div>
              </div>
              {selectedIntake.entity_name && (
                <div>
                  <Label className="text-[10px] font-semibold text-gray-700 uppercase tracking-wide">Company / Fund</Label>
                  <p className="text-sm font-medium text-gray-900 mt-1">{selectedIntake.entity_name}</p>
                </div>
              )}
              {selectedIntake.jurisdiction && (
                <div>
                  <Label className="text-[10px] font-semibold text-gray-700 uppercase tracking-wide">Jurisdiction</Label>
                  <p className="text-sm font-medium text-gray-900 mt-1">{selectedIntake.jurisdiction}</p>
                </div>
              )}
              {selectedIntake.capital_range && (
                <div>
                  <Label className="text-[10px] font-semibold text-gray-700 uppercase tracking-wide">Capital Range</Label>
                  <p className="text-sm font-medium text-gray-900 mt-1">{selectedIntake.capital_range}</p>
                </div>
              )}
              <div>
                <Label className="text-[10px] font-semibold text-gray-700 uppercase tracking-wide">Acknowledgment</Label>
                <p className="text-sm font-medium mt-1">
                  {selectedIntake.acknowledgment_accepted ? (
                    <span className="text-green-600">Yes</span>
                  ) : (
                    <span className="text-red-600">No</span>
                  )}
                </p>
              </div>
              <div>
                <Label className="text-[10px] font-semibold text-gray-700 uppercase tracking-wide">Submitted</Label>
                <p className="text-[10px] text-gray-600 mt-1">
                  {new Date(selectedIntake.created_at).toLocaleString()}
                </p>
              </div>
            </div>

            {selectedIntake.admin_notes && (
              <div>
                <Label className="text-[10px] font-semibold text-gray-700 uppercase tracking-wide">Previous Admin Notes</Label>
                <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded-md mt-1">
                  {selectedIntake.admin_notes}
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="admin-notes" className="text-[10px] font-semibold text-gray-700 uppercase tracking-wide">Admin Notes</Label>
              <Textarea
                id="admin-notes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add notes about this request..."
                rows={3}
                className="mt-1 text-xs"
              />
            </div>

            <div className="flex gap-2 pt-2 border-t border-gray-200">
              <Button
                onClick={() => handleStatusUpdate(selectedIntake.id, 'approved')}
                size="sm"
                className="flex-1 h-7 px-2.5 text-xs bg-green-500 hover:bg-green-600"
                disabled={selectedIntake.status === 'approved'}
              >
                <CheckCircle2 className="mr-1.5 h-3 w-3" />
                Approve & Grant Access
              </Button>
              <Button
                onClick={() => handleStatusUpdate(selectedIntake.id, 'denied')}
                variant="destructive"
                size="sm"
                className="flex-1 h-7 px-2.5 text-xs"
                disabled={selectedIntake.status === 'denied'}
              >
                <XCircle className="mr-1.5 h-3 w-3" />
                Deny Access
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Investor Intake Review</h2>
          <p className="text-xs text-gray-500 mt-0.5">Manage investor interest submissions and approvals</p>
        </div>
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
          <SelectTrigger className="w-[140px] h-7 text-xs border-gray-300">
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

      {/* Stats - Compact */}
      <div className="grid grid-cols-4 gap-2">
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-3">
            <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">Total</p>
            <p className="text-xl font-semibold text-gray-900 leading-tight">{intakes.length}</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-3">
            <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">Pending</p>
            <p className="text-xl font-semibold text-yellow-600 leading-tight">{intakes.filter(i => i.status === 'pending').length}</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-3">
            <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">Approved</p>
            <p className="text-xl font-semibold text-green-600 leading-tight">{intakes.filter(i => i.status === 'approved').length}</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-3">
            <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">Denied</p>
            <p className="text-xl font-semibold text-red-600 leading-tight">{intakes.filter(i => i.status === 'denied').length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Dense Table */}
      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 border-b border-gray-200">
                  <TableHead className="px-3 py-2 text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Name</TableHead>
                  <TableHead className="px-3 py-2 text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Email</TableHead>
                  <TableHead className="px-3 py-2 text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Type</TableHead>
                  <TableHead className="px-3 py-2 text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Entity</TableHead>
                  <TableHead className="px-3 py-2 text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Status</TableHead>
                  <TableHead className="px-3 py-2 text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Submitted</TableHead>
                  <TableHead className="px-3 py-2 text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIntakes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-xs text-gray-500">
                      No intake requests found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredIntakes.map((intake) => (
                    <TableRow key={intake.id} className="hover:bg-gray-50">
                      <TableCell className="px-3 py-2 text-xs font-medium text-gray-900">{intake.full_name}</TableCell>
                      <TableCell className="px-3 py-2 text-xs text-gray-700">{intake.email}</TableCell>
                      <TableCell className="px-3 py-2 text-xs text-gray-700 capitalize">{intake.investor_type}</TableCell>
                      <TableCell className="px-3 py-2 text-xs text-gray-700">{intake.entity_name || '-'}</TableCell>
                      <TableCell className="px-3 py-2">{getStatusBadge(intake.status)}</TableCell>
                      <TableCell className="px-3 py-2 text-xs text-gray-600 font-mono">
                        {new Date(intake.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedIntake(intake)}
                          className="h-6 px-2 text-[10px]"
                        >
                          <Eye className="mr-1 h-3 w-3" />
                          Review
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
    </div>
  );
};

export default InvestorIntakeManager;
