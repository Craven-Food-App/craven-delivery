/**
 * Single source of truth for where a driver sits in the operations pipeline.
 *
 * Every Driver Operations surface derives stage from this module so the
 * Applications, Background Checks, Waitlist, and Onboarding tabs cannot
 * disagree about the same driver.
 *
 * Field semantics come from `craver_applications`:
 *  - status: 'pending' | 'under_review' | 'waitlist' | 'approved' | 'rejected'
 *  - background_check / background_check_approved_at: compliance clearance
 *  - onboarding_completed_at: business readiness
 */

export type DriverLifecycleStage =
  | 'applied'
  | 'screening'
  | 'awaiting_background'
  | 'onboarding'
  | 'ready_to_activate'
  | 'active'
  | 'rejected';

export interface DriverLifecycleRecord {
  status?: string | null;
  background_check?: boolean | null;
  background_check_approved_at?: string | null;
  background_check_initiated_at?: string | null;
  onboarding_started_at?: string | null;
  onboarding_completed_at?: string | null;
}

export type DriverLifecycleTone = 'neutral' | 'info' | 'warning' | 'success' | 'danger';

export interface DriverLifecycleState {
  stage: DriverLifecycleStage;
  label: string;
  /** Short explanation of what this driver is waiting on. */
  detail: string;
  tone: DriverLifecycleTone;
  /** True only when every gate the activation path enforces is satisfied. */
  canActivate: boolean;
  /** Why activation is blocked, or null when it is not. */
  blockedReason: string | null;
}

export function isBackgroundCleared(record: DriverLifecycleRecord): boolean {
  return record.background_check === true && Boolean(record.background_check_approved_at);
}

export function isOnboardingComplete(record: DriverLifecycleRecord): boolean {
  return Boolean(record.onboarding_completed_at);
}

export function deriveDriverLifecycle(record: DriverLifecycleRecord): DriverLifecycleState {
  const status = (record.status || '').toLowerCase();

  if (status === 'rejected') {
    return {
      stage: 'rejected',
      label: 'Rejected',
      detail: 'Application was declined.',
      tone: 'danger',
      canActivate: false,
      blockedReason: 'Application was rejected',
    };
  }

  if (status === 'approved') {
    return {
      stage: 'active',
      label: 'Active',
      detail: 'Driver is activated and can accept deliveries.',
      tone: 'success',
      canActivate: false,
      blockedReason: null,
    };
  }

  if (status === 'waitlist') {
    if (!isBackgroundCleared(record)) {
      const started = Boolean(record.background_check_initiated_at);
      return {
        stage: 'awaiting_background',
        label: 'Awaiting background',
        detail: started
          ? 'Background check is in progress and not yet cleared.'
          : 'Background check has not been started.',
        tone: 'warning',
        canActivate: false,
        blockedReason: 'Background check is not cleared',
      };
    }

    if (!isOnboardingComplete(record)) {
      return {
        stage: 'onboarding',
        label: 'In onboarding',
        detail: Boolean(record.onboarding_started_at)
          ? 'Background cleared. Onboarding is underway but incomplete.'
          : 'Background cleared. Onboarding has not been started.',
        tone: 'info',
        canActivate: false,
        blockedReason: 'Onboarding is not complete',
      };
    }

    return {
      stage: 'ready_to_activate',
      label: 'Ready to activate',
      detail: 'Background cleared and onboarding complete.',
      tone: 'success',
      canActivate: true,
      blockedReason: null,
    };
  }

  if (status === 'under_review') {
    return {
      stage: 'screening',
      label: 'In screening',
      detail: 'Approved for screening and awaiting a background decision.',
      tone: 'info',
      canActivate: false,
      blockedReason: 'Still in background screening',
    };
  }

  return {
    stage: 'applied',
    label: 'New application',
    detail: 'Awaiting an initial review decision.',
    tone: 'neutral',
    canActivate: false,
    blockedReason: 'Application has not been reviewed',
  };
}

export function isActivationEligible(record: DriverLifecycleRecord): boolean {
  return deriveDriverLifecycle(record).canActivate;
}

/** Tailwind classes per tone, matching the badge styling already used in the portal. */
export const LIFECYCLE_TONE_CLASSES: Record<DriverLifecycleTone, string> = {
  neutral: 'bg-muted text-muted-foreground border-border',
  info: 'bg-blue-500/10 text-blue-700 border-blue-200',
  warning: 'bg-amber-500/10 text-amber-700 border-amber-200',
  success: 'bg-green-500/10 text-green-700 border-green-200',
  danger: 'bg-red-500/10 text-red-700 border-red-200',
};
