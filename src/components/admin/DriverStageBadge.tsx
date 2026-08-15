import React from 'react';
import {
  CheckCircle,
  CheckCircle2,
  FileText,
  GraduationCap,
  Search,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  deriveDriverLifecycle,
  LIFECYCLE_TONE_CLASSES,
  type DriverLifecycleRecord,
  type DriverLifecycleStage,
} from '@/lib/driverLifecycle';

const STAGE_ICONS: Record<DriverLifecycleStage, React.ComponentType<{ className?: string }>> = {
  applied: FileText,
  screening: Search,
  awaiting_background: ShieldAlert,
  onboarding: GraduationCap,
  ready_to_activate: CheckCircle2,
  active: CheckCircle,
  rejected: XCircle,
};

interface DriverStageBadgeProps {
  record: DriverLifecycleRecord;
  className?: string;
  /** Render the explanation underneath the badge. */
  showDetail?: boolean;
}

/**
 * Displays the driver's pipeline stage, derived from the same rules the
 * activation path enforces, so the table cannot show "ready" for a driver the
 * backend would refuse to activate.
 */
export function DriverStageBadge({ record, className, showDetail = false }: DriverStageBadgeProps) {
  const lifecycle = deriveDriverLifecycle(record);
  const Icon = STAGE_ICONS[lifecycle.stage];

  return (
    <div className={cn('min-w-0', className)}>
      <Badge
        variant="outline"
        className={cn('text-xs font-medium', LIFECYCLE_TONE_CLASSES[lifecycle.tone])}
        title={lifecycle.detail}
      >
        <Icon className="h-3 w-3 mr-1" />
        {lifecycle.label}
      </Badge>
      {showDetail && (
        <p className="mt-1 text-[11px] leading-tight text-muted-foreground">{lifecycle.detail}</p>
      )}
    </div>
  );
}

export default DriverStageBadge;
