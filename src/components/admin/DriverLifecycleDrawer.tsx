import React, { useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle2,
  Circle,
  GraduationCap,
  Mail,
  MapPin,
  ShieldCheck,
  Users,
  Zap,
} from 'lucide-react';
import { DriverStageBadge } from '@/components/admin/DriverStageBadge';
import {
  deriveDriverLifecycle,
  isBackgroundCleared,
  isOnboardingComplete,
  type DriverLifecycleRecord,
} from '@/lib/driverLifecycle';
import { cn } from '@/lib/utils';

export interface DriverLifecycleDrawerDriver extends DriverLifecycleRecord {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  vehicle_type?: string | null;
  points?: number | null;
  waitlist_position?: number | null;
  created_at?: string | null;
  region_name?: string | null;
}

interface DriverLifecycleDrawerProps {
  driver: DriverLifecycleDrawerDriver | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activating?: boolean;
  onActivate?: (driverId: string) => void;
  onResendEmail?: (driver: DriverLifecycleDrawerDriver) => void;
  onNavigate?: (tabId: string) => void;
}

interface PipelineStep {
  id: string;
  label: string;
  done: boolean;
  current: boolean;
  detail: string;
  tabId?: string;
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

export function DriverLifecycleDrawer({
  driver,
  open,
  onOpenChange,
  activating = false,
  onActivate,
  onResendEmail,
  onNavigate,
}: DriverLifecycleDrawerProps) {
  const lifecycle = useMemo(
    () => (driver ? deriveDriverLifecycle(driver) : null),
    [driver],
  );

  const steps = useMemo<PipelineStep[]>(() => {
    if (!driver || !lifecycle) return [];

    const bgCleared = isBackgroundCleared(driver);
    const onboarded = isOnboardingComplete(driver);
    const status = (driver.status || '').toLowerCase();
    const reviewed = !['pending', 'started', ''].includes(status) || status === 'under_review' || status === 'waitlist' || status === 'approved' || status === 'rejected';

    return [
      {
        id: 'review',
        label: 'Application review',
        done: reviewed && status !== 'pending' && status !== 'started',
        current: lifecycle.stage === 'applied',
        detail: reviewed && status !== 'pending' && status !== 'started'
          ? `Moved forward on ${formatDate(driver.created_at)}`
          : 'Waiting for an initial decision',
        tabId: 'applications',
      },
      {
        id: 'background',
        label: 'Background check',
        done: bgCleared,
        current: lifecycle.stage === 'screening' || lifecycle.stage === 'awaiting_background',
        detail: bgCleared
          ? `Cleared ${formatDate(driver.background_check_approved_at)}`
          : driver.background_check_initiated_at
            ? `Initiated ${formatDate(driver.background_check_initiated_at)}`
            : 'Not started',
        tabId: 'background-checks',
      },
      {
        id: 'onboarding',
        label: 'Onboarding',
        done: onboarded,
        current: lifecycle.stage === 'onboarding',
        detail: onboarded
          ? `Completed ${formatDate(driver.onboarding_completed_at)}`
          : driver.onboarding_started_at
            ? `Started ${formatDate(driver.onboarding_started_at)}`
            : 'Not started',
        tabId: 'onboarding',
      },
      {
        id: 'activate',
        label: 'Activation',
        done: lifecycle.stage === 'active',
        current: lifecycle.stage === 'ready_to_activate',
        detail: lifecycle.stage === 'active'
          ? 'Driver is live'
          : lifecycle.canActivate
            ? 'Eligible to activate now'
            : lifecycle.blockedReason || 'Blocked',
        tabId: 'waitlist',
      },
    ];
  }, [driver, lifecycle]);

  if (!driver || !lifecycle) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-md" />
      </Sheet>
    );
  }

  const fullName = `${driver.first_name || ''} ${driver.last_name || ''}`.trim() || 'Driver';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="space-y-3 border-b border-border px-5 py-4 text-left">
          <div className="flex items-start justify-between gap-3 pr-6">
            <div className="min-w-0">
              <SheetTitle className="truncate text-base">{fullName}</SheetTitle>
              <SheetDescription className="truncate text-xs">
                {driver.email || 'No email on file'}
              </SheetDescription>
            </div>
            <DriverStageBadge record={driver} />
          </div>
          <p className="text-xs text-muted-foreground">{lifecycle.detail}</p>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Location</p>
              <p className="flex items-center gap-1.5 font-medium">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                {[driver.city, driver.state].filter(Boolean).join(', ') || '—'}
                {driver.zip_code ? ` ${driver.zip_code}` : ''}
              </p>
            </div>
            <div>
              <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Region</p>
              <p className="font-medium">{driver.region_name || 'Unassigned'}</p>
            </div>
            <div>
              <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Vehicle</p>
              <p className="font-medium capitalize">{driver.vehicle_type || '—'}</p>
            </div>
            <div>
              <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Applied</p>
              <p className="font-medium">{formatDate(driver.created_at)}</p>
            </div>
            <div>
              <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Points</p>
              <p className="font-semibold tabular-nums">{driver.points ?? 0}</p>
            </div>
            <div>
              <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Waitlist #</p>
              <p className="font-semibold text-primary tabular-nums">
                {driver.waitlist_position ? `#${driver.waitlist_position}` : '—'}
              </p>
            </div>
          </div>

          <Separator />

          <div>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Lifecycle
            </p>
            <ol className="space-y-3">
              {steps.map(step => (
                <li key={step.id} className="flex items-start gap-3">
                  <span
                    className={cn(
                      'mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border',
                      step.done
                        ? 'border-green-300 bg-green-500/10 text-green-700'
                        : step.current
                          ? 'border-primary/40 bg-primary/10 text-primary'
                          : 'border-border bg-muted text-muted-foreground',
                    )}
                  >
                    {step.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3 w-3" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn('text-sm font-medium', step.current && 'text-primary')}>{step.label}</p>
                      {step.tabId && onNavigate && (
                        <button
                          type="button"
                          onClick={() => onNavigate(step.tabId!)}
                          className="text-[11px] font-semibold text-primary hover:underline"
                        >
                          Open
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{step.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {!lifecycle.canActivate && lifecycle.blockedReason && lifecycle.stage !== 'active' && lifecycle.stage !== 'rejected' && (
            <div className="rounded-md border border-amber-200 bg-amber-500/10 px-3 py-2 text-xs text-amber-800">
              Activation blocked: {lifecycle.blockedReason}
            </div>
          )}
        </div>

        <SheetFooter className="flex-col gap-2 border-t border-border px-5 py-4 sm:flex-col sm:space-x-0">
          {lifecycle.stage === 'ready_to_activate' && onActivate && (
            <Button
              className="w-full bg-green-600 text-white hover:bg-green-700"
              disabled={activating}
              onClick={() => onActivate(driver.id)}
            >
              <Zap className="mr-1.5 h-4 w-4" />
              Activate Driver
            </Button>
          )}
          {lifecycle.stage === 'active' && onResendEmail && (
            <Button variant="outline" className="w-full" onClick={() => onResendEmail(driver)}>
              <Mail className="mr-1.5 h-4 w-4" />
              Resend Activation Email
            </Button>
          )}
          {onNavigate && (
            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" size="sm" onClick={() => onNavigate('background-checks')}>
                <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                BG
              </Button>
              <Button variant="outline" size="sm" onClick={() => onNavigate('onboarding')}>
                <GraduationCap className="mr-1 h-3.5 w-3.5" />
                Tasks
              </Button>
              <Button variant="outline" size="sm" onClick={() => onNavigate('waitlist')}>
                <Users className="mr-1 h-3.5 w-3.5" />
                Queue
              </Button>
            </div>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default DriverLifecycleDrawer;
