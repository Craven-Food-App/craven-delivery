import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ArrowLeft, Mail, Eye, EyeOff, Users, TrendingUp, Copy, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface InvestorAccess {
  id: string;
  email: string;
  full_name: string | null;
  organization: string | null;
  access_token: string;
  status: 'invited' | 'active' | 'revoked' | 'expired';
  invited_at: string;
  last_accessed_at: string | null;
  access_count: number;
  expires_at: string;
  notes: string | null;
}

interface Analytics {
  email: string;
  full_name: string | null;
  organization: string | null;
  status: string;
  access_count: number;
  customer_views: number;
  merchant_views: number;
  driver_views: number;
  total_views: number;
  last_view_at: string | null;
}

export default function HubInvestorDemoManagement() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [accessList, setAccessList] = useState<InvestorAccess[]>([]);
  const [analytics, setAnalytics] = useState<Analytics[]>([]);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [sending, setSending] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Form state
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [organization, setOrganization] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);

      // Load access list
      const { data: accessData, error: accessError } = await supabase
        .from('investor_demo_access')
        .select('*')
        .order('invited_at', { ascending: false });

      if (accessError) throw accessError;
      setAccessList(accessData || []);

      // Load analytics
      const { data: analyticsData, error: analyticsError } = await supabase
        .from('investor_demo_analytics')
        .select('*')
        .order('last_view_at', { ascending: false });

      if (analyticsError) {
        console.warn('Analytics not available:', analyticsError);
      } else {
        setAnalytics(analyticsData || []);
      }

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function sendInvite() {
    if (!email.trim()) {
      toast.error('Email is required');
      return;
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }

    try {
      setSending(true);

      const { data, error } = await supabase.functions.invoke('send-investor-demo-invite', {
        body: {
          email: email.trim(),
          fullName: fullName.trim() || null,
          organization: organization.trim() || null,
          notes: notes.trim() || null,
        },
      });

      if (error) {
        console.error('Invite error:', error);
        throw new Error(error.message || 'Failed to send invite');
      }

      toast.success(`Invite sent to ${email.trim()}`);
      setShowInviteDialog(false);
      
      // Reset form
      setEmail('');
      setFullName('');
      setOrganization('');
      setNotes('');
      
      // Reload data
      await loadData();

    } catch (error: any) {
      console.error('Error sending invite:', error);
      toast.error(error.message || 'Failed to send invite');
    } finally {
      setSending(false);
    }
  }

  async function revokeAccess(id: string, email: string) {
    if (!confirm(`Revoke access for ${email}? They will no longer be able to access the demo.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('investor_demo_access')
        .update({ status: 'revoked' })
        .eq('id', id);

      if (error) throw error;

      toast.success('Access revoked');
      await loadData();

    } catch (error) {
      console.error('Error revoking access:', error);
      toast.error('Failed to revoke access');
    }
  }

  async function copyMagicLink(token: string) {
    const appUrl = window.location.origin;
    const magicLink = `${appUrl}/investor-demo?token=${token}`;
    
    try {
      await navigator.clipboard.writeText(magicLink);
      setCopiedToken(token);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopiedToken(null), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'invited':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><Clock className="w-3 h-3 mr-1" />Invited</Badge>;
      case 'active':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" />Active</Badge>;
      case 'revoked':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="w-3 h-3 mr-1" />Revoked</Badge>;
      case 'expired':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200"><Clock className="w-3 h-3 mr-1" />Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  function formatDate(dateString: string | null) {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  const totalInvites = accessList.length;
  const activeAccess = accessList.filter(a => a.status === 'active').length;
  const totalViews = analytics.reduce((sum, a) => sum + (a.total_views || 0), 0);
  const avgViewsPerInvestor = totalInvites > 0 ? (totalViews / totalInvites).toFixed(1) : '0';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/hub')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Hub
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Investor Demo Portal</h1>
              <p className="text-slate-600 mt-1">Manage investor access & track engagement</p>
            </div>
          </div>
          <Button
            onClick={() => setShowInviteDialog(true)}
            className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
          >
            <Mail className="w-4 h-4 mr-2" />
            Send Invite
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Total Invites</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{totalInvites}</div>
              <p className="text-xs text-slate-500 mt-1">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Active Access</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{activeAccess}</div>
              <p className="text-xs text-slate-500 mt-1">Currently active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Total Views</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{totalViews}</div>
              <p className="text-xs text-slate-500 mt-1">Platform interactions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Avg. Views</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{avgViewsPerInvestor}</div>
              <p className="text-xs text-slate-500 mt-1">Per investor</p>
            </CardContent>
          </Card>
        </div>

        {/* Access List */}
        <Card>
          <CardHeader>
            <CardTitle>Investor Access List</CardTitle>
            <CardDescription>Manage and track investor demo access</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-slate-500">Loading...</div>
            ) : accessList.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No invites sent yet</p>
                <Button
                  variant="outline"
                  onClick={() => setShowInviteDialog(true)}
                  className="mt-4"
                >
                  Send First Invite
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Investor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Access</TableHead>
                      <TableHead>Views</TableHead>
                      <TableHead>Invited</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accessList.map((access) => {
                      const analytic = analytics.find(a => a.email === access.email);
                      return (
                        <TableRow key={access.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium text-slate-900">
                                {access.full_name || access.email}
                              </div>
                              {access.full_name && (
                                <div className="text-sm text-slate-500">{access.email}</div>
                              )}
                              {access.organization && (
                                <div className="text-xs text-slate-400">{access.organization}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(access.status)}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="text-slate-900 font-medium">{access.access_count}x</div>
                              {access.last_accessed_at && (
                                <div className="text-xs text-slate-500">
                                  Last: {formatDate(access.last_accessed_at)}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {analytic && (
                              <div className="text-xs space-y-1">
                                <div className="text-slate-600">C: {analytic.customer_views} | M: {analytic.merchant_views} | D: {analytic.driver_views}</div>
                                <div className="font-medium text-slate-900">Total: {analytic.total_views}</div>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-slate-600">
                            {formatDate(access.invited_at)}
                          </TableCell>
                          <TableCell className="text-sm text-slate-600">
                            {formatDate(access.expires_at)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyMagicLink(access.access_token)}
                                className="h-8"
                              >
                                {copiedToken === access.access_token ? (
                                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </Button>
                              {access.status !== 'revoked' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => revokeAccess(access.id, access.email)}
                                  className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invite Dialog */}
        <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Send Investor Demo Invite</DialogTitle>
              <DialogDescription>
                Grant access to the platform demo. They'll receive a magic link via email.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="investor@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={sending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  placeholder="John Smith"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={sending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="organization">Organization</Label>
                <Input
                  id="organization"
                  placeholder="Acme Ventures"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  disabled={sending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Internal Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Series A lead, interested in logistics tech..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={sending}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowInviteDialog(false)}
                disabled={sending}
              >
                Cancel
              </Button>
              <Button
                onClick={sendInvite}
                disabled={sending}
                className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
              >
                {sending ? 'Sending...' : 'Send Invite'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

