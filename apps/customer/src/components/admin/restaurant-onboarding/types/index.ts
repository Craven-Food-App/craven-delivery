// Enhanced Restaurant Onboarding Types for Admin Portal

export type OnboardingStage = 
  | 'new_application'
  | 'documents_pending'
  | 'under_review'
  | 'menu_setup'
  | 'banking_setup'
  | 'ready_to_launch'
  | 'live'
  | 'rejected';

export type VerificationStatus = 'pending' | 'approved' | 'rejected' | 'needs_info';

export type DocumentType = 
  | 'business_license'
  | 'insurance_certificate'
  | 'health_permit'
  | 'owner_id'
  | 'w9';

export interface RestaurantOnboardingData {
  id: string;
  restaurant_id: string;
  restaurant: {
    name: string;
    owner_id: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zip_code: string;
    cuisine_type: string | null;
    logo_url: string | null;
    onboarding_status: string | null;
    created_at: string;
    banking_complete: boolean | null;
    readiness_score: number | null;
    business_license_url: string | null;
    insurance_certificate_url: string | null;
    health_permit_url: string | null;
    owner_id_url: string | null;
    business_verified_at: string | null;
    verification_notes: any;
    restaurant_type: string | null;
    expected_monthly_orders: number | null;
    description: string | null;
  };
  menu_preparation_status: 'not_started' | 'in_progress' | 'ready';
  business_info_verified: boolean;
  go_live_ready: boolean;
  admin_notes: string | null;
  business_verified_at: string | null;
  menu_ready_at: string | null;
  tablet_shipped: boolean | null;
  tablet_shipped_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OnboardingStats {
  total: number;
  new: number;
  inProgress: number;
  pendingReview: number;
  readyToLaunch: number;
  live: number;
  rejected: number;
  avgTimeToLaunch: number; // in days
  conversionRate: number; // percentage
  thisWeek: number;
  thisMonth: number;
}

export interface FilterOptions {
  stage?: OnboardingStage[];
  verificationStatus?: VerificationStatus[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  search?: string;
  cuisineType?: string[];
  hasAllDocuments?: boolean;
  priority?: boolean;
}

export interface BulkAction {
  type: 'approve' | 'reject' | 'request_info' | 'assign' | 'archive';
  restaurantIds: string[];
  notes?: string;
  assignToAdminId?: string;
}

export interface AdminActivity {
  id: string;
  admin_id: string;
  admin_name: string;
  restaurant_id: string;
  restaurant_name: string;
  action: string;
  notes: string | null;
  created_at: string;
}

export interface DocumentVerification {
  document_type: DocumentType;
  status: VerificationStatus;
  url: string | null;
  verified_at: string | null;
  verified_by: string | null;
  notes: string | null;
  issues: string[];
}


