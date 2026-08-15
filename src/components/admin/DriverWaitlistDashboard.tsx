import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import {
  emitDriverOperationsChange,
  subscribeToDriverOperationsChanges,
} from '@/lib/driverOperationsEvents';
import { deriveDriverLifecycle, isActivationEligible } from '@/lib/driverLifecycle';
import { DriverStageBadge } from '@/components/admin/DriverStageBadge';
import { DriverLifecycleDrawer } from '@/components/admin/DriverLifecycleDrawer';
import {
  Users,
  Star,
  Search,
  Download,
  Send,
  Eye,
  CheckCircle,
  Clock,
  Mail,
  MapPin,
  Car,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Gauge,
  Zap,
  Pause,
  Activity,
  AlertCircle,
} from 'lucide-react';

interface Driver {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  city: string;
  state: string;
  zip_code: string;
  vehicle_type: string;
  status: string;
  points: number;
  priority_score: number;
  waitlist_position: number | null;
  created_at: string;
  onboarding_started_at: string | null;
  onboarding_completed_at: string | null;
  background_check: boolean | null;
  background_check_approved_at: string | null;
  background_check_initiated_at: string | null;
  region_id?: number;
  is_seeded?: boolean;
  regions: {
    name: string;
    status: string;
    active_quota: number;
  } | null;
}

interface RegionStats {
  region_id: number;
  region_name: string;
  current_active: number;
  quota: number;
  waitlist_count: number;
  display_quota: number;
  status: string;
}

type SortField = 'name' | 'points' | 'position' | 'created_at' | 'city';
type SortDir = 'asc' | 'desc';

export const DriverWaitlistDashboard: React.FC = () => {
  const [, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [regionStats, setRegionStats] = useState<RegionStats[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDrivers, setSelectedDrivers] = useState<string[]>([]);
  const [viewingDriver, setViewingDriver] = useState<Driver | null>(null);
  const [editingRegion, setEditingRegion] = useState<number | null>(null);
  const [newDisplayQuota, setNewDisplayQuota] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('points');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [activating, setActivating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
    const channel = supabase
      .channel('driver-waitlist-operations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'craver_applications' }, () => loadData())
      .subscribe();
    const unsubscribe = subscribeToDriverOperationsChanges(detail => {
      if (detail.area === 'applications' || detail.area === 'background-checks' || detail.area === 'onboarding') {
        void loadData();
      }
    });
    return () => {
      void supabase.removeChannel(channel);
      unsubscribe();
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const { data: driversData, error: driversError } = await supabase
        .from('craver_applications')
        .select(`*, regions(name, status, active_quota)`)
        .in('status', ['waitlist', 'approved'])
        .order('priority_score', { ascending: false });

      if (driversError) throw driversError;

      const driversWithPositions = (driversData || []).map(driver => {
        if (driver.status === 'waitlist') {
          const regionWaitlist = driversData
            ?.filter(d => d.region_id === driver.region_id && d.status === 'waitlist')
            .sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0)) || [];
          const position = regionWaitlist.findIndex(d => d.id === driver.id) + 1;
          return { ...driver, waitlist_position: position };
        }
        return { ...driver, waitlist_position: null };
      });

      setDrivers(driversWithPositions);

      const { data: regionsData, error: regionsError } = await supabase
        .from('regions')
        .select('*')
        .order('name');

      if (regionsError) throw regionsError;

      const processedStats = regionsData?.map(region => {
        const regionDrivers = driversData?.filter(d => d.region_id === region.id) || [];
        return {
          region_id: region.id,
          region_name: region.name,
          current_active: regionDrivers.filter(d => d.status === 'approved').length,
          quota: region.active_quota,
          waitlist_count: regionDrivers.filter(d => d.status === 'waitlist').length,
          display_quota: region.display_quota || 0,
          status: region.status,
        };
      }) || [];

      setRegionStats(processedStats);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({ title: 'Error', description: 'Failed to load waitlist data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const filteredDrivers = useMemo(() => {
    let result = drivers.filter(driver => {
      const matchesRegion = selectedRegion === 'all' || driver.region_id?.toString() === selectedRegion;
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && driver.status === 'approved') ||
        (statusFilter === 'waitlist' && driver.status === 'waitlist');
      const matchesSearch = searchTerm === '' ||
        `${driver.first_name} ${driver.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        driver.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        driver.city.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesRegion && matchesStatus && matchesSearch;
    });

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
          break;
        case 'points':
          cmp = (a.points || 0) - (b.points || 0);
          break;
        case 'position':
          cmp = (a.waitlist_position ?? 999) - (b.waitlist_position ?? 999);
          break;
        case 'created_at':
          cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'city':
          cmp = a.city.localeCompare(b.city);
          break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [drivers, selectedRegion, statusFilter, searchTerm, sortField, sortDir]);

  const activationEligibleDrivers = useMemo(
    () => filteredDrivers.filter(driver => isActivationEligible(driver)),
    [filteredDrivers],
  );

  const navigateToTab = (tabId: string) => {
    setSearchParams(previous => {
      const next = new URLSearchParams(previous);
      next.set('tab', tabId);
      return next;
    }, { replace: false });
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  };

  const activateDrivers = async (driverIds: string[]) => {
    const eligibleIds = driverIds.filter(id => {
      const driver = drivers.find(item => item.id === id);
      return driver ? isActivationEligible(driver) : false;
    });
    if (eligibleIds.length === 0) {
      toast({
        title: 'No eligible drivers selected',
        description: 'Drivers must be waitlisted with a cleared background check and completed onboarding before activation.',
        variant: 'destructive',
      });
      return;
    }
    try {
      setActivating(true);
      const { data, error } = await supabase.functions.invoke('activate-drivers', {
        body: { driver_ids: eligibleIds },
      });
      if (error) throw error;

      const emailResults = data.results || [];
      const emailSentCount = emailResults.filter((r: any) => r.email_sent === true).length;
      const emailFailedCount = emailResults.filter((r: any) => r.email_sent === false).length;

      toast({ title: 'Drivers Activated 🎉', description: `${data.activated_count} of ${data.total} drivers activated.` });
      if (emailSentCount > 0) toast({ title: 'Emails Sent ✉️', description: `Sent to ${emailSentCount} driver(s).` });
      if (emailFailedCount > 0) toast({ title: 'Email Warning ⚠️', description: `Failed for ${emailFailedCount} driver(s).`, variant: 'destructive' });

      emitDriverOperationsChange({ area: 'waitlist', action: 'drivers_activated' });
      await loadData();
      setSelectedDrivers([]);
    } catch (error) {
      console.error('Error activating drivers:', error);
      toast({ title: 'Error', description: 'Failed to activate drivers', variant: 'destructive' });
    } finally {
      setActivating(false);
    }
  };

  const resendActivationEmail = async (driverId: string, driverEmail: string, driverName: string) => {
    try {
      const { error } = await supabase.functions.invoke('send-approval-email', {
        body: { driverName, driverEmail, applicationId: driverId },
      });
      if (error) throw error;
      toast({ title: 'Email Sent ✉️', description: `Activation email resent to ${driverEmail}` });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to resend email.', variant: 'destructive' });
    }
  };

  const updateRegionStatus = async (regionId: number, status: string) => {
    try {
      const { error } = await supabase.from('regions').update({ status }).eq('id', regionId);
      if (error) throw error;
      toast({ title: 'Region Updated', description: `Status changed to ${status}` });

      if (status === 'active') {
        const { data: autoData, error: autoErr } = await supabase.functions.invoke('auto-activate-region-drivers', { body: { region_id: regionId } });
        if (autoErr) {
          toast({ title: 'Warning', description: 'Region opened but auto-activation failed.', variant: 'destructive' });
        } else if (autoData?.activated_count > 0) {
          toast({ title: 'Auto-Activation Complete 🎉', description: `${autoData.activated_count} drivers activated.` });
        }
      }
      await loadData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update region status', variant: 'destructive' });
    }
  };

  const updateDisplayQuota = async (regionId: number, displayQuota: number) => {
    try {
      const { error } = await supabase.from('regions').update({ display_quota: displayQuota }).eq('id', regionId);
      if (error) throw error;
      toast({ title: 'Display Quota Updated', description: `Applicants now see "${displayQuota}" total drivers` });
      await loadData();
      setEditingRegion(null);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update display quota', variant: 'destructive' });
    }
  };

  const toggleDriverSelection = (id: string) =>
    setSelectedDrivers(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

  const exportCSV = () => {
    const headers = ['Name', 'Email', 'City', 'State', 'Zip', 'Vehicle', 'Status', 'Points', 'Position', 'Applied'];
    const rows = filteredDrivers.map(d => [
      `${d.first_name} ${d.last_name}`, d.email, d.city, d.state, d.zip_code,
      d.vehicle_type, d.status, d.points, d.waitlist_position ?? '', new Date(d.created_at).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `driver-waitlist-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Summary stats
  const totalActive = regionStats.reduce((s, r) => s + r.current_active, 0);
  const totalWaitlist = regionStats.reduce((s, r) => s + r.waitlist_count, 0);
  const totalCapacity = regionStats.reduce((s, r) => s + r.quota, 0);
  const openRegions = regionStats.filter(r => r.status === 'active').length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-700 border-green-200';
      case 'limited': return 'bg-amber-500/10 text-amber-700 border-amber-200';
      case 'paused': return 'bg-red-500/10 text-red-700 border-red-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getCapacityColor = (ratio: number) => {
    if (ratio >= 0.9) return 'bg-red-500';
    if (ratio >= 0.7) return 'bg-amber-500';
    return 'bg-primary';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent mx-auto" />
          <p className="text-sm text-muted-foreground">Loading waitlist data…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Driver Waitlist Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage driver applications and region capacity</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => activateDrivers(selectedDrivers)}
            disabled={selectedDrivers.length === 0 || activating}
            className="bg-green-600 hover:bg-green-700 text-white shadow-sm"
          >
            <Zap className="h-4 w-4 mr-1.5" />
            Activate Selected ({selectedDrivers.length})
          </Button>
          <Button variant="outline" onClick={exportCSV} className="shadow-sm">
            <Download className="h-4 w-4 mr-1.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Drivers', value: totalActive, icon: Activity, color: 'text-green-600' },
          { label: 'On Waitlist', value: totalWaitlist, icon: Clock, color: 'text-amber-600' },
          { label: 'Total Capacity', value: totalCapacity, icon: Gauge, color: 'text-blue-600' },
          { label: 'Open Regions', value: `${openRegions}/${regionStats.length}`, icon: MapPin, color: 'text-primary' },
        ].map(kpi => (
          <Card key={kpi.label} className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-4">
              <div className={cn('p-2.5 rounded-lg bg-muted', kpi.color)}>
                <kpi.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{kpi.label}</p>
                <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Region Cards */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Region Capacity</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {regionStats.map(stat => {
            const ratio = stat.quota > 0 ? stat.current_active / stat.quota : 0;
            return (
              <Card key={stat.region_id} className="shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-foreground">{stat.region_name}</h3>
                    </div>
                    <Badge variant="outline" className={cn('text-xs font-medium capitalize', getStatusColor(stat.status))}>
                      {stat.status}
                    </Badge>
                  </div>

                  <div className="space-y-2.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Active Drivers</span>
                      <span className="font-semibold tabular-nums">{stat.current_active}/{stat.quota}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Real Waitlist</span>
                      <span className="font-semibold tabular-nums">{stat.waitlist_count}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Shown to Drivers</span>
                      {editingRegion === stat.region_id ? (
                        <div className="flex gap-1.5 items-center">
                          <Input
                            type="number"
                            value={newDisplayQuota}
                            onChange={e => setNewDisplayQuota(parseInt(e.target.value) || 0)}
                            className="w-20 h-7 text-sm"
                          />
                          <Button size="sm" className="h-7 px-2 text-xs" onClick={() => updateDisplayQuota(stat.region_id, newDisplayQuota)}>
                            Save
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditingRegion(null)}>
                            ✕
                          </Button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingRegion(stat.region_id); setNewDisplayQuota(stat.display_quota); }}
                          className="font-semibold text-primary tabular-nums hover:underline"
                        >
                          {stat.display_quota} <span className="text-[10px] text-muted-foreground ml-0.5">Edit</span>
                        </button>
                      )}
                    </div>

                    {/* Capacity bar */}
                    <div className="pt-1">
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all', getCapacityColor(ratio))}
                          style={{ width: `${Math.min(ratio * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator className="my-3" />

                  <div className="flex gap-1.5">
                    {['active', 'limited', 'paused'].map(s => (
                      <Button
                        key={s}
                        size="sm"
                        variant={stat.status === s ? 'default' : 'outline'}
                        className={cn(
                          'flex-1 h-7 text-xs capitalize',
                          stat.status === s && s === 'active' && 'bg-green-600 hover:bg-green-700',
                          stat.status === s && s === 'limited' && 'bg-amber-600 hover:bg-amber-700',
                          stat.status === s && s === 'paused' && 'bg-red-600 hover:bg-red-700',
                        )}
                        disabled={stat.status === s}
                        onClick={() => updateRegionStatus(stat.region_id, s)}
                      >
                        {s === 'active' && <Activity className="h-3 w-3 mr-1" />}
                        {s === 'limited' && <AlertCircle className="h-3 w-3 mr-1" />}
                        {s === 'paused' && <Pause className="h-3 w-3 mr-1" />}
                        {s === 'active' ? 'Open' : s === 'limited' ? 'Limit' : 'Pause'}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Filters Bar */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or city…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedRegion} onValueChange={setSelectedRegion}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="All Regions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                {regionStats.map(r => (
                  <SelectItem key={r.region_id} value={r.region_id.toString()}>
                    {r.region_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-40">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="waitlist">Waitlist</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDrivers(activationEligibleDrivers.map(d => d.id))}
                className="text-xs"
              >
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDrivers([])}
                className="text-xs"
              >
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Drivers Table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Drivers ({filteredDrivers.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 w-10">
                    <input
                      type="checkbox"
                      checked={selectedDrivers.length === activationEligibleDrivers.length && activationEligibleDrivers.length > 0}
                      onChange={() =>
                        selectedDrivers.length === activationEligibleDrivers.length
                          ? setSelectedDrivers([])
                          : setSelectedDrivers(activationEligibleDrivers.map(d => d.id))
                      }
                      className="rounded border-border"
                    />
                  </th>
                  <th className="text-left p-3">
                    <button onClick={() => toggleSort('name')} className="flex items-center gap-1 font-medium hover:text-foreground">
                      Name <SortIcon field="name" />
                    </button>
                  </th>
                  <th className="text-left p-3">
                    <button onClick={() => toggleSort('city')} className="flex items-center gap-1 font-medium hover:text-foreground">
                      Location <SortIcon field="city" />
                    </button>
                  </th>
                  <th className="text-left p-3 font-medium">Vehicle</th>
                  <th className="text-left p-3 font-medium">Stage</th>
                  <th className="text-left p-3">
                    <button onClick={() => toggleSort('points')} className="flex items-center gap-1 font-medium hover:text-foreground">
                      Points <SortIcon field="points" />
                    </button>
                  </th>
                  <th className="text-left p-3">
                    <button onClick={() => toggleSort('position')} className="flex items-center gap-1 font-medium hover:text-foreground">
                      Position <SortIcon field="position" />
                    </button>
                  </th>
                  <th className="text-left p-3">
                    <button onClick={() => toggleSort('created_at')} className="flex items-center gap-1 font-medium hover:text-foreground">
                      Applied <SortIcon field="created_at" />
                    </button>
                  </th>
                  <th className="text-left p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDrivers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-muted-foreground">
                      No drivers found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredDrivers.map(driver => (
                    <tr
                      key={driver.id}
                      className={cn(
                        'border-b hover:bg-accent/50 transition-colors',
                        selectedDrivers.includes(driver.id) && 'bg-primary/5'
                      )}
                    >
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedDrivers.includes(driver.id)}
                          onChange={() => toggleDriverSelection(driver.id)}
                          disabled={!isActivationEligible(driver)}
                          title={
                            isActivationEligible(driver)
                              ? 'Select driver'
                              : deriveDriverLifecycle(driver).blockedReason || 'Not eligible for activation'
                          }
                          className="rounded border-border"
                        />
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${driver.is_seeded ? 'bg-orange-100 text-orange-600' : 'bg-muted text-muted-foreground'}`}>
                            {driver.first_name?.[0]}{driver.last_name?.[0]}
                          </div>
                          <div>
                            <div className="font-medium text-foreground">{driver.first_name} {driver.last_name}</div>
                            <div className="text-xs text-muted-foreground">{driver.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="font-medium">{driver.city}, {driver.state}</div>
                        <div className="text-xs text-muted-foreground">{driver.zip_code}</div>
                      </td>
                      <td className="p-3">
                        {driver.vehicle_type ? (
                          <Badge variant="outline" className="capitalize text-xs">
                            <Car className="h-3 w-3 mr-1" />
                            {driver.vehicle_type}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        <DriverStageBadge record={driver} />
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 text-amber-500" />
                          <span className="font-semibold tabular-nums">{driver.points}</span>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        {driver.status === 'waitlist' ? (
                          <span className="font-bold text-primary tabular-nums">#{driver.waitlist_position}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground tabular-nums">
                        {new Date(driver.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => setViewingDriver(driver)}
                            title="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {driver.status === 'waitlist' && (
                            <Button
                              size="sm"
                              onClick={() => activateDrivers([driver.id])}
                              className="h-8 bg-green-600 hover:bg-green-700 text-white text-xs px-3"
                              disabled={activating || !isActivationEligible(driver)}
                              title={
                                isActivationEligible(driver)
                                  ? 'Activate driver'
                                  : deriveDriverLifecycle(driver).blockedReason || 'Not eligible'
                              }
                            >
                              Activate
                            </Button>
                          )}
                          {driver.status === 'approved' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                              onClick={() =>
                                resendActivationEmail(driver.id, driver.email, `${driver.first_name} ${driver.last_name}`)
                              }
                              title="Resend activation email"
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <DriverLifecycleDrawer
        open={!!viewingDriver}
        onOpenChange={(open) => {
          if (!open) setViewingDriver(null);
        }}
        driver={
          viewingDriver
            ? {
                ...viewingDriver,
                region_name: viewingDriver.regions?.name || null,
              }
            : null
        }
        activating={activating}
        onActivate={(driverId) => {
          void activateDrivers([driverId]);
          setViewingDriver(null);
        }}
        onResendEmail={(driver) => {
          void resendActivationEmail(
            driver.id,
            driver.email || '',
            `${driver.first_name || ''} ${driver.last_name || ''}`.trim(),
          );
        }}
        onNavigate={(tabId) => {
          setViewingDriver(null);
          navigateToTab(tabId);
        }}
      />
    </div>
  );
};
