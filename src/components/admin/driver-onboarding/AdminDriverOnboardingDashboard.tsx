// @ts-nocheck
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Loader2, RefreshCw, Users, CheckCircle, Clock, Search,
  TrendingUp, Award, Target, Eye, Download, ChevronDown,
  ChevronUp, MapPin, Mail, Phone, BarChart3, Zap,
  AlertTriangle, ArrowUpRight, GraduationCap, Shield
} from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';

interface DriverOnboardingData {
  id: string;
  user_id: string;
  application_id: string;
  current_step: string;
  profile_creation_completed: boolean;
  orientation_video_watched: boolean;
  safety_quiz_passed: boolean;
  payment_method_added: boolean;
  w9_completed: boolean;
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
  application: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    city: string;
    state: string;
    status: string;
    points: number;
    priority_score: number;
    region_id: number;
    created_at: string;
    onboarding_completed_at: string | null;
  };
  tasks: OnboardingTask[];
}

interface OnboardingTask {
  id: number;
  driver_id: string;
  task_key: string;
  task_name: string;
  description: string;
  points_reward: number;
  completed: boolean;
  completed_at: string | null;
}

type SortField = 'name' | 'progress' | 'date' | 'location' | 'points';
type SortDir = 'asc' | 'desc';
type FilterTab = 'all' | 'in_progress' | 'completed' | 'not_started';
type IconComp = React.ComponentType<{ className?: string }>;

export function AdminDriverOnboardingDashboard() {
  const [drivers, setDrivers] = useState<DriverOnboardingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedDriver, setSelectedDriver] = useState<DriverOnboardingData | null>(null);

  useEffect(() => {
    fetchDriverOnboardingData();
  }, []);

  const fetchDriverOnboardingData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const { data: applicationsData, error: applicationsError } = await supabase
        .from('craver_applications')
        .select('id, user_id, first_name, last_name, email, phone, city, state, status, points, priority_score, region_id, created_at, onboarding_started_at, onboarding_completed_at')
        .in('status', ['approved', 'waitlist'])
        .order('created_at', { ascending: false });
      if (applicationsError) throw applicationsError;

      const { data: tasksData, error: tasksError } = await supabase
        .from('onboarding_tasks')
        .select('*')
        .order('created_at');
      if (tasksError) throw tasksError;

      const driversWithTasks = (applicationsData || []).map(app => {
        const driverTasks = (tasksData || []).filter(task => task.driver_id === app.id);
        const allTasksCompleted = driverTasks.length > 0 && driverTasks.every(t => t.completed);
        return {
          id: app.id,
          user_id: app.user_id,
          application_id: app.id,
          current_step: 'in_progress',
          profile_creation_completed: true,
          orientation_video_watched: driverTasks.some(t => t.task_key === 'orientation_video' && t.completed),
          safety_quiz_passed: driverTasks.some(t => (t.task_key === 'pass_safety_quiz' || t.task_key === 'safety_quiz') && t.completed),
          payment_method_added: driverTasks.some(t => t.task_key === 'setup_cashapp_payouts' && t.completed),
          w9_completed: false,
          onboarding_completed_at: allTasksCompleted ? (app.onboarding_completed_at || new Date().toISOString()) : null,
          created_at: app.created_at,
          updated_at: app.created_at,
          application: {
            id: app.id, first_name: app.first_name, last_name: app.last_name,
            email: app.email, phone: app.phone, city: app.city, state: app.state,
            status: app.status, points: app.points, priority_score: app.priority_score,
            region_id: app.region_id, created_at: app.created_at,
            onboarding_completed_at: app.onboarding_completed_at
          },
          tasks: driverTasks
        };
      });
      setDrivers(driversWithTasks as DriverOnboardingData[]);
    } catch (error) {
      console.error('Error fetching driver onboarding data:', error);
      toast.error('Failed to load driver onboarding data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getProgress = (d: DriverOnboardingData) => {
    if (d.tasks.length === 0) return 0;
    return (d.tasks.filter(t => t.completed).length / d.tasks.length) * 100;
  };

  const getDriverStatus = (d: DriverOnboardingData): 'completed' | 'in_progress' | 'not_started' => {
    if (d.onboarding_completed_at) return 'completed';
    if (d.tasks.length > 0 && d.tasks.some(t => t.completed)) return 'in_progress';
    return 'not_started';
  };

  const stats = useMemo(() => {
    const total = drivers.length;
    const completed = drivers.filter(d => d.onboarding_completed_at).length;
    const inProgress = drivers.filter(d => !d.onboarding_completed_at && d.tasks.some(t => t.completed)).length;
    const notStarted = total - completed - inProgress;
    const rate = total > 0 ? (completed / total) * 100 : 0;

    const totalTasks = drivers.reduce((s, d) => s + d.tasks.length, 0);
    const completedTasks = drivers.reduce((s, d) => s + d.tasks.filter(t => t.completed).length, 0);
    const avgTasks = total > 0 ? completedTasks / total : 0;
    const taskRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    const completedDrivers = drivers.filter(d => d.onboarding_completed_at);
    let avgDays = 0;
    if (completedDrivers.length > 0) {
      avgDays = completedDrivers.reduce((s, d) => {
        return s + (new Date(d.onboarding_completed_at!).getTime() - new Date(d.created_at).getTime()) / 86400000;
      }, 0) / completedDrivers.length;
    }

    return { total, completed, inProgress, notStarted, rate, avgTasks, taskRate, avgDays, completedTasks, totalTasks };
  }, [drivers]);

  const filtered = useMemo(() => {
    let list = drivers;
    if (activeTab !== 'all') list = list.filter(d => getDriverStatus(d) === activeTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(d =>
        `${d.application.first_name} ${d.application.last_name}`.toLowerCase().includes(q) ||
        d.application.email?.toLowerCase().includes(q) ||
        `${d.application.city} ${d.application.state}`.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name': cmp = `${a.application.first_name} ${a.application.last_name}`.localeCompare(`${b.application.first_name} ${b.application.last_name}`); break;
        case 'progress': cmp = getProgress(a) - getProgress(b); break;
        case 'date': cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime(); break;
        case 'location': cmp = `${a.application.city}`.localeCompare(`${b.application.city}`); break;
        case 'points': cmp = (a.application.points || 0) - (b.application.points || 0); break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
  }, [drivers, activeTab, search, sortField, sortDir]);

  const toggleSort = (f: SortField) => {
    if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(f); setSortDir('desc'); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronDown className="w-3 h-3 opacity-30" />;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  const exportCSV = () => {
    const headers = ['Name', 'Email', 'Location', 'Status', 'Progress', 'Tasks Done', 'Points', 'Applied'];
    const rows = filtered.map(d => [
      `${d.application.first_name} ${d.application.last_name}`,
      d.application.email, `${d.application.city}, ${d.application.state}`,
      getDriverStatus(d), `${getProgress(d).toFixed(0)}%`,
      `${d.tasks.filter(t => t.completed).length}/${d.tasks.length}`,
      d.application.points, format(new Date(d.created_at), 'yyyy-MM-dd')
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `onboarding-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  const kpiCards: { key: FilterTab; label: string; value: string | number; sub: string; icon: IconComp; color: string; accent: string }[] = [
    { key: 'all', label: 'Total Drivers', value: stats.total, sub: 'In pipeline', icon: Users, color: 'text-foreground', accent: 'border-l-primary' },
    { key: 'in_progress', label: 'In Progress', value: stats.inProgress, sub: 'Currently onboarding', icon: TrendingUp, color: 'text-blue-600', accent: 'border-l-blue-500' },
    { key: 'completed', label: 'Completed', value: stats.completed, sub: `${stats.rate.toFixed(1)}% completion rate`, icon: CheckCircle, color: 'text-emerald-600', accent: 'border-l-emerald-500' },
    { key: 'not_started', label: 'Not Started', value: stats.notStarted, sub: 'Awaiting action', icon: Clock, color: 'text-amber-600', accent: 'border-l-amber-500' },
  ];

  const STATUS_BADGE: Record<string, { label: string; color: string; bg: string; icon: IconComp }> = {
    completed: { label: 'Completed', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle },
    in_progress: { label: 'In Progress', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: TrendingUp },
    not_started: { label: 'Not Started', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: Clock },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            Driver Onboarding Analytics
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Track onboarding progress, task completion, and pipeline health</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchDriverOnboardingData(true)} disabled={refreshing}>
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
        {kpiCards.map(card => {
          const CardIcon = card.icon;
          return (
            <Card
              key={card.key}
              className={`cursor-pointer transition-all border-l-4 ${card.accent} ${activeTab === card.key ? 'ring-2 ring-primary/30 shadow-md' : 'hover:shadow-sm'}`}
              onClick={() => setActiveTab(card.key)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{card.label}</span>
                  <CardIcon className={`w-4 h-4 ${card.color}`} />
                </div>
                <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
                <p className="text-xs text-muted-foreground mt-0.5">{card.sub}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Analytics Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Task Completion</span>
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <div className="flex items-end gap-2 mb-2">
              <span className="text-2xl font-bold">{stats.taskRate.toFixed(0)}%</span>
              <span className="text-xs text-muted-foreground mb-1">{stats.completedTasks}/{stats.totalTasks} tasks</span>
            </div>
            <Progress value={stats.taskRate} className="h-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Avg. Completion Time</span>
              <Target className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-bold">{stats.avgDays > 0 ? `${stats.avgDays.toFixed(1)}d` : 'N/A'}</div>
            <p className="text-xs text-muted-foreground">Average days to complete all tasks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Avg. Tasks / Driver</span>
              <Award className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-bold">{stats.avgTasks.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">Tasks completed per driver</p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Tabs */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name, email, or location..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1 bg-muted p-1 rounded-lg">
          {(['all', 'in_progress', 'completed', 'not_started'] as FilterTab[]).map(tab => {
            const labels: Record<FilterTab, string> = { all: 'All', in_progress: 'In Progress', completed: 'Completed', not_started: 'Not Started' };
            const tabCount = tab === 'all' ? stats.total : tab === 'completed' ? stats.completed : tab === 'in_progress' ? stats.inProgress : stats.notStarted;
            return (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === tab ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {labels[tab]} <span className="ml-1 opacity-60">({tabCount})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('name')}>
                  <div className="flex items-center gap-1">Driver <SortIcon field="name" /></div>
                </TableHead>
                <TableHead className="hidden md:table-cell">Contact</TableHead>
                <TableHead className="cursor-pointer select-none hidden sm:table-cell" onClick={() => toggleSort('location')}>
                  <div className="flex items-center gap-1">Location <SortIcon field="location" /></div>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('progress')}>
                  <div className="flex items-center gap-1">Progress <SortIcon field="progress" /></div>
                </TableHead>
                <TableHead className="hidden lg:table-cell">Status</TableHead>
                <TableHead className="cursor-pointer select-none hidden lg:table-cell" onClick={() => toggleSort('points')}>
                  <div className="flex items-center gap-1">Points <SortIcon field="points" /></div>
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
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    {search ? 'No results match your search' : 'No drivers in this category'}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(driver => {
                  const progress = getProgress(driver);
                  const status = getDriverStatus(driver);
                  const badge = STATUS_BADGE[status];
                  const BadgeIcon = badge.icon;
                  const completedTasks = driver.tasks.filter(t => t.completed).length;
                  const totalTasks = driver.tasks.length;
                  const daysSince = differenceInDays(new Date(), new Date(driver.created_at));

                  return (
                    <TableRow key={driver.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                            {driver.application.first_name?.[0]}{driver.application.last_name?.[0]}
                          </div>
                          <div>
                            <div className="font-medium text-sm">{driver.application.first_name} {driver.application.last_name}</div>
                            <div className="text-xs text-muted-foreground md:hidden">{driver.application.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="text-xs space-y-0.5">
                          <div className="flex items-center gap-1 text-muted-foreground"><Mail className="w-3 h-3" />{driver.application.email}</div>
                          <div className="flex items-center gap-1 text-muted-foreground"><Phone className="w-3 h-3" />{driver.application.phone}</div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          {driver.application.city}, {driver.application.state}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="min-w-[120px]">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">{completedTasks}/{totalTasks}</span>
                            <span className="font-medium">{progress.toFixed(0)}%</span>
                          </div>
                          <Progress value={progress} className="h-1.5" />
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Badge variant="outline" className={`${badge.bg} ${badge.color} border text-xs`}>
                          <BadgeIcon className="w-3 h-3 mr-1" />
                          {badge.label}
                        </Badge>
                        {status === 'not_started' && daysSince > 7 && (
                          <div className="flex items-center gap-1 text-[10px] text-amber-600 mt-1">
                            <AlertTriangle className="w-3 h-3" />
                            {daysSince}d inactive
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex items-center gap-1 text-sm">
                          <Award className="w-3 h-3 text-primary" />
                          <span className="font-medium">{driver.application.points || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {format(new Date(driver.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedDriver(driver)}>
                          <Eye className="w-4 h-4 mr-1" />
                          Details
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
            Showing {filtered.length} of {drivers.length} drivers
          </div>
        )}
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedDriver} onOpenChange={open => { if (!open) setSelectedDriver(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedDriver && (() => {
            const progress = getProgress(selectedDriver);
            const status = getDriverStatus(selectedDriver);
            const badge = STATUS_BADGE[status];
            const BadgeIcon = badge.icon;

            return (
              <>
                <DialogHeader>
                  <div className="flex items-center justify-between">
                    <DialogTitle className="flex items-center gap-2 text-lg">
                      <GraduationCap className="w-5 h-5 text-primary" />
                      Onboarding Details
                    </DialogTitle>
                    <Badge variant="outline" className={`${badge.bg} ${badge.color} border`}>
                      <BadgeIcon className="w-3 h-3 mr-1" />
                      {badge.label}
                    </Badge>
                  </div>
                </DialogHeader>

                <div className="space-y-5 mt-2">
                  {/* Driver Info */}
                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                      {selectedDriver.application.first_name?.[0]}{selectedDriver.application.last_name?.[0]}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-lg">{selectedDriver.application.first_name} {selectedDriver.application.last_name}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-3 flex-wrap">
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{selectedDriver.application.email}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{selectedDriver.application.city}, {selectedDriver.application.state}</span>
                      </div>
                    </div>
                  </div>

                  {/* Progress Overview */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Overall Progress</span>
                      <span className="font-bold">{progress.toFixed(0)}%</span>
                    </div>
                    <Progress value={progress} className="h-3" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{selectedDriver.tasks.filter(t => t.completed).length} of {selectedDriver.tasks.length} tasks completed</span>
                      <span className="flex items-center gap-1"><Award className="w-3 h-3" />{selectedDriver.application.points || 0} points</span>
                    </div>
                  </div>

                  {/* Task List */}
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Onboarding Tasks</div>
                    {selectedDriver.tasks.length === 0 ? (
                      <div className="text-sm text-muted-foreground p-4 bg-muted/30 rounded-lg text-center">
                        No onboarding tasks assigned yet
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {selectedDriver.tasks.map(task => (
                          <div key={task.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${task.completed ? 'bg-emerald-50/50 border-emerald-200' : 'bg-background border-border'}`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${task.completed ? 'bg-emerald-500 text-white' : 'border-2 border-muted-foreground/30'}`}>
                              {task.completed && <CheckCircle className="w-4 h-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className={`text-sm font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                                {task.task_name}
                              </div>
                              {task.description && (
                                <div className="text-xs text-muted-foreground truncate">{task.description}</div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {task.points_reward > 0 && (
                                <span className="text-xs font-medium text-primary">+{task.points_reward}pts</span>
                              )}
                              {task.completed_at && (
                                <span className="text-[10px] text-muted-foreground">{format(new Date(task.completed_at), 'MMM d')}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Timeline */}
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Timeline</div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Applied</span>
                      <span className="font-medium">{format(new Date(selectedDriver.created_at), 'PPp')}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Days in Pipeline</span>
                      <span className="font-medium">{differenceInDays(new Date(), new Date(selectedDriver.created_at))} days</span>
                    </div>
                    {selectedDriver.onboarding_completed_at && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Completed</span>
                        <span className="font-medium text-emerald-600">{format(new Date(selectedDriver.onboarding_completed_at), 'PPp')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
