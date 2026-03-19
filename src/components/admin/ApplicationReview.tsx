import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import DocumentViewer from './DocumentViewer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  MoreHorizontal,
  Eye,
  Send,
  Trash2,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  FileText,
  Download,
  RefreshCw,
  Filter,
  UserCheck,
  Shield,
} from 'lucide-react';
import { logApplicationAction } from '@/utils/auditLogger';
import { cn } from '@/lib/utils';

// ─── Status Config ──────────────────────────────────────────────────────────

type AppStatus = 'waitlist' | 'approved' | 'rejected' | 'started' | 'pending' | 'under_review' | 'activated';

const STATUS_CONFIG: Record<string, { label: string; color: string; badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ElementType }> = {
  waitlist:     { label: 'Waitlisted',    color: 'text-amber-600',  badgeVariant: 'secondary',    icon: Clock },
  pending:      { label: 'Pending',       color: 'text-amber-600',  badgeVariant: 'secondary',    icon: Clock },
  started:      { label: 'Started',       color: 'text-blue-600',   badgeVariant: 'outline',      icon: FileText },
  under_review: { label: 'Under Review',  color: 'text-purple-600', badgeVariant: 'outline',      icon: Eye },
  approved:     { label: 'Approved',      color: 'text-green-600',  badgeVariant: 'default',      icon: CheckCircle },
  activated:    { label: 'Activated',     color: 'text-green-700',  badgeVariant: 'default',      icon: UserCheck },
  rejected:     { label: 'Rejected',      color: 'text-red-600',    badgeVariant: 'destructive',  icon: XCircle },
};

const getStatusConfig = (status: string) =>
  STATUS_CONFIG[status] ?? { label: status, color: 'text-muted-foreground', badgeVariant: 'outline' as const, icon: AlertTriangle };

// ─── Types ──────────────────────────────────────────────────────────────────

interface Application {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  city: string;
  state: string;
  zip_code: string;
  vehicle_type: string;
  vehicle_make: string;
  vehicle_model: string;
  status: string;
  created_at: string;
  updated_at: string;
  region_id: number | null;
  points: number | null;
  background_check: boolean;
  background_check_approved_at: string | null;
  onboarding_completed_at: string | null;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  profile_photo?: string;
  drivers_license_front?: string | null;
  drivers_license_back?: string | null;
  vehicle_photo_front?: string | null;
  insurance_document?: string | null;
  w9_document?: string | null;
  signature_image_url?: string | null;
  regions?: { name: string } | null;
  is_seeded?: boolean;
  [key: string]: any;
}

type SortField = 'created_at' | 'first_name' | 'city' | 'status' | 'points';
type SortDir = 'asc' | 'desc';

// ─── Component ──────────────────────────────────────────────────────────────

const ApplicationReview: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailApp, setDetailApp] = useState<Application | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [documentViewer, setDocumentViewer] = useState({ isOpen: false, documentPath: '', documentName: '' });
  const { toast } = useToast();

  // ─── Data Fetching ──────────────────────────────────────────────────────

  const fetchApplications = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const { data, error } = await supabase
        .from('craver_applications')
        .select('*, regions(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications((data || []) as Application[]);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast({ title: 'Error', description: 'Failed to load applications', variant: 'destructive' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchApplications();
    const channel = supabase
      .channel('admin-applications-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'craver_applications' }, () => fetchApplications(true))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchApplications]);

  // ─── Filtering / Sorting ───────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = [...applications];

    if (statusFilter !== 'all') {
      if (statusFilter === 'needs_review') {
        list = list.filter(a => ['waitlist', 'pending', 'started'].includes(a.status));
      } else {
        list = list.filter(a => a.status === statusFilter);
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(a =>
        `${a.first_name} ${a.last_name}`.toLowerCase().includes(q) ||
        a.email?.toLowerCase().includes(q) ||
        a.phone?.includes(q) ||
        a.city?.toLowerCase().includes(q) ||
        a.state?.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'first_name': cmp = `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`); break;
        case 'city': cmp = (a.city || '').localeCompare(b.city || ''); break;
        case 'status': cmp = (a.status || '').localeCompare(b.status || ''); break;
        case 'points': cmp = (a.points || 0) - (b.points || 0); break;
        default: cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return list;
  }, [applications, statusFilter, searchQuery, sortField, sortDir]);

  // ─── Stats ────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const s = { total: applications.length, needsReview: 0, approved: 0, rejected: 0, waitlisted: 0 };
    applications.forEach(a => {
      if (['waitlist', 'pending', 'started'].includes(a.status)) s.needsReview++;
      if (a.status === 'waitlist') s.waitlisted++;
      if (a.status === 'approved' || a.status === 'activated') s.approved++;
      if (a.status === 'rejected') s.rejected++;
    });
    return s;
  }, [applications]);

  // ─── Actions ──────────────────────────────────────────────────────────

  const handleApprove = async (id: string, notes: string) => {
    setActionLoading(true);
    try {
      const app = applications.find(a => a.id === id);
      if (!app) throw new Error('Application not found');

      const { error } = await supabase
        .from('craver_applications')
        .update({
          background_check: true,
          background_check_approved_at: new Date().toISOString(),
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewer_notes: notes || 'Approved by admin',
        })
        .eq('id', id);
      if (error) throw error;

      // Try sending email
      try {
        await supabase.functions.invoke('send-driver-welcome-email', {
          body: { driverName: `${app.first_name} ${app.last_name}`, driverEmail: app.email, isBackgroundCheckApproval: true },
        });
      } catch { /* email send is best-effort */ }

      toast({ title: 'Application Approved ✅', description: `${app.first_name} ${app.last_name} has been approved.` });
      setDetailApp(null);
      fetchApplications(true);
    } catch (error) {
      console.error('Error approving:', error);
      toast({ title: 'Error', description: 'Failed to approve application', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (id: string, notes: string) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('craver_applications')
        .update({ status: 'rejected', reviewed_at: new Date().toISOString(), reviewer_notes: notes })
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'Application Rejected', description: 'The application has been rejected.', variant: 'destructive' });
      setDetailApp(null);
      fetchApplications(true);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to reject application', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setActionLoading(true);
    try {
      const app = applications.find(a => a.id === id);
      if (!app) throw new Error('Not found');
      const { error } = await supabase.from('craver_applications').delete().eq('id', id);
      if (error) throw error;
      await logApplicationAction('delete', id, `${app.first_name} ${app.last_name}`, { email: app.email, status: app.status });
      toast({ title: 'Application Deleted', description: `Deleted ${app.first_name} ${app.last_name}.` });
      setDetailApp(null);
      fetchApplications(true);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete application', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('craver_applications')
        .update({ status: 'approved', reviewed_at: new Date().toISOString(), reviewer_notes: 'Bulk approved by admin' })
        .in('id', Array.from(selectedIds));
      if (error) throw error;
      toast({ title: 'Bulk Approved', description: `${selectedIds.size} application(s) approved.` });
      setSelectedIds(new Set());
      fetchApplications(true);
    } catch {
      toast({ title: 'Error', description: 'Bulk approve failed', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Selection ────────────────────────────────────────────────────────

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(a => a.id)));
    }
  };

  // ─── Sort Header ─────────────────────────────────────────────────────

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead
      className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
      onClick={() => {
        if (sortField === field) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
        else { setSortField(field); setSortDir('asc'); }
      }}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field && (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
      </div>
    </TableHead>
  );

  // ─── Format helpers ───────────────────────────────────────────────────

  const fmtDate = (d?: string | null) => {
    if (!d) return '—';
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const docCount = (app: Application) => {
    const docs = [app.profile_photo, app.drivers_license_front, app.drivers_license_back, app.insurance_document, app.w9_document, app.vehicle_photo_front, app.signature_image_url];
    return docs.filter(Boolean).length;
  };

  // ─── Unique statuses for filter dropdown ──────────────────────────────

  const uniqueStatuses = useMemo(() => {
    const s = new Set(applications.map(a => a.status));
    return Array.from(s).sort();
  }, [applications]);

  // ─── Loading ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent mx-auto" />
          <p className="text-sm text-muted-foreground">Loading applications…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Feeder Applications</h2>
          <p className="text-sm text-muted-foreground mt-1">Review, approve, and manage driver applications</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchApplications(true)} disabled={refreshing}>
          <RefreshCw className={cn('h-4 w-4 mr-2', refreshing && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('all')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('needs_review')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Needs Review</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-amber-600">{stats.needsReview}</div></CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('approved')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-600">{stats.approved}</div></CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('rejected')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-red-600">{stats.rejected}</div></CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, phone, city…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <SelectValue placeholder="Filter by status" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="needs_review">⏳ Needs Review</SelectItem>
            {uniqueStatuses.map(s => (
              <SelectItem key={s} value={s}>
                {getStatusConfig(s).label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{selectedIds.size} selected</Badge>
            <Button size="sm" onClick={handleBulkApprove} disabled={actionLoading} className="bg-green-600 hover:bg-green-700 text-white">
              <CheckCircle className="h-3.5 w-3.5 mr-1" />
              Approve Selected
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Clear</Button>
          </div>
        )}
      </div>

      {/* Table */}
      <Card>
        <ScrollArea className="w-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={filtered.length > 0 && selectedIds.size === filtered.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <SortHeader field="first_name">Applicant</SortHeader>
                <SortHeader field="city">Location</SortHeader>
                <SortHeader field="status">Status</SortHeader>
                <TableHead>Vehicle</TableHead>
                <TableHead>Docs</TableHead>
                <TableHead>BG Check</TableHead>
                <SortHeader field="points">Points</SortHeader>
                <SortHeader field="created_at">Applied</SortHeader>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                    {searchQuery || statusFilter !== 'all' ? 'No applications match your filters.' : 'No applications found.'}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(app => {
                  const sc = getStatusConfig(app.status);
                  const docs = docCount(app);
                  return (
                    <TableRow
                      key={app.id}
                      className={cn('cursor-pointer hover:bg-muted/50 transition-colors', selectedIds.has(app.id) && 'bg-primary/5')}
                      onClick={() => setDetailApp(app)}
                    >
                      <TableCell onClick={e => e.stopPropagation()}>
                        <Checkbox checked={selectedIds.has(app.id)} onCheckedChange={() => toggleSelect(app.id)} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold", app.is_seeded ? "bg-orange-100 text-orange-600" : "bg-muted text-muted-foreground")}>
                            {app.first_name?.[0]}{app.last_name?.[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{app.first_name} {app.last_name}</p>
                            <p className="text-xs text-muted-foreground truncate">{app.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{app.city}{app.state ? `, ${app.state}` : ''}</span>
                        {app.regions?.name && <p className="text-xs text-muted-foreground">{app.regions.name}</p>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={sc.badgeVariant} className="text-xs">{sc.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm capitalize">{app.vehicle_type || '—'}</span>
                        {app.vehicle_make && <p className="text-xs text-muted-foreground">{app.vehicle_make} {app.vehicle_model}</p>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm">{docs}/7</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {app.background_check_approved_at ? (
                          <Badge variant="default" className="text-xs bg-green-600">Cleared</Badge>
                        ) : app.background_check ? (
                          <Badge variant="secondary" className="text-xs">Initiated</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not started</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">{app.points ?? 0}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{fmtDate(app.created_at)}</span>
                      </TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setDetailApp(app)}>
                              <Eye className="h-4 w-4 mr-2" /> View Details
                            </DropdownMenuItem>
                            {app.status !== 'approved' && (
                              <DropdownMenuItem onClick={() => handleApprove(app.id, '')}>
                                <CheckCircle className="h-4 w-4 mr-2 text-green-600" /> Approve
                              </DropdownMenuItem>
                            )}
                            {app.status !== 'rejected' && (
                              <DropdownMenuItem onClick={() => handleReject(app.id, '')}>
                                <XCircle className="h-4 w-4 mr-2 text-red-600" /> Reject
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDelete(app.id)} className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </ScrollArea>
        <div className="border-t px-4 py-3 flex items-center justify-between text-sm text-muted-foreground">
          <span>Showing {filtered.length} of {applications.length} applications</span>
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </Card>

      {/* Detail Drawer Dialog */}
      <Dialog open={!!detailApp} onOpenChange={open => { if (!open) { setDetailApp(null); setReviewNotes(''); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {detailApp && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
                    {detailApp.first_name?.[0]}{detailApp.last_name?.[0]}
                  </div>
                  <div>
                    <span>{detailApp.first_name} {detailApp.last_name}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={getStatusConfig(detailApp.status).badgeVariant}>{getStatusConfig(detailApp.status).label}</Badge>
                      {detailApp.regions?.name && <Badge variant="outline" className="text-xs">{detailApp.regions.name}</Badge>}
                    </div>
                  </div>
                </DialogTitle>
                <DialogDescription>Applied {fmtDate(detailApp.created_at)} • {detailApp.email}</DialogDescription>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Contact & Location */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium ml-1">{detailApp.phone || '—'}</span></div>
                  <div><span className="text-muted-foreground">DOB:</span> <span className="font-medium ml-1">{fmtDate(detailApp.date_of_birth)}</span></div>
                  <div><span className="text-muted-foreground">Location:</span> <span className="font-medium ml-1">{detailApp.city}, {detailApp.state} {detailApp.zip_code}</span></div>
                  <div><span className="text-muted-foreground">Points:</span> <span className="font-medium ml-1">{detailApp.points ?? 0}</span></div>
                </div>

                {/* Vehicle */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold mb-2">Vehicle Information</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Type:</span> <span className="ml-1 capitalize">{detailApp.vehicle_type || '—'}</span></div>
                    <div><span className="text-muted-foreground">Make/Model:</span> <span className="ml-1">{detailApp.vehicle_make} {detailApp.vehicle_model}</span></div>
                    <div><span className="text-muted-foreground">License Plate:</span> <span className="ml-1">{detailApp.license_plate || '—'}</span></div>
                    <div><span className="text-muted-foreground">Color:</span> <span className="ml-1">{detailApp.vehicle_color || '—'}</span></div>
                  </div>
                </div>

                {/* Documents */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold mb-3">Documents ({docCount(detailApp)}/7)</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { key: 'profile_photo', label: 'Profile Photo' },
                      { key: 'drivers_license_front', label: 'DL Front' },
                      { key: 'drivers_license_back', label: 'DL Back' },
                      { key: 'insurance_document', label: 'Insurance' },
                      { key: 'w9_document', label: 'W-9 Form' },
                      { key: 'vehicle_photo_front', label: 'Vehicle Photo' },
                      { key: 'signature_image_url', label: 'ICA Signature' },
                    ].map(doc => (
                      <Button
                        key={doc.key}
                        variant="outline"
                        size="sm"
                        disabled={!detailApp[doc.key]}
                        onClick={() => {
                          if (detailApp[doc.key]) {
                            setDocumentViewer({ isOpen: true, documentPath: detailApp[doc.key], documentName: doc.label });
                          }
                        }}
                        className="justify-start text-xs"
                      >
                        {detailApp[doc.key] ? <Eye className="h-3 w-3 mr-1.5 text-green-600" /> : <FileText className="h-3 w-3 mr-1.5 text-muted-foreground" />}
                        {doc.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Background Check */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Shield className="h-4 w-4" /> Background Check
                  </h4>
                  {detailApp.background_check_approved_at ? (
                    <Badge variant="default" className="bg-green-600">Cleared — {fmtDate(detailApp.background_check_approved_at)}</Badge>
                  ) : detailApp.background_check ? (
                    <Badge variant="secondary">Initiated</Badge>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not started</p>
                  )}
                </div>

                {/* Previous Review Notes */}
                {detailApp.reviewer_notes && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-semibold mb-2">Previous Review Notes</h4>
                    <p className="text-sm bg-muted p-3 rounded-md">{detailApp.reviewer_notes}</p>
                    {detailApp.reviewed_at && <p className="text-xs text-muted-foreground mt-1">Reviewed: {fmtDate(detailApp.reviewed_at)}</p>}
                  </div>
                )}

                {/* Review Actions */}
                {detailApp.status !== 'approved' && detailApp.status !== 'rejected' && (
                  <div className="border-t pt-4 space-y-3">
                    <div>
                      <Label htmlFor="review-notes" className="text-sm font-semibold">Review Notes</Label>
                      <Textarea
                        id="review-notes"
                        placeholder="Add notes about your review decision…"
                        value={reviewNotes}
                        onChange={e => setReviewNotes(e.target.value)}
                        className="mt-1.5"
                        rows={3}
                      />
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
                {detailApp.status !== 'approved' && (
                  <Button
                    onClick={() => handleApprove(detailApp.id, reviewNotes)}
                    disabled={actionLoading}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" /> Approve
                  </Button>
                )}
                {detailApp.status !== 'rejected' && (
                  <Button variant="destructive" onClick={() => handleReject(detailApp.id, reviewNotes)} disabled={actionLoading}>
                    <XCircle className="h-4 w-4 mr-2" /> Reject
                  </Button>
                )}
                {detailApp.status === 'approved' && (
                  <Button variant="outline" onClick={async () => {
                    try {
                      await supabase.functions.invoke('send-approval-email', {
                        body: { driverName: `${detailApp.first_name} ${detailApp.last_name}`, driverEmail: detailApp.email, applicationId: detailApp.id },
                      });
                      toast({ title: 'Email Sent', description: 'Approval email sent.' });
                    } catch {
                      toast({ title: 'Error', description: 'Failed to send email', variant: 'destructive' });
                    }
                  }}>
                    <Send className="h-4 w-4 mr-2" /> Send Approval Email
                  </Button>
                )}
                <Button
                  variant="ghost"
                  onClick={() => handleDelete(detailApp.id)}
                  disabled={actionLoading}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Document Viewer */}
      <DocumentViewer
        isOpen={documentViewer.isOpen}
        onClose={() => setDocumentViewer({ isOpen: false, documentPath: '', documentName: '' })}
        documentPath={documentViewer.documentPath}
        documentName={documentViewer.documentName}
      />
    </div>
  );
};

export default ApplicationReview;
