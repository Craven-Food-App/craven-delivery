import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Loader2, 
  RefreshCw, 
  Users, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Search,
  TrendingUp,
  Award,
  Target,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';

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

interface Stats {
  total: number;
  in_progress: number;
  completed: number;
  completion_rate: number;
  avg_time_to_complete: string;
  avg_tasks_completed: number;
}

export function AdminDriverOnboardingDashboard() {
  const [drivers, setDrivers] = useState<DriverOnboardingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedDriver, setSelectedDriver] = useState<DriverOnboardingData | null>(null);

  useEffect(() => {
    fetchDriverOnboardingData();
  }, []);

  const fetchDriverOnboardingData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    else setRefreshing(true);

    try {
      // Fetch all feeder applications with status approved or waitlist
      const { data: applicationsData, error: applicationsError } = await supabase
        .from('feeder_applications')
        .select(`
          id,
          user_id,
          first_name,
          last_name,
          email,
          phone,
          city,
          state,
          status,
          points,
          priority_score,
          region_id,
          created_at,
          onboarding_started_at,
          onboarding_completed_at
        `)
        .in('status', ['approved', 'waitlist'])
        .order('created_at', { ascending: false });

      if (applicationsError) throw applicationsError;

      // Fetch all onboarding tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('onboarding_tasks')
        .select('*')
        .order('created_at');

      if (tasksError) throw tasksError;

      // Combine data - create driver onboarding structure
      const driversWithTasks = (applicationsData || []).map(app => {
        const driverTasks = (tasksData || []).filter(
          task => task.driver_id === app.id
        );

        // Calculate completion status from tasks
        const allTasksCompleted = driverTasks.length > 0 && driverTasks.every(t => t.completed);
        const onboardingCompleted = allTasksCompleted ? (app.onboarding_completed_at || new Date().toISOString()) : null;

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
          onboarding_completed_at: onboardingCompleted,
          created_at: app.created_at,
          updated_at: app.created_at,
          application: {
            id: app.id,
            first_name: app.first_name,
            last_name: app.last_name,
            email: app.email,
            phone: app.phone,
            city: app.city,
            state: app.state,
            status: app.status,
            points: app.points,
            priority_score: app.priority_score,
            region_id: app.region_id,
            created_at: app.created_at,
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

  const calculateStats = (): Stats => {
    const total = drivers.length;
    const completed = drivers.filter(d => d.onboarding_completed_at).length;
    const in_progress = total - completed;
    const completion_rate = total > 0 ? (completed / total) * 100 : 0;

    // Calculate average tasks completed
    const totalTasks = drivers.reduce((sum, d) => sum + d.tasks.length, 0);
    const completedTasks = drivers.reduce(
      (sum, d) => sum + d.tasks.filter(t => t.completed).length, 
      0
    );
    const avg_tasks_completed = total > 0 ? completedTasks / total : 0;

    // Calculate average time to complete (for completed drivers)
    const completedDrivers = drivers.filter(d => d.onboarding_completed_at);
    let avgDays = 0;
    if (completedDrivers.length > 0) {
      const totalDays = completedDrivers.reduce((sum, d) => {
        const start = new Date(d.created_at).getTime();
        const end = new Date(d.onboarding_completed_at!).getTime();
        return sum + (end - start) / (1000 * 60 * 60 * 24);
      }, 0);
      avgDays = totalDays / completedDrivers.length;
    }

    return {
      total,
      in_progress,
      completed,
      completion_rate,
      avg_time_to_complete: avgDays > 0 ? `${avgDays.toFixed(1)} days` : 'N/A',
      avg_tasks_completed
    };
  };

  const stats = calculateStats();

  const filteredDrivers = drivers.filter(driver => {
    const matchesSearch = 
      !searchTerm ||
      driver.application.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.application.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.application.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'completed' && driver.onboarding_completed_at) ||
      (statusFilter === 'in_progress' && !driver.onboarding_completed_at);

    return matchesSearch && matchesStatus;
  });

  const getCompletionPercentage = (driver: DriverOnboardingData) => {
    if (driver.tasks.length === 0) return 0;
    const completed = driver.tasks.filter(t => t.completed).length;
    return (completed / driver.tasks.length) * 100;
  };

  const getStatusBadge = (driver: DriverOnboardingData) => {
    if (driver.onboarding_completed_at) {
      return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Completed</Badge>;
    }
    const progress = getCompletionPercentage(driver);
    if (progress === 0) {
      return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Not Started</Badge>;
    }
    return <Badge variant="default"><TrendingUp className="h-3 w-3 mr-1" /> In Progress</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Driver Onboarding Analytics</h1>
          <p className="text-muted-foreground">Track driver onboarding progress and completion</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchDriverOnboardingData(false)}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Drivers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">In onboarding</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.in_progress}</div>
            <p className="text-xs text-muted-foreground">Currently onboarding</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">{stats.completion_rate.toFixed(1)}% completion rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Time</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avg_time_to_complete}</div>
            <p className="text-xs text-muted-foreground">To complete</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Tasks</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avg_tasks_completed.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">Tasks completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Drivers</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Drivers List */}
      <Card>
        <CardHeader>
          <CardTitle>Drivers ({filteredDrivers.length})</CardTitle>
          <CardDescription>
            View and track individual driver onboarding progress
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredDrivers.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No drivers found matching your filters</p>
              </div>
            ) : (
              filteredDrivers.map((driver) => {
                const progress = getCompletionPercentage(driver);
                const completedTasks = driver.tasks.filter(t => t.completed).length;
                const totalTasks = driver.tasks.length;

                return (
                  <div
                    key={driver.id}
                    className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold text-lg">
                            {driver.application.first_name} {driver.application.last_name}
                          </h3>
                          {getStatusBadge(driver)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{driver.application.email}</span>
                          <span>•</span>
                          <span>{driver.application.city}, {driver.application.state}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Award className="h-3 w-3" />
                            {driver.application.points} points
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedDriver(driver)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {completedTasks} of {totalTasks} tasks completed
                        </span>
                        <span className="font-medium">{progress.toFixed(0)}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                      
                      <div className="flex gap-2 mt-3">
                        {driver.tasks.slice(0, 5).map((task) => (
                          <Badge
                            key={task.id}
                            variant={task.completed ? "default" : "outline"}
                            className={task.completed ? "bg-green-500" : ""}
                          >
                            {task.completed ? <CheckCircle className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                            {task.task_name}
                          </Badge>
                        ))}
                        {driver.tasks.length > 5 && (
                          <Badge variant="secondary">
                            +{driver.tasks.length - 5} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Driver Details Modal */}
      {selectedDriver && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    {selectedDriver.application.first_name} {selectedDriver.application.last_name}
                  </CardTitle>
                  <CardDescription>{selectedDriver.application.email}</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDriver(null)}
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Progress Overview */}
              <div>
                <h3 className="font-semibold mb-3">Onboarding Progress</h3>
                <div className="space-y-2">
                  <Progress value={getCompletionPercentage(selectedDriver)} className="h-3" />
                  <p className="text-sm text-muted-foreground">
                    {selectedDriver.tasks.filter(t => t.completed).length} of {selectedDriver.tasks.length} tasks completed
                  </p>
                </div>
              </div>

              {/* Tasks List */}
              <div>
                <h3 className="font-semibold mb-3">Tasks</h3>
                <div className="space-y-3">
                  {selectedDriver.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 p-3 border rounded-lg"
                    >
                      {task.completed ? (
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                      ) : (
                        <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium">{task.task_name}</h4>
                          <Badge variant="outline">+{task.points_reward} pts</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{task.description}</p>
                        {task.completed && task.completed_at && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Completed {new Date(task.completed_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Driver Info */}
              <div>
                <h3 className="font-semibold mb-3">Driver Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Status</label>
                    <p className="font-medium capitalize">{selectedDriver.application.status}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Priority Score</label>
                    <p className="font-medium">{selectedDriver.application.priority_score}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Total Points</label>
                    <p className="font-medium">{selectedDriver.application.points}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Started</label>
                    <p className="font-medium">
                      {new Date(selectedDriver.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {selectedDriver.onboarding_completed_at && (
                    <div>
                      <label className="text-sm text-muted-foreground">Completed</label>
                      <p className="font-medium">
                        {new Date(selectedDriver.onboarding_completed_at).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
