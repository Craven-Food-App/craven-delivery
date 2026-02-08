/**
 * Category-aware labels for the Merchant Portal.
 * Returns the right terminology based on the store's restaurant_type.
 */

export type MerchantCategoryGroup = 'restaurant' | 'retail' | 'grocery' | 'other';

const RESTAURANT_TYPES = [
  'full_service', 'fast_casual', 'quick_service', 'cafe', 'bakery',
  'ghost_kitchen', 'catering', 'food_truck',
];

const RETAIL_TYPES = [
  'retail_store', 'retail', 'specialty', 'boutique', 'electronics', 'hardware',
  'apparel', 'clothing', 'fashion', 'specialty_retail',
];

const GROCERY_TYPES = [
  'grocery', 'supermarket', 'convenience', 'deli', 'convenience_store', 'market',
];

export function getMerchantGroup(restaurantType: string | null | undefined): MerchantCategoryGroup {
  const t = (restaurantType || '').toLowerCase();
  if (RESTAURANT_TYPES.includes(t)) return 'restaurant';
  if (RETAIL_TYPES.includes(t)) return 'retail';
  if (GROCERY_TYPES.includes(t)) return 'grocery';
  return 'other';
}

export interface MerchantLabels {
  /** What to call their item catalog: "Menu" | "Products" | "Items" */
  catalogLabel: string;
  /** Sidebar label for availability tab */
  availabilityLabel: string;
  /** Subtitle for operating hours card */
  hoursDescription: string;
  /** Regular hours card title in availability dashboard */
  regularHoursTitle: string;
  /** Regular hours subtitle */
  regularHoursDescription: string;
  /** What to call a single offering: "dish" | "product" | "item" */
  itemNoun: string;
  /** Plural of itemNoun */
  itemNounPlural: string;
  /** Entity label: "restaurant" | "store" */
  entityLabel: string;
  /** "No Restaurant Found" equivalent */
  notFoundTitle: string;
  /** Toast messages */
  hoursSaveSuccess: string;
  hoursSaveError: string;
  hoursLoadError: string;
  /** Whether to show prep-time related fields */
  showPrepTime: boolean;
  /** Whether to show an Inventory tab in settings */
  showInventoryTab: boolean;
  /** Onboarding "Menu preparation" label */
  catalogPrepLabel: string;
  /** Setup page section labels */
  catalogPrepReady: string;
  catalogPrepInProgress: string;
  catalogPrepNotStarted: string;
}

export function getMerchantLabels(restaurantType: string | null | undefined): MerchantLabels {
  const group = getMerchantGroup(restaurantType);

  switch (group) {
    case 'restaurant':
      return {
        catalogLabel: 'Menu',
        availabilityLabel: 'Store availability',
        hoursDescription: "Set your restaurant's operating hours for each day of the week",
        regularHoursTitle: 'Regular menu hours',
        regularHoursDescription: 'These are the hours your restaurant is available on Crave\'N.',
        itemNoun: 'dish',
        itemNounPlural: 'dishes',
        entityLabel: 'restaurant',
        notFoundTitle: 'No Restaurant Found',
        hoursSaveSuccess: 'Restaurant hours updated successfully',
        hoursSaveError: 'Failed to save restaurant hours',
        hoursLoadError: 'Failed to load restaurant hours',
        showPrepTime: true,
        showInventoryTab: false,
        catalogPrepLabel: 'Menu preparation',
        catalogPrepReady: 'Your menu is ready',
        catalogPrepInProgress: "We're preparing your menu",
        catalogPrepNotStarted: 'Menu preparation not started',
      };

    case 'retail':
      return {
        catalogLabel: 'Products',
        availabilityLabel: 'Business hours',
        hoursDescription: "Set your store's business hours for each day of the week",
        regularHoursTitle: 'Regular business hours',
        regularHoursDescription: 'These are the hours your store is available on Crave\'N.',
        itemNoun: 'product',
        itemNounPlural: 'products',
        entityLabel: 'store',
        notFoundTitle: 'No Store Found',
        hoursSaveSuccess: 'Business hours updated successfully',
        hoursSaveError: 'Failed to save business hours',
        hoursLoadError: 'Failed to load business hours',
        showPrepTime: false,
        showInventoryTab: true,
        catalogPrepLabel: 'Product catalog',
        catalogPrepReady: 'Your product catalog is ready',
        catalogPrepInProgress: "We're setting up your product catalog",
        catalogPrepNotStarted: 'Product catalog not started',
      };

    case 'grocery':
      return {
        catalogLabel: 'Products',
        availabilityLabel: 'Store hours',
        hoursDescription: "Set your store's operating hours for each day of the week",
        regularHoursTitle: 'Regular store hours',
        regularHoursDescription: 'These are the hours your store is available on Crave\'N.',
        itemNoun: 'item',
        itemNounPlural: 'items',
        entityLabel: 'store',
        notFoundTitle: 'No Store Found',
        hoursSaveSuccess: 'Store hours updated successfully',
        hoursSaveError: 'Failed to save store hours',
        hoursLoadError: 'Failed to load store hours',
        showPrepTime: false,
        showInventoryTab: true,
        catalogPrepLabel: 'Product catalog',
        catalogPrepReady: 'Your product catalog is ready',
        catalogPrepInProgress: "We're setting up your product catalog",
        catalogPrepNotStarted: 'Product catalog not started',
      };

    default:
      return {
        catalogLabel: 'Menu',
        availabilityLabel: 'Store availability',
        hoursDescription: "Set your store's operating hours for each day of the week",
        regularHoursTitle: 'Regular hours',
        regularHoursDescription: 'These are the hours your store is available on Crave\'N.',
        itemNoun: 'item',
        itemNounPlural: 'items',
        entityLabel: 'store',
        notFoundTitle: 'No Store Found',
        hoursSaveSuccess: 'Hours updated successfully',
        hoursSaveError: 'Failed to save hours',
        hoursLoadError: 'Failed to load hours',
        showPrepTime: true,
        showInventoryTab: false,
        catalogPrepLabel: 'Menu preparation',
        catalogPrepReady: 'Your menu is ready',
        catalogPrepInProgress: "We're preparing your menu",
        catalogPrepNotStarted: 'Menu preparation not started',
      };
  }
}

