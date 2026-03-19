import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import {
  Loader2, CheckCircle, XCircle, Clock, Shield, Search,
  User, Mail, Phone, MapPin, Car, FileText, ChevronDown,
  ChevronUp, Eye, AlertTriangle, Download, RefreshCw
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

interface Application {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  vehicle_type: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  license_number: string;
  license_state: string;
  license_expiry: string;
  status: string;
  background_check: boolean;
  background_check_consent: boolean;
  background_check_approved_at: string | null;
  created_at: string;
  reviewer_notes: string | null;
  ssn_last_four: string | null;
  is_seeded?: boolean;
}

type FilterTab = 'needs_review' | 'approved' | 'rejected' | 'all';
type SortField = 'name' | 'date' | 'location' | 'status';
type SortDir = 'asc' | 'desc';

type IconComponent = React.ComponentType<{ className?: string }>;

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: IconComponent }> = {
  needs_review: { label: 'Needs Review', color: 'text-amber-700', bgColor: 'bg-amber-50 border-amber-200', icon: Clock },
  approved: { label: 'Cleared', color: 'text-emerald-700', bgColor: 'bg-emerald-50 border-emerald-200', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'text-red-700', bgColor: 'bg-red-50 border-red-200', icon: XCircle },
};

export default function BackgroundCheckDashboard() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('needs_review');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchApplications();
    const channel = supabase
      .channel('bg-check-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'craver_applications' }, () => fetchApplications())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchApplications = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const { data, error } = await supabase
        .from('craver_applications')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setApplications((data || []) as Application[]);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to load background check data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getAppBgStatus = (app: Application): string => {
    if (app.status === 'rejected') return 'rejected';
    if (app.background_check && app.background_check_approved_at) return 'approved';
    return 'needs_review';
  };

  const counts = useMemo(() => {
    const c = { needs_review: 0, approved: 0, rejected: 0, all: 0 };
    applications.forEach(app => {
      const s = getAppBgStatus(app);
      c[s as keyof typeof c]++;
      c.all++;
    });
    return c;
  }, [applications]);

  const filtered = useMemo(() => {
    let list = applications;

    // Tab filter
    if (activeTab !== 'all') {
      list = list.filter(app => getAppBgStatus(app) === activeTab);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(app =>
        `${app.first_name} ${app.last_name}`.toLowerCase().includes(q) ||
        app.email?.toLowerCase().includes(q) ||
        app.phone?.toLowerCase().includes(q) ||
        `${app.city} ${app.state}`.toLowerCase().includes(q)
      );
    }

    // Sort
    list = [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name': cmp = `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`); break;
        case 'date': cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime(); break;
        case 'location': cmp = `${a.city} ${a.state}`.localeCompare(`${b.city} ${b.state}`); break;
        case 'status': cmp = getAppBgStatus(a).localeCompare(getAppBgStatus(b)); break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return list;
  }, [applications, activeTab, search, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronDown className="w-3 h-3 opacity-30" />;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  const approveBackgroundCheck = async (app: Application) => {
    setProcessingId(app.id);
    try {
      const { error } = await supabase
        .from('craver_applications')
        .update({
          background_check: true,
          background_check_approved_at: new Date().toISOString(),
          status: 'approved',
          reviewer_notes: reviewNotes.trim() || 'Background check approved by admin'
        })
        .eq('id', app.id);
      if (error) throw error;

      try {
        await supabase.functions.invoke('send-driver-welcome-email', {
          body: { driverName: `${app.first_name} ${app.last_name}`, driverEmail: app.email, isBackgroundCheckApproval: true },
        });
      } catch (e) { console.error('Email error:', e); }

      toast.success(`${app.first_name} ${app.last_name} approved & notified`);
      setSelectedApp(null);
      setReviewNotes('');
      fetchApplications();
    } catch (error) {
      console.error('Error approving:', error);
      toast.error('Failed to approve background check');
    } finally {
      setProcessingId(null);
    }
  };

  const rejectBackgroundCheck = async (app: Application) => {
    if (!reviewNotes.trim()) {
      toast.error('Please add notes explaining the rejection');
      return;
    }
    setProcessingId(app.id);
    try {
      const { error } = await supabase
        .from('craver_applications')
        .update({ background_check: false, status: 'rejected', reviewer_notes: reviewNotes })
        .eq('id', app.id);
      if (error) throw error;

      toast.success(`${app.first_name} ${app.last_name} rejected`);
      setSelectedApp(null);
      setReviewNotes('');
      fetchApplications();
    } catch (error) {
      console.error('Error rejecting:', error);
      toast.error('Failed to reject');
    } finally {
      setProcessingId(null);
    }
  };

  const exportCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Location', 'Status', 'Applied', 'Approved Date'];
    const rows = filtered.map(app => [
      `${app.first_name} ${app.last_name}`,
      app.email,
      app.phone,
      `${app.city}, ${app.state}`,
      getAppBgStatus(app),
      format(new Date(app.created_at), 'yyyy-MM-dd'),
      app.background_check_approved_at ? format(new Date(app.background_check_approved_at), 'yyyy-MM-dd') : ''
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `background-checks-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const kpiCards: { key: FilterTab; label: string; count: number; icon: IconComponent; color: string; accent: string }[] = [
    { key: 'needs_review', label: 'Needs Review', count: counts.needs_review, icon: Clock, color: 'text-amber-600', accent: 'border-l-amber-500' },
    { key: 'approved', label: 'Cleared', count: counts.approved, icon: Shield, color: 'text-emerald-600', accent: 'border-l-emerald-500' },
    { key: 'rejected', label: 'Rejected', count: counts.rejected, icon: XCircle, color: 'text-red-600', accent: 'border-l-red-500' },
    { key: 'all', label: 'Total', count: counts.all, icon: FileText, color: 'text-foreground', accent: 'border-l-primary' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Background Check Management
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Review, approve, and manage Feeder background verifications
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchApplications(true)} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map(card => (
          <Card
            key={card.key}
            className={`cursor-pointer transition-all border-l-4 ${card.accent} ${activeTab === card.key ? 'ring-2 ring-primary/30 shadow-md' : 'hover:shadow-sm'}`}
            onClick={() => setActiveTab(card.key)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{card.label}</span>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
              <div className={`text-2xl font-bold ${card.color}`}>{card.count}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, phone, or location..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 bg-muted p-1 rounded-lg">
          {(['needs_review', 'approved', 'rejected', 'all'] as FilterTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === tab
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'needs_review' ? 'Needs Review' : tab === 'all' ? 'All' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              <span className="ml-1 opacity-60">({counts[tab]})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('name')}>
                  <div className="flex items-center gap-1">Applicant <SortIcon field="name" /></div>
                </TableHead>
                <TableHead className="hidden md:table-cell">Contact</TableHead>
                <TableHead className="cursor-pointer select-none hidden sm:table-cell" onClick={() => toggleSort('location')}>
                  <div className="flex items-center gap-1">Location <SortIcon field="location" /></div>
                </TableHead>
                <TableHead className="hidden lg:table-cell">Vehicle</TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('status')}>
                  <div className="flex items-center gap-1">Status <SortIcon field="status" /></div>
                </TableHead>
                <TableHead className="cursor-pointer select-none hidden sm:table-cell" onClick={() => toggleSort('date')}>
                  <div className="flex items-center gap-1">Applied <SortIcon field="date" /></div>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    {search ? 'No results match your search' : 'No applications in this category'}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(app => {
                  const bgStatus = getAppBgStatus(app);
                  const config = STATUS_CONFIG[bgStatus];
                  const StatusIcon = config.icon;
                  const daysSinceApplied = differenceInDays(new Date(), new Date(app.created_at));

                  return (
                    <TableRow key={app.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${app.is_seeded ? 'bg-orange-100 text-orange-600' : 'bg-primary/10 text-primary'}`}>
                            {app.first_name?.[0]}{app.last_name?.[0]}
                          </div>
                          <div>
                            <div className="font-medium text-sm">{app.first_name} {app.last_name}</div>
                            {app.ssn_last_four && (
                              <div className="text-xs text-muted-foreground">SSN: •••{app.ssn_last_four}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="text-xs space-y-0.5">
                          <div className="flex items-center gap-1 text-muted-foreground"><Mail className="w-3 h-3" />{app.email}</div>
                          <div className="flex items-center gap-1 text-muted-foreground"><Phone className="w-3 h-3" />{app.phone}</div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          {app.city}, {app.state}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Car className="w-3 h-3" />
                          {app.vehicle_year} {app.vehicle_make} {app.vehicle_model}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${config.bgColor} ${config.color} border text-xs`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {config.label}
                        </Badge>
                        {bgStatus === 'needs_review' && daysSinceApplied > 7 && (
                          <div className="flex items-center gap-1 text-[10px] text-amber-600 mt-1">
                            <AlertTriangle className="w-3 h-3" />
                            {daysSinceApplied}d waiting
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {format(new Date(app.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setSelectedApp(app); setReviewNotes(app.reviewer_notes || ''); }}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t text-xs text-muted-foreground">
            Showing {filtered.length} of {applications.length} applications
          </div>
        )}
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!selectedApp} onOpenChange={open => { if (!open) { setSelectedApp(null); setReviewNotes(''); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedApp && (() => {
            const bgStatus = getAppBgStatus(selectedApp);
            const config = STATUS_CONFIG[bgStatus];
            const StatusIcon = config.icon;
            const isProcessing = processingId === selectedApp.id;

            return (
              <>
                <DialogHeader>
                  <div className="flex items-center justify-between">
                    <DialogTitle className="flex items-center gap-2 text-lg">
                      <Shield className="w-5 h-5 text-primary" />
                      Background Check Review
                    </DialogTitle>
                    <Badge variant="outline" className={`${config.bgColor} ${config.color} border`}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {config.label}
                    </Badge>
                  </div>
                </DialogHeader>

                <div className="space-y-5 mt-2">
                  {/* Applicant Info */}
                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                      {selectedApp.first_name?.[0]}{selectedApp.last_name?.[0]}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-lg">{selectedApp.first_name} {selectedApp.last_name}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-3 flex-wrap">
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{selectedApp.email}</span>
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{selectedApp.phone}</span>
                      </div>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <DetailItem icon={User} label="Date of Birth" value={selectedApp.date_of_birth ? format(new Date(selectedApp.date_of_birth), 'PP') : 'N/A'} />
                    <DetailItem icon={MapPin} label="Address" value={`${selectedApp.street_address || ''}, ${selectedApp.city}, ${selectedApp.state} ${selectedApp.zip_code}`} />
                    <DetailItem icon={FileText} label="License" value={`${selectedApp.license_state || ''} - ${selectedApp.license_number || 'N/A'}`} />
                    <DetailItem icon={FileText} label="License Expiry" value={selectedApp.license_expiry ? format(new Date(selectedApp.license_expiry), 'PP') : 'N/A'} />
                    <DetailItem icon={Car} label="Vehicle" value={`${selectedApp.vehicle_year || ''} ${selectedApp.vehicle_make || ''} ${selectedApp.vehicle_model || ''}`} />
                    <DetailItem icon={Car} label="Vehicle Type" value={selectedApp.vehicle_type || 'N/A'} />
                    {selectedApp.ssn_last_four && (
                      <DetailItem icon={Shield} label="SSN (Last 4)" value={`•••${selectedApp.ssn_last_four}`} />
                    )}
                    <DetailItem icon={Shield} label="BG Consent" value={selectedApp.background_check_consent ? 'Yes ✓' : 'No ✗'} />
                  </div>

                  {/* Timeline */}
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Timeline</div>
                    <TimelineRow label="Applied" value={format(new Date(selectedApp.created_at), 'PPp')} />
                    {selectedApp.background_check_approved_at && (
                      <TimelineRow label={bgStatus === 'rejected' ? 'Rejected' : 'Approved'} value={format(new Date(selectedApp.background_check_approved_at), 'PPp')} />
                    )}
                    <TimelineRow label="Days Since Applied" value={`${differenceInDays(new Date(), new Date(selectedApp.created_at))} days`} />
                  </div>

                  {/* Existing Notes */}
                  {selectedApp.reviewer_notes && bgStatus !== 'needs_review' && (
                    <div className={`rounded-lg p-4 border ${bgStatus === 'rejected' ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                      <div className="text-xs font-semibold mb-1">Admin Notes</div>
                      <p className="text-sm">{selectedApp.reviewer_notes}</p>
                    </div>
                  )}

                  {/* Action Section */}
                  {bgStatus === 'needs_review' && (
                    <div className="space-y-3 pt-2 border-t">
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Review Notes</label>
                        <Textarea
                          value={reviewNotes}
                          onChange={e => setReviewNotes(e.target.value)}
                          placeholder="Add notes about this review decision..."
                          rows={3}
                          disabled={isProcessing}
                        />
                        <p className="text-xs text-muted-foreground mt-1">Notes are required for rejections</p>
                      </div>
                    </div>
                  )}
                </div>

                {bgStatus === 'needs_review' && (
                  <DialogFooter className="flex gap-3 pt-4">
                    <Button
                      variant="destructive"
                      onClick={() => rejectBackgroundCheck(selectedApp)}
                      disabled={isProcessing}
                      className="flex-1"
                    >
                      {isProcessing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <XCircle className="w-4 h-4 mr-1" />}
                      Reject
                    </Button>
                    <Button
                      onClick={() => approveBackgroundCheck(selectedApp)}
                      disabled={isProcessing}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    >
                      {isProcessing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                      Approve & Notify
                    </Button>
                  </DialogFooter>
                )}
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailItem({ icon: Icon, label, value }: { icon: IconComponent; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</div>
        <div className="text-sm">{value}</div>
      </div>
    </div>
  );
}

function TimelineRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
