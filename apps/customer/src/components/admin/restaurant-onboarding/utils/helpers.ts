// Utility functions for Restaurant Onboarding Admin Portal

import { format, formatDistance, differenceInDays, parseISO } from 'date-fns';
import type { RestaurantOnboardingData, OnboardingStage, OnboardingStats } from '../types';

export function getOnboardingStage(restaurant: RestaurantOnboardingData): OnboardingStage {
  const { restaurant: rest, business_info_verified, menu_preparation_status, go_live_ready } = restaurant;
  
  // Rejected
  if (rest.onboarding_status === 'rejected') {
    return 'rejected';
  }
  
  // Live
  if (go_live_ready && rest.banking_complete) {
    return 'live';
  }
  
  // Ready to launch
  if (business_info_verified && rest.banking_complete && menu_preparation_status === 'ready') {
    return 'ready_to_launch';
  }
  
  // Banking setup
  if (business_info_verified && menu_preparation_status === 'ready' && !rest.banking_complete) {
    return 'banking_setup';
  }
  
  // Menu setup
  if (business_info_verified && menu_preparation_status !== 'ready') {
    return 'menu_setup';
  }
  
  // Under review
  if (hasAllDocuments(restaurant) && !business_info_verified) {
    return 'under_review';
  }
  
  // Documents pending
  if (hasPartialDocuments(restaurant)) {
    return 'documents_pending';
  }
  
  // New application
  return 'new_application';
}

export function hasAllDocuments(restaurant: RestaurantOnboardingData): boolean {
  return !!(
    restaurant.restaurant.business_license_url &&
    restaurant.restaurant.owner_id_url
  );
}

export function hasPartialDocuments(restaurant: RestaurantOnboardingData): boolean {
  return !!(
    restaurant.restaurant.business_license_url ||
    restaurant.restaurant.insurance_certificate_url ||
    restaurant.restaurant.health_permit_url ||
    restaurant.restaurant.owner_id_url
  );
}

export function getReadinessScore(restaurant: RestaurantOnboardingData): number {
  let score = 0;
  const checks = [
    restaurant.restaurant.business_license_url,
    restaurant.restaurant.owner_id_url,
    restaurant.business_info_verified,
    restaurant.menu_preparation_status === 'ready',
    restaurant.restaurant.banking_complete,
    restaurant.restaurant.logo_url,
    restaurant.restaurant.description,
    restaurant.restaurant.phone,
    restaurant.restaurant.email,
  ];
  
  checks.forEach(check => {
    if (check) score += (100 / checks.length);
  });
  
  return Math.round(score);
}

export function getStageColor(stage: OnboardingStage): string {
  const colors: Record<OnboardingStage, string> = {
    new_application: 'bg-gray-100 text-gray-700 border-gray-300',
    documents_pending: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    under_review: 'bg-blue-100 text-blue-700 border-blue-300',
    menu_setup: 'bg-purple-100 text-purple-700 border-purple-300',
    banking_setup: 'bg-indigo-100 text-indigo-700 border-indigo-300',
    ready_to_launch: 'bg-green-100 text-green-700 border-green-300',
    live: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    rejected: 'bg-red-100 text-red-700 border-red-300',
  };
  return colors[stage];
}

export function getStageName(stage: OnboardingStage): string {
  const names: Record<OnboardingStage, string> = {
    new_application: 'New Application',
    documents_pending: 'Documents Pending',
    under_review: 'Under Review',
    menu_setup: 'Menu Setup',
    banking_setup: 'Banking Setup',
    ready_to_launch: 'Ready to Launch',
    live: 'Live',
    rejected: 'Rejected',
  };
  return names[stage];
}

export function getStageIcon(stage: OnboardingStage): string {
  const icons: Record<OnboardingStage, string> = {
    new_application: '📝',
    documents_pending: '📄',
    under_review: '🔍',
    menu_setup: '🍽️',
    banking_setup: '💳',
    ready_to_launch: '🚀',
    live: '✅',
    rejected: '❌',
  };
  return icons[stage];
}

export function getDaysInStage(restaurant: RestaurantOnboardingData): number {
  const createdAt = restaurant.business_verified_at || restaurant.created_at;
  return differenceInDays(new Date(), parseISO(createdAt));
}

export function getTimeAgo(dateString: string): string {
  return formatDistance(parseISO(dateString), new Date(), { addSuffix: true });
}

export function formatDate(dateString: string, dateFormat: string = 'MMM dd, yyyy'): string {
  return format(parseISO(dateString), dateFormat);
}

export function calculateStats(restaurants: RestaurantOnboardingData[]): OnboardingStats {
  const stages = restaurants.map(getOnboardingStage);
  
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const thisWeek = restaurants.filter(r => 
    parseISO(r.created_at) >= oneWeekAgo
  ).length;
  
  const thisMonth = restaurants.filter(r => 
    parseISO(r.created_at) >= oneMonthAgo
  ).length;
  
  const liveRestaurants = restaurants.filter(r => getOnboardingStage(r) === 'live');
  const avgDays = liveRestaurants.length > 0
    ? liveRestaurants.reduce((sum, r) => sum + differenceInDays(
        r.business_verified_at ? parseISO(r.business_verified_at) : new Date(),
        parseISO(r.created_at)
      ), 0) / liveRestaurants.length
    : 0;
  
  return {
    total: restaurants.length,
    new: stages.filter(s => s === 'new_application').length,
    inProgress: stages.filter(s => ['documents_pending', 'menu_setup', 'banking_setup'].includes(s)).length,
    pendingReview: stages.filter(s => s === 'under_review').length,
    readyToLaunch: stages.filter(s => s === 'ready_to_launch').length,
    live: stages.filter(s => s === 'live').length,
    rejected: stages.filter(s => s === 'rejected').length,
    avgTimeToLaunch: Math.round(avgDays),
    conversionRate: restaurants.length > 0 ? Math.round((liveRestaurants.length / restaurants.length) * 100) : 0,
    thisWeek,
    thisMonth,
  };
}

export function getPriorityLevel(restaurant: RestaurantOnboardingData): 'high' | 'medium' | 'low' {
  const daysInStage = getDaysInStage(restaurant);
  const stage = getOnboardingStage(restaurant);
  
  // High priority if:
  // - Under review for more than 2 days
  // - Ready to launch for more than 1 day
  // - Has all documents but not verified
  if (
    (stage === 'under_review' && daysInStage > 2) ||
    (stage === 'ready_to_launch' && daysInStage > 1) ||
    (hasAllDocuments(restaurant) && !restaurant.business_info_verified)
  ) {
    return 'high';
  }
  
  // Medium priority if:
  // - In any stage for more than 5 days
  if (daysInStage > 5) {
    return 'medium';
  }
  
  return 'low';
}

export function getMissingDocuments(restaurant: RestaurantOnboardingData): string[] {
  const missing: string[] = [];
  
  if (!restaurant.restaurant.business_license_url) missing.push('Business License');
  if (!restaurant.restaurant.owner_id_url) missing.push('Owner ID');
  if (!restaurant.restaurant.insurance_certificate_url) missing.push('Insurance Certificate (Optional)');
  if (!restaurant.restaurant.health_permit_url) missing.push('Health Permit (Optional)');
  
  return missing;
}

export function sortRestaurants(
  restaurants: RestaurantOnboardingData[],
  sortBy: 'date' | 'priority' | 'stage' | 'name' | 'readiness',
  order: 'asc' | 'desc' = 'desc'
): RestaurantOnboardingData[] {
  const sorted = [...restaurants].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'date':
        comparison = parseISO(a.created_at).getTime() - parseISO(b.created_at).getTime();
        break;
      case 'priority':
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        comparison = priorityOrder[getPriorityLevel(a)] - priorityOrder[getPriorityLevel(b)];
        break;
      case 'stage':
        const stageOrder = {
          ready_to_launch: 7,
          under_review: 6,
          banking_setup: 5,
          menu_setup: 4,
          documents_pending: 3,
          new_application: 2,
          live: 1,
          rejected: 0,
        };
        comparison = stageOrder[getOnboardingStage(a)] - stageOrder[getOnboardingStage(b)];
        break;
      case 'name':
        comparison = a.restaurant.name.localeCompare(b.restaurant.name);
        break;
      case 'readiness':
        comparison = getReadinessScore(a) - getReadinessScore(b);
        break;
    }
    
    return order === 'asc' ? comparison : -comparison;
  });
  
  return sorted;
}

export function filterRestaurants(
  restaurants: RestaurantOnboardingData[],
  filters: {
    search?: string;
    stages?: OnboardingStage[];
    hasAllDocs?: boolean;
    priority?: 'high' | 'medium' | 'low';
  }
): RestaurantOnboardingData[] {
  return restaurants.filter(restaurant => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matches = 
        restaurant.restaurant.name.toLowerCase().includes(searchLower) ||
        restaurant.restaurant.email?.toLowerCase().includes(searchLower) ||
        restaurant.restaurant.city?.toLowerCase().includes(searchLower) ||
        restaurant.restaurant.cuisine_type?.toLowerCase().includes(searchLower);
      
      if (!matches) return false;
    }
    
    // Stage filter
    if (filters.stages && filters.stages.length > 0) {
      if (!filters.stages.includes(getOnboardingStage(restaurant))) return false;
    }
    
    // Documents filter
    if (filters.hasAllDocs !== undefined) {
      if (filters.hasAllDocs && !hasAllDocuments(restaurant)) return false;
      if (!filters.hasAllDocs && hasAllDocuments(restaurant)) return false;
    }
    
    // Priority filter
    if (filters.priority) {
      if (getPriorityLevel(restaurant) !== filters.priority) return false;
    }
    
    return true;
  });
}


