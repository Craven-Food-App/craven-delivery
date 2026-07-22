import type { ComponentType, CSSProperties } from 'react';
import {
  IconBuildingStore,
  IconCoffee,
  IconFirstAidKit,
  IconPackage,
  IconShirt,
  IconToolsKitchen2,
} from '@tabler/icons-react';

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
  icon: ComponentType<{ size?: number | string; stroke?: number; color?: string; style?: CSSProperties }>;
  path: string;
  enabled: boolean;
  comingSoon: boolean;
  analyticsEvent: string;
  badge?: string;
  description?: string;
}

/**
 * Left → right around the upper arc.
 * Restaurants sits near top-center.
 */
export const CRAVE_WHEEL_SERVICES: CraveWheelService[] = [
  {
    id: 'retail',
    label: 'Retail',
    icon: IconShirt,
    path: '/restaurants?category=apparel',
    enabled: true,
    comingSoon: false,
    analyticsEvent: 'crave_wheel_service_selected',
    description: 'Apparel and retail stores',
  },
  {
    id: 'grocery',
    label: 'Grocery',
    icon: IconBuildingStore,
    path: '/restaurants?category=grocery',
    enabled: true,
    comingSoon: false,
    analyticsEvent: 'crave_wheel_service_selected',
    description: 'Grocery and markets',
  },
  {
    id: 'restaurants',
    label: 'Restaurants',
    shortLabel: 'Food',
    icon: IconToolsKitchen2,
    path: '/restaurants?category=all&browse=guest',
    enabled: true,
    comingSoon: false,
    analyticsEvent: 'crave_wheel_service_selected',
    description: 'Restaurants and main marketplace',
  },
  {
    id: 'convenience',
    label: 'Convenience',
    shortLabel: 'C-Store',
    icon: IconCoffee,
    path: '/restaurants?category=convenience',
    enabled: true,
    comingSoon: false,
    analyticsEvent: 'crave_wheel_service_selected',
    description: 'Convenience stores',
  },
  {
    id: 'pharmacy',
    label: 'Pharmacy',
    icon: IconFirstAidKit,
    path: '/restaurants?category=health',
    enabled: true,
    comingSoon: false,
    analyticsEvent: 'crave_wheel_service_selected',
    description: 'Self care and pharmacy',
  },
  {
    id: 'send_package',
    label: 'Send Package',
    shortLabel: 'Send',
    icon: IconPackage,
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
