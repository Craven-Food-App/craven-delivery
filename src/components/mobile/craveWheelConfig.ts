import type { ComponentType, SVGProps } from 'react';
import { MilkGallonIcon } from '@/components/mobile/craveWheelIcons';

export type CraveWheelServiceId =
  | 'retail'
  | 'grocery'
  | 'restaurants'
  | 'convenience'
  | 'pharmacy'
  | 'send_package';

export interface CraveWheelService {
  id: CraveWheelServiceId;
  label: string;
  shortLabel?: string;
  /** Native emoji glyph when no custom Icon is set */
  emoji?: string;
  /** Optional custom icon glyph (SVG) — preferred over emoji when present */
  Icon?: ComponentType<SVGProps<SVGSVGElement>>;
  path: string;
  enabled: boolean;
  comingSoon: boolean;
  analyticsEvent: string;
  badge?: string;
  description?: string;
}

/**
 * Left → right around the upper arc.
 * Food sits near top-center.
 */
export const CRAVE_WHEEL_SERVICES: CraveWheelService[] = [
  {
    id: 'retail',
    label: 'Retail',
    emoji: '👟',
    path: '/restaurants?category=apparel&browse=guest',
    enabled: true,
    comingSoon: false,
    analyticsEvent: 'crave_wheel_service_selected',
    description: 'Apparel and retail stores',
  },
  {
    id: 'grocery',
    label: 'Grocery',
    Icon: MilkGallonIcon,
    path: '/restaurants?category=grocery&browse=guest',
    enabled: true,
    comingSoon: false,
    analyticsEvent: 'crave_wheel_service_selected',
    description: 'Grocery and markets',
  },
  {
    id: 'restaurants',
    label: 'Food',
    emoji: '🍜',
    path: '/restaurants?category=restaurants&browse=guest',
    enabled: true,
    comingSoon: false,
    analyticsEvent: 'crave_wheel_service_selected',
    description: 'Restaurants and main marketplace',
  },
  {
    id: 'convenience',
    label: 'Store',
    emoji: '🏪',
    path: '/restaurants?category=convenience&browse=guest',
    enabled: true,
    comingSoon: false,
    analyticsEvent: 'crave_wheel_service_selected',
    description: 'Convenience stores',
  },
  {
    id: 'pharmacy',
    label: 'RX',
    emoji: '💊',
    path: '/restaurants?category=health&browse=guest',
    enabled: true,
    comingSoon: false,
    analyticsEvent: 'crave_wheel_service_selected',
    description: 'Self care and pharmacy',
  },
  {
    id: 'send_package',
    label: 'Package',
    emoji: '📦',
    path: '',
    enabled: false,
    comingSoon: true,
    analyticsEvent: 'crave_wheel_service_selected',
    badge: 'Soon',
    description: 'Courier package delivery — coming soon',
  },
];

export const CRAVE_ORANGE = '#ff6b35';
export const CRAVE_ORANGE_DEEP = '#ea580c';
export const CRAVE_NAV_INACTIVE = '#737373';
export const CRAVE_NAV_BORDER = '#e5e7eb';
