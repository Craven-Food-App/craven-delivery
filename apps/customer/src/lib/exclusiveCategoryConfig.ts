/**
 * Crave Wheel / category nav → exclusive filtered marketplace views.
 * When active, the home feed is replaced with only this category.
 */

export type ExclusiveMarketplaceCategory =
  | 'restaurants'
  | 'apparel'
  | 'grocery'
  | 'convenience'
  | 'health'
  | 'beauty'
  | 'pets';

export interface ExclusiveCategoryConfig {
  id: ExclusiveMarketplaceCategory;
  title: string;
  sectionTitle: string;
  marketplaceType: 'restaurant' | 'retail';
  /** Soft match against cuisine_type + name */
  cuisineKeywords?: string[];
  useNearbyByLocation?: boolean;
  useMarketplaceCatalog?: boolean;
}

const EXCLUSIVE_IDS: ExclusiveMarketplaceCategory[] = [
  'restaurants',
  'apparel',
  'grocery',
  'convenience',
  'health',
  'beauty',
  'pets',
];

export function isExclusiveCategory(id: string | null | undefined): id is ExclusiveMarketplaceCategory {
  return !!id && (EXCLUSIVE_IDS as string[]).includes(id);
}

export function getExclusiveCategoryConfig(
  id: string | null | undefined
): ExclusiveCategoryConfig | null {
  if (!isExclusiveCategory(id)) return null;

  switch (id) {
    case 'restaurants':
      return {
        id,
        title: 'Food',
        sectionTitle: 'Restaurants Near You',
        marketplaceType: 'restaurant',
        useNearbyByLocation: true,
      };
    case 'apparel':
      return {
        id,
        title: 'Retail',
        sectionTitle: 'Retail Near You',
        marketplaceType: 'retail',
        useNearbyByLocation: true,
        useMarketplaceCatalog: true,
      };
    case 'grocery':
      return {
        id,
        title: 'Grocery',
        sectionTitle: 'Grocery Near You',
        marketplaceType: 'retail',
        cuisineKeywords: ['grocery', 'supermarket', 'market', 'produce'],
        useMarketplaceCatalog: true,
      };
    case 'convenience':
      return {
        id,
        title: 'Store',
        sectionTitle: 'Convenience Stores Near You',
        marketplaceType: 'retail',
        cuisineKeywords: ['convenience', 'c-store', 'gas', 'corner'],
        useMarketplaceCatalog: true,
      };
    case 'health':
      return {
        id,
        title: 'RX',
        sectionTitle: 'Pharmacy & Self Care Near You',
        marketplaceType: 'retail',
        cuisineKeywords: [
          'health',
          'pharmacy',
          'rx',
          'drug',
          'wellness',
          'self care',
          'vitamin',
        ],
        useMarketplaceCatalog: true,
      };
    case 'beauty':
      return {
        id,
        title: 'Cosmetics',
        sectionTitle: 'Cosmetic Stores Near You',
        marketplaceType: 'retail',
        cuisineKeywords: ['beauty', 'cosmetic', 'makeup', 'skincare'],
        useMarketplaceCatalog: true,
      };
    case 'pets':
      return {
        id,
        title: 'Pets',
        sectionTitle: 'Pet Stores Near You',
        marketplaceType: 'retail',
        cuisineKeywords: ['pet', 'animal', 'vet'],
        useMarketplaceCatalog: true,
      };
    default:
      return null;
  }
}

/** Valid ?category= values including home/browse */
export const RESTAURANTS_CATEGORY_PARAM_IDS = [
  'all',
  'browse',
  'restaurants',
  'grocery',
  'convenience',
  'beauty',
  'apparel',
  'pets',
  'health',
] as const;
