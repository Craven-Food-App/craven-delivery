export const DRIVER_OPERATIONS_CHANGED = 'driver-operations:changed';

export type DriverOperationsArea =
  | 'applications'
  | 'background-checks'
  | 'waitlist'
  | 'onboarding'
  | 'quiz'
  | 'promos'
  | 'support'
  | 'payouts';

export interface DriverOperationsChangeDetail {
  area: DriverOperationsArea;
  entityId?: string;
  action: string;
  at: string;
}

/**
 * Lightweight domain event bus for coordinating the existing operations
 * panels. Database realtime remains authoritative; these events make local
 * mutations visible across mounted portal surfaces immediately.
 */
export function emitDriverOperationsChange(
  detail: Omit<DriverOperationsChangeDetail, 'at'>,
) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<DriverOperationsChangeDetail>(DRIVER_OPERATIONS_CHANGED, {
      detail: { ...detail, at: new Date().toISOString() },
    }),
  );
}

export function subscribeToDriverOperationsChanges(
  listener: (detail: DriverOperationsChangeDetail) => void,
) {
  if (typeof window === 'undefined') return () => undefined;
  const handler = (event: Event) => {
    listener((event as CustomEvent<DriverOperationsChangeDetail>).detail);
  };
  window.addEventListener(DRIVER_OPERATIONS_CHANGED, handler);
  return () => window.removeEventListener(DRIVER_OPERATIONS_CHANGED, handler);
}
