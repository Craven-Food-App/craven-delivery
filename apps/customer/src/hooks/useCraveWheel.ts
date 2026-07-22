import { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';

type HapticsModule = typeof import('@capacitor/haptics');

async function triggerHaptic(kind: 'open' | 'select' | 'close') {
  try {
    if (!Capacitor.isNativePlatform()) return;
    const { Haptics, ImpactStyle } = (await import('@capacitor/haptics')) as HapticsModule;
    if (kind === 'select') {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } else {
      await Haptics.impact({ style: ImpactStyle.Light });
    }
  } catch {
    // Unsupported — fail silently
  }
}

function trackCraveEvent(event: string, properties?: Record<string, unknown>) {
  try {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', event, properties ?? {});
    }
  } catch {
    // no-op
  }
}

export interface UseCraveWheelOptions {
  onOpenChange?: (open: boolean) => void;
}

export function useCraveWheel({ onOpenChange }: UseCraveWheelOptions = {}) {
  const [open, setOpen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const scrollLockRef = useRef<{ y: number; el: HTMLElement | null } | null>(null);
  const centerBtnRef = useRef<HTMLButtonElement | null>(null);
  const firstItemRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);

  const lockScroll = useCallback(() => {
    const main = document.querySelector('main') as HTMLElement | null;
    const el = main ?? document.body;
    const y = main ? main.scrollTop : window.scrollY;
    scrollLockRef.current = { y, el };
    if (main) {
      main.dataset.craveWheelScrollLock = '1';
      main.style.overflow = 'hidden';
      main.style.touchAction = 'none';
    } else {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${y}px`;
      document.body.style.width = '100%';
    }
  }, []);

  const unlockScroll = useCallback(() => {
    const locked = scrollLockRef.current;
    const main = document.querySelector('main') as HTMLElement | null;
    if (main?.dataset.craveWheelScrollLock) {
      main.style.overflow = '';
      main.style.touchAction = '';
      delete main.dataset.craveWheelScrollLock;
      if (locked) main.scrollTop = locked.y;
    } else if (locked && !main) {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, locked.y);
    }
    scrollLockRef.current = null;
  }, []);

  const openWheel = useCallback(() => {
    setOpen(true);
    lockScroll();
    onOpenChange?.(true);
    trackCraveEvent('crave_wheel_opened', { source: 'crave_wheel' });
    void triggerHaptic('open');
    window.setTimeout(() => {
      firstItemRef.current?.focus();
    }, 50);
  }, [lockScroll, onOpenChange]);

  const closeWheel = useCallback(
    (reason: string = 'dismiss') => {
      setOpen(false);
      unlockScroll();
      onOpenChange?.(false);
      trackCraveEvent('crave_wheel_closed', { source: 'crave_wheel', reason });
      window.setTimeout(() => {
        centerBtnRef.current?.focus();
      }, 30);
    },
    [onOpenChange, unlockScroll]
  );

  const toggleWheel = useCallback(() => {
    if (open) closeWheel('toggle');
    else openWheel();
  }, [open, openWheel, closeWheel]);

  const selectService = useCallback(
    (payload: {
      id: string;
      label: string;
      path: string;
      comingSoon: boolean;
      enabled: boolean;
    }) => {
      trackCraveEvent('crave_wheel_service_selected', {
        service_id: payload.id,
        service_label: payload.label,
        destination_route: payload.path || null,
        selection_source: 'crave_wheel',
        availability_state: payload.comingSoon
          ? 'coming_soon'
          : payload.enabled
            ? 'available'
            : 'disabled',
        current_route: window.location.pathname,
      });
      void triggerHaptic('select');
      closeWheel('select');
    },
    [closeWheel]
  );

  // Escape + route cleanup callers use closeWheel
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeWheel('escape');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, closeWheel]);

  // Always start closed — cleanup scroll lock on unmount
  useEffect(() => () => unlockScroll(), [unlockScroll]);

  return {
    open,
    reducedMotion,
    centerBtnRef,
    firstItemRef,
    openWheel,
    closeWheel,
    toggleWheel,
    selectService,
  };
}
