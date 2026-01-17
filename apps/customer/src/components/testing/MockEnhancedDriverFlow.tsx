import React, { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Shield,
  Sparkles,
  Trophy,
  Users
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { MailDemo } from './mockFlow/MailDemo';
import { SigningDemo } from './mockFlow/SigningDemo';

type SimulationStatus = 'pending' | 'current' | 'completed';

interface MockEnhancedDriverFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SIMULATION_STEPS = [
  {
    title: 'Application Submitted',
    description: 'Driver completes the enhanced application with documents and background check consent.'
  },
  {
    title: 'Waitlist Placement',
    description: 'Driver is placed in the regional waitlist while enhanced onboarding tasks open up.'
  },
  {
    title: 'Enhanced Tasks Completed',
    description: 'Driver knocks out profile completion, vehicle photos, payout setup, and the safety quiz.'
  },
  {
    title: 'Operations Approval',
    description: 'Market ops reviews the driver, assigns a region, and approves the account.'
  },
  {
    title: 'Activation & Go-Live',
    description: 'Driver receives activation email/SMS and gains full access to the mobile dashboard.'
  }
];

const QUEUE_STAGES = [
  { position: 245, total: 1260, region: 'Columbus, OH', status: 'Submitted' },
  { position: 128, total: 1260, region: 'Columbus, OH', status: 'Waitlist' },
  { position: 42, total: 1260, region: 'Columbus, OH', status: 'Fast-Tracked' },
  { position: 3, total: 1260, region: 'Columbus, OH', status: 'Ready to Activate' },
  { position: 1, total: 1260, region: 'Columbus, OH', status: 'Activated' }
];

const POINT_PROGRESS = [150, 340, 580, 780, 950];

const TASKS = [
  { label: 'Enhanced profile & identity check', completeAtStep: 2 },
  { label: 'Vehicle photos & insurance submitted', completeAtStep: 2 },
  { label: 'Payout setup (Cash App) verified', completeAtStep: 2 },
  { label: 'Safety quiz passed', completeAtStep: 3 },
  { label: 'Orientation call completed', completeAtStep: 4 }
];

const ACTIVITY_LOG = [
  {
    step: 0,
    time: '9:12 AM',
    title: 'Application submitted',
    note: 'Driver uploaded license, insurance and bank details using enhanced wizard.'
  },
  {
    step: 1,
    time: '9:13 AM',
    title: 'Waitlist placement email sent',
    note: 'Driver assigned to Columbus, OH queue with priority score 150.'
  },
  {
    step: 2,
    time: '9:32 AM',
    title: 'Enhanced tasks auto-completed',
    note: 'Profile, vehicle photos, payout, and safety quiz flagged as complete.'
  },
  {
    step: 3,
    time: '11:05 AM',
    title: 'Operations approval triggered',
    note: 'Ops manager reviewed documents and assigned activation window.'
  },
  {
    step: 4,
    time: '11:07 AM',
    title: 'Activation delivered',
    note: 'Driver received activation SMS + email and can now access mobile hub.'
  }
];

const INITIAL_STATUSES: SimulationStatus[] = SIMULATION_STEPS.map((_, index) =>
  index === 0 ? 'current' : 'pending'
);

export const MockEnhancedDriverFlow: React.FC<MockEnhancedDriverFlowProps> = ({ open, onOpenChange }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [simulationComplete, setSimulationComplete] = useState(false);
  const [stepStatuses, setStepStatuses] = useState<SimulationStatus[]>(INITIAL_STATUSES);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [activeTab, setActiveTab] = useState('timeline');

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const startSimulation = useCallback(() => {
    clearTimers();
    setCurrentStep(0);
    setSimulationComplete(false);
    setStepStatuses(INITIAL_STATUSES);

    SIMULATION_STEPS.forEach((_, index) => {
      if (index === 0) return;

      const timer = setTimeout(() => {
        setCurrentStep(index);
        setStepStatuses(prev =>
          prev.map((status, idx) => {
            if (idx < index) return 'completed';
            if (idx === index) return 'current';
            return 'pending';
          })
        );
      }, index * 2500);

      timersRef.current.push(timer);
    });

    const completionTimer = setTimeout(() => {
      setStepStatuses(prev =>
        prev.map((status, idx) => (idx <= SIMULATION_STEPS.length - 1 ? 'completed' : status))
      );
      setSimulationComplete(true);
    }, SIMULATION_STEPS.length * 2500);

    timersRef.current.push(completionTimer);
  }, [clearTimers]);

  useEffect(() => {
    if (open) {
      startSimulation();
    } else {
      clearTimers();
    }

    return () => {
      clearTimers();
    };
  }, [open, startSimulation, clearTimers]);

  const queueStage = useMemo(
    () => QUEUE_STAGES[Math.min(currentStep, QUEUE_STAGES.length - 1)],
    [currentStep]
  );

  const points = useMemo(
    () => POINT_PROGRESS[Math.min(currentStep, POINT_PROGRESS.length - 1)],
    [currentStep]
  );

  const visibleActivity = useMemo(
    () =>
      ACTIVITY_LOG.filter(activity =>
        simulationComplete ? true : activity.step <= currentStep
      ),
    [currentStep, simulationComplete]
  );

  const progressValue = useMemo(() => {
    const base = ((currentStep + 1) / SIMULATION_STEPS.length) * 100;
    return simulationComplete ? 100 : Math.min(100, base);
  }, [currentStep, simulationComplete]);

  const handleRestart = () => {
    startSimulation();
    setActiveTab('timeline');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-full max-h-[85vh] overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-primary" />
            Mock Enhanced Feeder Application
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Walk through the enhanced feeder onboarding experience without touching production data.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[calc(85vh-5rem)] px-6 pb-6">
        <div className="space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row">
            <Card className="flex-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Loader2 className="h-5 w-5 text-primary" />
                  Simulation Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Progress value={progressValue} className="h-3" />
                <div className="grid gap-2.5">
                  {SIMULATION_STEPS.map((step, index) => {
                    const status = stepStatuses[index];
                    const isCurrent = status === 'current';
                    const isComplete = status === 'completed';
                    return (
                      <div
                        key={step.title}
                        className={`flex items-start gap-3 rounded-lg border p-2.5 ${
                          isComplete
                            ? 'border-green-200 bg-green-50'
                            : isCurrent
                            ? 'border-primary/40 bg-primary/5'
                            : 'border-border bg-background'
                        }`}
                      >
                        <div className="mt-0.5">
                          {isComplete ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : isCurrent ? (
                            <Sparkles className="h-5 w-5 text-primary" />
                          ) : (
                            <Clock className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{step.title}</p>
                            {isComplete ? (
                              <Badge variant="outline" className="border-green-200 text-green-600">
                                Complete
                              </Badge>
                            ) : isCurrent ? (
                              <Badge variant="secondary">In Progress</Badge>
                            ) : null}
                          </div>
                          <p className="text-sm text-muted-foreground">{step.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Shield className="h-4 w-4" />
                    Simulated data only — no Supabase writes occur.
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleRestart}>
                      Restart Simulation
                    </Button>
                    <Button onClick={() => onOpenChange(false)}>Close</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="w-full lg:w-80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5 text-primary" />
                  Queue Snapshot
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border bg-muted/40 p-4 text-sm">
                  <p className="text-xs uppercase text-muted-foreground">Region</p>
                  <p className="text-lg font-semibold">{queueStage.region}</p>
                  <p className="text-xs text-muted-foreground">{queueStage.status}</p>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-lg border bg-background p-3 text-center">
                    <p className="text-xs text-muted-foreground">Queue Position</p>
                    <p className="text-2xl font-bold text-primary">#{queueStage.position}</p>
                  </div>
                  <div className="rounded-lg border bg-background p-3 text-center">
                    <p className="text-xs text-muted-foreground">Total Drivers</p>
                    <p className="text-2xl font-bold">{queueStage.total}</p>
                  </div>
                </div>
                <div className="rounded-lg border bg-background p-3 text-center">
                  <p className="text-xs text-muted-foreground">Priority Points</p>
                  <p className="text-2xl font-bold text-green-600">{points}</p>
                </div>
                {simulationComplete ? (
                  <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                    <p className="font-medium">Driver is activated!</p>
                    <p>Mobile access unlocked with real-time order feed available.</p>
                  </div>
                ) : (
                  <div className="rounded-lg border bg-background p-3 text-sm">
                    <p className="font-medium text-muted-foreground">
                      Activation email pending completion of simulation.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="h-5 w-5 text-primary" />
                Interactive Demo Panels
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Step through the enhanced onboarding experience using mock data, emails, and documents.
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="grid w-full grid-cols-3 lg:w-auto">
                  <TabsTrigger value="timeline">Timeline</TabsTrigger>
                  <TabsTrigger value="mail">Demo Email</TabsTrigger>
                  <TabsTrigger value="documents">Document Signing</TabsTrigger>
                </TabsList>

                <TabsContent value="timeline" className="space-y-4">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="space-y-2.5">
                      {TASKS.map(task => {
                        const complete = currentStep >= task.completeAtStep;
                        return (
                          <div
                            key={task.label}
                            className={`flex items-center justify-between rounded-lg border p-2.5 ${
                              complete ? 'border-green-200 bg-green-50' : 'border-border bg-background'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {complete ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : (
                                <Clock className="h-4 w-4 text-muted-foreground" />
                              )}
                              <span className="text-sm font-medium">{task.label}</span>
                            </div>
                            <Badge variant={complete ? 'default' : 'outline'}>
                              {complete ? 'Complete' : 'Pending'}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                    <div className="h-64 rounded-lg border bg-background/70 p-0">
                      <ScrollArea className="h-full px-4">
                        <div className="space-y-3.5 py-3">
                          {visibleActivity.map(activity => (
                            <div
                              key={activity.title}
                              className="rounded-lg border bg-background p-2.5 text-sm"
                            >
                              <div className="flex items-center justify-between">
                                <p className="font-medium">{activity.title}</p>
                                <span className="text-xs text-muted-foreground">{activity.time}</span>
                              </div>
                              <p className="text-muted-foreground">{activity.note}</p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="mail">
                  <MailDemo currentStep={currentStep} />
                </TabsContent>

                <TabsContent value="documents">
                  <SigningDemo currentStep={currentStep} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

