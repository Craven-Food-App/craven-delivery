import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Progress, Badge, Grid, Stack, Group, Text, Box, Center, Loader } from '@mantine/core';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  CheckCircle, 
  Clock, 
  Star, 
  Users, 
  MapPin, 
  Trophy,
  Gift,
  Share2,
  Target
} from 'lucide-react';

interface OnboardingTask {
  id: number;
  task_key: string;
  task_name: string;
  description: string;
  points_reward: number;
  completed: boolean;
  completed_at: string | null;
}

interface QueuePosition {
  queue_position: number;
  total_in_region: number;
  region_name: string;
}

interface DriverProgress {
  application: any;
  tasks: OnboardingTask[];
  queuePosition: QueuePosition | null;
}

export const EnhancedOnboardingDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<DriverProgress | null>(null);
  const [isActivated, setIsActivated] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [completingTask, setCompletingTask] = useState<number | null>(null);

  useEffect(() => {
    loadProgress();
  }, []);

  useEffect(() => {
    // Auto-complete tasks that were done during application
    if (progress?.application && progress.tasks.length > 0) {
      void autoCompleteApplicationTasks();
    }
  }, [progress]);

  const autoCompleteApplicationTasks = async () => {
    if (!progress) return;
    
    const { application, tasks } = progress;

    const tasksToComplete: OnboardingTask[] = [];

    const documentsTask = tasks.find((task) => task.task_key === 'upload_documents' && !task.completed);
    const hasAllDocuments =
      Boolean(application.drivers_license_front) &&
      Boolean(application.drivers_license_back) &&
      Boolean(application.insurance_document);
    if (documentsTask && hasAllDocuments) {
      tasksToComplete.push(documentsTask);
    }

    const payoutTask = tasks.find((task) => task.task_key === 'setup_cashapp_payouts' && !task.completed);
    const payoutMethod = (application.payout_method || '').toLowerCase();
    const hasCashAppDetails = payoutMethod === 'cash_app' && Boolean(application.cash_tag);
    const hasDirectDepositDetails =
      payoutMethod !== 'cash_app' &&
      Boolean(application.routing_number) &&
      Boolean(application.account_number_last_four);
    if (payoutTask && payoutMethod && (hasCashAppDetails || hasDirectDepositDetails)) {
      tasksToComplete.push(payoutTask);
    }

    const profileTask = tasks.find((task) => task.task_key === 'complete_profile' && !task.completed);
    const hasProfileBasics =
      Boolean(application.date_of_birth) &&
      Boolean(application.street_address) &&
      Boolean(application.drivers_license) &&
      Boolean(application.vehicle_make) &&
      Boolean(application.vehicle_model);
    if (profileTask && hasProfileBasics) {
      tasksToComplete.push(profileTask);
    }

    for (const task of tasksToComplete) {
      await completeTask(task.id, task.task_key);
    }
  };

  const loadProgress = async () => {
    try {
      // Get the current logged-in user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('No user logged in');
        setProgress(null);
        return;
      }

      console.log('Loading progress for user:', user.id);

      // Get the user's application (get most recent one if multiple exist)
      const { data: applications, error: appError } = await supabase
        .from('craver_applications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);
      
      const application = applications?.[0];
      
      console.log('Application query result:', { application, error: appError });

      if (appError) {
        console.error('Error loading application:', appError);
        toast({
          title: "Error",
          description: `Failed to load your application: ${appError.message}`,
          variant: "destructive",
        });
        setProgress(null);
        return;
      }

      if (!application) {
        console.log('No application found for user');
        toast({
          title: "Application Not Found",
          description: "Please complete your Feeder application first.",
          variant: "destructive",
        });
        setProgress(null);
        return;
      }

      // Check if driver is activated (approved + onboarding complete)
      if (application.status === 'approved' && application.onboarding_completed_at) {
        console.log('Driver is activated - redirecting to mobile dashboard');
        setIsActivated(true);
        setLoading(false);
        
        toast({
          title: "Welcome Back! 🎉",
          description: "You're activated! Redirecting to your driver dashboard...",
        });
        
        // Redirect to mobile dashboard after 2 seconds
        setTimeout(() => {
          navigate('/mobile', { replace: true });
        }, 2000);
        
        return;
      }

      // Get onboarding tasks
      const { data: tasks, error: tasksError } = await supabase
        .from('onboarding_tasks')
        .select('*')
        .eq('driver_id', application.id)
        .order('created_at');

      console.log('Tasks query result:', { tasks, error: tasksError });

      // Get queue position
      const { data: queuePosition, error: queueError } = await supabase
        .rpc('get_driver_queue_position', { driver_uuid: application.id });

      console.log('Queue position query result:', { queuePosition, error: queueError });

      setProgress({
        application,
        tasks: tasks || [],
        queuePosition: queuePosition?.[0] || null
      });
    } catch (error) {
      console.error('Error loading progress:', error);
      toast({
        title: "Error",
        description: "Failed to load your progress. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  const completeTask = async (taskId: number, taskKey: string) => {
    try {
      setCompletingTask(taskId);

      const { data, error } = await supabase.functions.invoke('complete-onboarding-task', {
        body: {
          task_id: taskId,
          driver_id: progress?.application.id,
        },
      });

      if (error) throw error;

      toast({
        title: "Task Completed! 🎉",
        description: data.message,
      });

      // Reload progress
      await loadProgress();
    } catch (error) {
      console.error('Error completing task:', error);
      toast({
        title: "Error",
        description: "Failed to complete task. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCompletingTask(null);
    }
  };

  const getReferralLink = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get or generate referral code (get most recent application)
      const { data: applications } = await supabase
        .from('craver_applications')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      const application = applications?.[0];
      
      if (!application) return;

      const referralCode = `CRV${application.id.substring(0, 6).toUpperCase()}`;
      const referralLink = `${window.location.origin}/feeder?ref=${referralCode}`;
      
      await navigator.clipboard.writeText(referralLink);
      
      toast({
        title: "Referral Link Copied! 📋",
        description: "Share this link to earn bonus points when friends join!",
      });
    } catch (error) {
      console.error('Error getting referral link:', error);
      toast({
        title: "Error",
        description: "Failed to get referral link",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Box style={{ minHeight: '100vh', backgroundColor: 'var(--mantine-color-gray-0)' }}>
        <Center style={{ height: '100vh' }}>
          <Stack align="center" gap="md">
            <Loader size="lg" color="#ff7a00" />
            <Text c="dimmed">Loading your progress...</Text>
          </Stack>
        </Center>
      </Box>
    );
  }

  if (isActivated) {
    return (
      <Box style={{ minHeight: '100vh', backgroundColor: 'var(--mantine-color-gray-0)' }}>
        <Center style={{ height: '100vh' }}>
          <Card p="xl" style={{ maxWidth: 448, width: '100%' }}>
            <Stack align="center" gap="lg">
              <Box
                style={{
                  backgroundColor: '#22c55e',
                  borderRadius: '50%',
                  padding: 24,
                  width: 96,
                  height: 96,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckCircle size={48} style={{ color: 'white' }} />
              </Box>
              <Text fw={700} size="xl" c="#15803d">
                You're Activated! 🎉
              </Text>
              <Text c="dimmed" ta="center">
                Congratulations! Your region is open and you're ready to deliver.
              </Text>
              <Text size="sm" c="dimmed" ta="center">
                Redirecting to your driver dashboard...
              </Text>
              <Loader size="sm" color="#22c55e" />
            </Stack>
          </Card>
        </Center>
      </Box>
    );
  }

  if (!progress) {
    return (
      <Box style={{ minHeight: '100vh', backgroundColor: 'var(--mantine-color-gray-0)' }}>
        <Center style={{ height: '100vh' }}>
          <Card p="xl" style={{ maxWidth: 448, width: '100%' }}>
            <Text c="dimmed" ta="center">
              No application found. Please complete your driver application first.
            </Text>
          </Card>
        </Center>
      </Box>
    );
  }

  const { application, tasks, queuePosition } = progress;
  const completedTasks = tasks.filter(task => task.completed).length;
  const totalTasks = tasks.length;
  const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const totalPoints = application.points || 0;
  const isOnboardingComplete = !!application.onboarding_completed_at;

  const getTaskActionButton = (task: OnboardingTask) => {
    if (task.completed) return null;

    const isLoading = completingTask === task.id;

    switch (task.task_key) {
      case 'complete_profile':
        return (
          <Button
            size="sm"
            onClick={() => navigate('/enhanced-onboarding/profile')}
            color="#ff7a00"
          >
            Start Task
          </Button>
        );
      case 'upload_vehicle_photos':
        return (
          <Button
            size="sm"
            onClick={() => navigate('/enhanced-onboarding/vehicle-photos')}
            color="#ff7a00"
          >
            Upload Photos
          </Button>
        );
      case 'setup_cashapp_payouts':
        return (
          <Button
            size="sm"
            onClick={() => navigate('/enhanced-onboarding/payout')}
            color="#ff7a00"
          >
            Set Up Payout
          </Button>
        );
      case 'pass_safety_quiz':
        return (
          <Button
            size="sm"
            onClick={() => navigate('/enhanced-onboarding/safety-quiz')}
            color="blue"
          >
            Take Quiz
          </Button>
        );
      case 'upload_documents':
        // Auto-completed if documents were uploaded during application
        // This task is required - all documents must be uploaded
        return (
          <Badge variant="outline" color="orange">
            Required - Upload All Documents
          </Badge>
        );
      case 'refer_friend':
        return (
          <Button
            size="sm"
            onClick={() => navigate('/enhanced-onboarding/referral')}
            color="violet"
          >
            Start Referral Program
          </Button>
        );
      case 'download_mobile_app':
      case 'join_facebook_group':
      case 'complete_service_training':
        return (
          <Button
            size="sm"
            onClick={() => completeTask(task.id, task.task_key)}
            disabled={isLoading}
            color="green"
          >
            {isLoading ? 'Processing...' : "I've Done This"}
          </Button>
        );
      default:
        return (
          <Button
            size="sm"
            onClick={() => completeTask(task.id, task.task_key)}
            disabled={isLoading}
            variant="outline"
          >
            {isLoading ? 'Processing...' : 'Start Task'}
          </Button>
        );
    }
  };

  return (
    <Box style={{ minHeight: '100vh', backgroundColor: 'var(--mantine-color-gray-0)' }}>
      <Box style={{ maxWidth: 896, margin: '0 auto', padding: 24 }}>
        <Stack gap="lg">
          {/* Header */}
          <Box ta="center" mb="xl">
            <Text fw={700} size="2xl" mb="xs">
              Welcome to Crave'n, {application.first_name}! 🚗
            </Text>
            <Text c="dimmed">
              Complete your onboarding to move up in the queue and start earning sooner!
            </Text>
          </Box>

          {/* Status Cards */}
          <Grid gutter="md" mb="xl">
            {/* Queue Position */}
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Card p="lg">
                <Group justify="space-between">
                  <div>
                    <Text size="sm" c="dimmed" fw={500}>Queue Position</Text>
                    <Text fw={700} size="xl" c="#ff7a00">
                      #{queuePosition?.queue_position || 'N/A'}
                    </Text>
                    <Text size="xs" c="dimmed">
                      of {queuePosition?.total_in_region || 0} in {queuePosition?.region_name || 'your region'}
                    </Text>
                  </div>
                  <Users size={32} style={{ color: '#ff7a00' }} />
                </Group>
              </Card>
            </Grid.Col>

            {/* Points */}
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Card p="lg">
                <Group justify="space-between">
                  <div>
                    <Text size="sm" c="dimmed" fw={500}>Total Points</Text>
                    <Text fw={700} size="xl" c="#22c55e">{totalPoints}</Text>
                    <Text size="xs" c="dimmed">Earn more to move up!</Text>
                  </div>
                  <Star size={32} style={{ color: '#22c55e' }} />
                </Group>
              </Card>
            </Grid.Col>

            {/* Progress */}
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Card p="lg">
                <Group justify="space-between">
                  <div>
                    <Text size="sm" c="dimmed" fw={500}>Onboarding Progress</Text>
                    <Text fw={700} size="xl" c="blue">
                      {completedTasks}/{totalTasks}
                    </Text>
                    <Text size="xs" c="dimmed">Tasks completed</Text>
                  </div>
                  <Target size={32} style={{ color: 'var(--mantine-color-blue-6)' }} />
                </Group>
              </Card>
            </Grid.Col>
          </Grid>

          {/* Congratulations Message */}
          {isOnboardingComplete && application.status === 'approved' && (
            <Card p="lg" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', borderColor: '#22c55e' }}>
              <Group align="flex-start" gap="md">
                <Box
                  style={{
                    backgroundColor: '#22c55e',
                    borderRadius: '50%',
                    padding: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CheckCircle size={32} style={{ color: 'white' }} />
                </Box>
                <div style={{ flex: 1 }}>
                  <Text fw={700} size="xl" c="#15803d" mb="xs">
                    🎉 You're Activated!
                  </Text>
                  <Text c="#166534" mb="md">
                    Your region is open! You can now start accepting deliveries.
                  </Text>
                  <Button 
                    onClick={() => navigate('/mobile')}
                    color="green"
                  >
                    Go to Driver Dashboard →
                  </Button>
                </div>
              </Group>
            </Card>
          )}
          
          {isOnboardingComplete && application.status !== 'approved' && (
            <Card p="lg" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', borderColor: '#22c55e' }}>
              <Group align="flex-start" gap="md">
                <Box
                  style={{
                    backgroundColor: '#22c55e',
                    borderRadius: '50%',
                    padding: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CheckCircle size={32} style={{ color: 'white' }} />
                </Box>
                <div style={{ flex: 1 }}>
                  <Text fw={700} size="xl" c="#15803d" mb="xs">
                    🎉 Congratulations! Onboarding Complete!
                  </Text>
                  <Text c="#166534" mb="xs">
                    You've completed all onboarding tasks! You're now in position <Text component="span" fw={700}>#{queuePosition?.queue_position || 'N/A'}</Text> in the waitlist for <Text component="span" fw={700}>{queuePosition?.region_name}</Text>.
                  </Text>
                  <Text size="sm" c="#15803d">
                    ✉️ We'll email you when your region opens up and you're activated as a driver. Stay tuned!
                  </Text>
                </div>
              </Group>
            </Card>
          )}

          {/* Progress Bar */}
          <Card p="lg">
            <Stack gap="md">
              <Group justify="space-between">
                <Text fw={600} size="lg">Onboarding Progress</Text>
                <Badge variant="outline" color="#ff7a00">
                  {Math.round(progressPercentage)}% Complete
                </Badge>
              </Group>
              <Progress value={progressPercentage} size="sm" color="#ff7a00" />
              <Text size="sm" c="dimmed">
                {isOnboardingComplete 
                  ? 'All tasks complete! You\'re in the waitlist queue.'
                  : 'Complete all tasks to maximize your priority score and move up in the queue!'
                }
              </Text>
            </Stack>
          </Card>

          {/* Onboarding Tasks */}
          <Card>
            <Stack gap="md" p="lg">
              <div>
                <Group gap="xs" mb="xs">
                  <Trophy size={20} style={{ color: '#eab308' }} />
                  <Text fw={600} size="lg">Onboarding Tasks</Text>
                </Group>
                <Text size="sm" c="dimmed">
                  Complete these tasks to earn points and improve your queue position
                </Text>
              </div>
              <Stack gap="md">
                {tasks.map((task) => (
                  <Box
                    key={task.id}
                    p="md"
                    style={{
                      backgroundColor: task.completed ? 'rgba(34, 197, 94, 0.1)' : 'var(--mantine-color-gray-0)',
                      borderColor: task.completed ? '#22c55e' : 'var(--mantine-color-gray-3)',
                      border: '1px solid',
                      borderRadius: 8,
                    }}
                  >
                    <Group justify="space-between">
                      <Group gap="md">
                        {task.completed ? (
                          <CheckCircle size={20} style={{ color: '#22c55e' }} />
                        ) : (
                          <Clock size={20} style={{ color: 'var(--mantine-color-gray-6)' }} />
                        )}
                        <div>
                          <Group gap="xs" align="center">
                            <Text fw={500}>{task.task_name}</Text>
                            {(task.task_key === 'complete_profile' || 
                              task.task_key === 'upload_documents' || 
                              task.task_key === 'pass_safety_quiz' || 
                              task.task_key === 'refer_friend') && (
                              <Badge size="xs" color="red" variant="filled">
                                Required
                              </Badge>
                            )}
                          </Group>
                          <Text size="sm" c="dimmed">{task.description}</Text>
                        </div>
                      </Group>
                      <Group gap="md">
                        <Badge variant="outline" color="#ff7a00">
                          +{task.points_reward} pts
                        </Badge>
                        {task.completed ? (
                          <Badge color="green" leftSection={<CheckCircle size={12} />}>
                            Complete
                          </Badge>
                        ) : (
                          getTaskActionButton(task)
                        )}
                      </Group>
                    </Group>
                  </Box>
                ))}
              </Stack>
            </Stack>
          </Card>

          {/* Referral Program Section */}
          <Card>
            <Stack gap="md" p="lg">
              <div>
                <Group gap="xs" mb="xs">
                  <Gift size={20} style={{ color: '#a855f7' }} />
                  <Text fw={600} size="lg">Driver Referral Program</Text>
                </Group>
                <Text size="sm" c="dimmed">
                  Refer drivers and earn up to $400 per driver! This task is required.
                </Text>
              </div>
              <Card p="md" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', borderColor: '#22c55e' }}>
                <Stack gap="sm">
                  <Text fw={600} size="md" c="#166534">💸 Earn $400 Per Driver</Text>
                  <Text size="sm" c="#166534">
                    • $100 when they complete their first delivery
                  </Text>
                  <Text size="sm" c="#166534">
                    • $300 when they complete 20 deliveries with 4.5+ rating
                  </Text>
                  <Text size="sm" c="#166534" fw={500} mt="xs">
                    Refer 11 drivers = $4,400 total earnings!
                  </Text>
                </Stack>
              </Card>
              <Group gap="lg" align="flex-start">
                <Button
                  onClick={() => navigate('/enhanced-onboarding/referral')}
                  color="violet"
                  size="lg"
                  leftSection={<Share2 size={16} />}
                >
                  Start Referral Program
                </Button>
                <Stack gap="xs">
                  <Text size="sm" c="dimmed">• This task is required</Text>
                  <Text size="sm" c="dimmed">• Must refer at least 1 driver to complete</Text>
                  <Text size="sm" c="dimmed">• Earn real cash, not just points!</Text>
                </Stack>
              </Group>
            </Stack>
          </Card>

          {/* Region Status */}
          {queuePosition && (
            <Card>
              <Stack gap="md" p="lg">
                <Group gap="xs">
                  <MapPin size={20} style={{ color: 'var(--mantine-color-blue-6)' }} />
                  <Text fw={600} size="lg">Your Region Status</Text>
                </Group>
                <Grid gutter="md">
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <Text fw={500}>{queuePosition.region_name}</Text>
                    <Text size="sm" c="dimmed">
                      You're #{queuePosition.queue_position} of {queuePosition.total_in_region} drivers
                    </Text>
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <Text fw={500}>Priority Score</Text>
                    <Text size="sm" c="dimmed">
                      {application.priority_score || 0} points
                    </Text>
                  </Grid.Col>
                </Grid>
              </Stack>
            </Card>
          )}

          {/* Next Steps */}
          <Card>
            <Stack gap="md" p="lg">
              <Text fw={600} size="lg">What's Next?</Text>
              <Stack gap="md">
                <Group gap="md">
                  <Box
                    style={{
                      width: 24,
                      height: 24,
                      backgroundColor: 'rgba(255, 122, 0, 0.1)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text size="xs" fw={700} c="#ff7a00">1</Text>
                  </Box>
                  <Text size="sm">Complete all onboarding tasks to maximize your points</Text>
                </Group>
                <Group gap="md">
                  <Box
                    style={{
                      width: 24,
                      height: 24,
                      backgroundColor: 'rgba(255, 122, 0, 0.1)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text size="xs" fw={700} c="#ff7a00">2</Text>
                  </Box>
                  <Text size="sm">Share your referral link to earn bonus points</Text>
                </Group>
                <Group gap="md">
                  <Box
                    style={{
                      width: 24,
                      height: 24,
                      backgroundColor: 'rgba(255, 122, 0, 0.1)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text size="xs" fw={700} c="#ff7a00">3</Text>
                  </Box>
                  <Text size="sm">Wait for activation when your region opens up</Text>
                </Group>
                <Group gap="md">
                  <Box
                    style={{
                      width: 24,
                      height: 24,
                      backgroundColor: 'rgba(34, 197, 94, 0.1)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CheckCircle size={16} style={{ color: '#22c55e' }} />
                  </Box>
                  <Text size="sm" fw={500} c="#15803d">
                    You'll receive an email when it's time to activate your account!
                  </Text>
                </Group>
              </Stack>
            </Stack>
          </Card>
        </Stack>
      </Box>
    </Box>
  );
};
