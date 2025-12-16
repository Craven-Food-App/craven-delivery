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
import { Loader2, CheckCircle2, XCircle, Clock, ExternalLink } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface InvestorAccessRequest {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  investor_type: string;
  organization: string | null;
  location: string | null;
  linkedin_url: string | null;
  notes: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  admin_notes: string | null;
}

const InvestorAccessManager: React.FC = () => {
  const [requests, setRequests] = useState<InvestorAccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<InvestorAccessRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchRequests();
  }, [filterStatus]);

  const fetchRequests = async () => {
    try {
      let query = supabase
        .from('investor_access_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      console.error('Error fetching requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load investor access requests',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (requestId: string, newStatus: 'approved' | 'rejected') => {
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

      // Update the request
      const { error: requestError } = await supabase
        .from('investor_access_requests')
        .update({
          status: newStatus,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          admin_notes: adminNotes || null,
        })
        .eq('id', requestId);

      if (requestError) throw requestError;

      // Update investor profile if user_id exists
      const request = requests.find(r => r.id === requestId);
      if (request?.user_id) {
        const { error: profileError } = await supabase
          .from('investor_profiles')
          .upsert({
            user_id: request.user_id,
            access_status: newStatus === 'approved' ? 'approved' : 'rejected',
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id',
          });

        if (profileError) {
          console.error('Error updating investor profile:', profileError);
        }
      }

      toast({
        title: 'Success',
        description: `Request ${newStatus === 'approved' ? 'approved' : 'rejected'}`,
      });

      setSelectedRequest(null);
      setAdminNotes('');
      fetchRequests();
    } catch (error: any) {
      console.error('Error updating request:', error);
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
      case 'rejected':
        return <Badge className="bg-red-500">Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-500">Pending</Badge>;
    }
  };

  const filteredRequests = filterStatus === 'all' 
    ? requests 
    : requests.filter(r => r.status === filterStatus);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (selectedRequest) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => setSelectedRequest(null)}>
          ← Back to List
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Investor Access Request Details</CardTitle>
            <CardDescription>
              Review and approve or reject investor access requests
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Full Name</Label>
                <p className="font-medium">{selectedRequest.full_name}</p>
              </div>
              <div>
                <Label>Email</Label>
                <p className="font-medium">{selectedRequest.email}</p>
              </div>
              <div>
                <Label>Investor Type</Label>
                <p className="font-medium capitalize">{selectedRequest.investor_type}</p>
              </div>
              <div>
                <Label>Status</Label>
                <div className="mt-1">{getStatusBadge(selectedRequest.status)}</div>
              </div>
              {selectedRequest.organization && (
                <div>
                  <Label>Organization</Label>
                  <p className="font-medium">{selectedRequest.organization}</p>
                </div>
              )}
              {selectedRequest.location && (
                <div>
                  <Label>Location</Label>
                  <p className="font-medium">{selectedRequest.location}</p>
                </div>
              )}
              {selectedRequest.linkedin_url && (
                <div className="col-span-2">
                  <Label>LinkedIn</Label>
                  <div>
                    <a 
                      href={selectedRequest.linkedin_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-orange-500 hover:underline flex items-center gap-1"
                    >
                      {selectedRequest.linkedin_url}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              )}
              <div className="col-span-2">
                <Label>Notes / Investment Thesis</Label>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedRequest.notes || 'No notes provided'}
                </p>
              </div>
              <div>
                <Label>Requested</Label>
                <p className="text-sm text-gray-600">
                  {new Date(selectedRequest.created_at).toLocaleString()}
                </p>
              </div>
              {selectedRequest.reviewed_at && (
                <div>
                  <Label>Reviewed</Label>
                  <p className="text-sm text-gray-600">
                    {new Date(selectedRequest.reviewed_at).toLocaleString()}
                  </p>
                </div>
              )}
            </div>

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
                onClick={() => handleStatusUpdate(selectedRequest.id, 'approved')}
                className="bg-green-500 hover:bg-green-600"
                disabled={selectedRequest.status === 'approved'}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Approve
              </Button>
              <Button
                onClick={() => handleStatusUpdate(selectedRequest.id, 'rejected')}
                variant="destructive"
                disabled={selectedRequest.status === 'rejected'}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject
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
          <h2 className="text-2xl font-bold">Investor Access Requests</h2>
          <p className="text-gray-600">Manage investor access requests and approvals</p>
        </div>
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
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
                <TableHead>Organization</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No requests found
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{request.full_name}</TableCell>
                    <TableCell>{request.email}</TableCell>
                    <TableCell className="capitalize">{request.investor_type}</TableCell>
                    <TableCell>{request.organization || '-'}</TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {new Date(request.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedRequest(request)}
                      >
                        View Details
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
        <p><strong>Total Requests:</strong> {requests.length}</p>
        <p><strong>Pending:</strong> {requests.filter(r => r.status === 'pending').length}</p>
        <p><strong>Approved:</strong> {requests.filter(r => r.status === 'approved').length}</p>
        <p><strong>Rejected:</strong> {requests.filter(r => r.status === 'rejected').length}</p>
      </div>
    </div>
  );
};

export default InvestorAccessManager;

