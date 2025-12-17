// Intern Training & Onboarding Module Types

export type ModuleStatus = 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED' | 'LOCKED';
export type DeliveryType = 'Video' | 'Interactive' | 'Document';
export type ModuleScope = 'CORE' | 'MARKETING_GROWTH' | 'ENGINEERING_TECH' | 'OPERATIONS_STRATEGY' | 'FINANCE_ADMIN';

export const SCOPE_LABELS: Record<ModuleScope, string> = {
  CORE: 'Core Training',
  MARKETING_GROWTH: 'Marketing & Growth',
  ENGINEERING_TECH: 'Engineering & Tech',
  OPERATIONS_STRATEGY: 'Operations & Strategy',
  FINANCE_ADMIN: 'Finance & Admin',
};

export const SCOPE_COLORS: Record<ModuleScope, { bg: string; text: string; border: string }> = {
  CORE: { bg: '#fef3c7', text: '#d97706', border: '#fbbf24' },
  MARKETING_GROWTH: { bg: '#dbeafe', text: '#2563eb', border: '#3b82f6' },
  ENGINEERING_TECH: { bg: '#f3e8ff', text: '#7c3aed', border: '#8b5cf6' },
  OPERATIONS_STRATEGY: { bg: '#dcfce7', text: '#16a34a', border: '#22c55e' },
  FINANCE_ADMIN: { bg: '#fce7f3', text: '#db2777', border: '#ec4899' },
};

export const STATUS_COLORS: Record<ModuleStatus, { bg: string; text: string; border: string }> = {
  COMPLETED: { bg: '#ecfdf5', text: '#10b981', border: '#10b981' },
  IN_PROGRESS: { bg: '#fef3c7', text: '#f59e0b', border: '#f59e0b' },
  AVAILABLE: { bg: '#eff6ff', text: '#3b82f6', border: '#3b82f6' },
  LOCKED: { bg: '#f3f4f6', text: '#6b7280', border: '#d1d5db' },
};

export const DELIVERY_TYPE_LABELS: Record<DeliveryType, string> = {
  Video: 'Video',
  Interactive: 'Interactive',
  Document: 'Document',
};

export interface TrainingModule {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  delivery_type: DeliveryType;
  scope: ModuleScope;
  is_required: boolean;
  certification_issued: boolean;
  passing_score: number | null;
  prerequisite_module_ids: string[];
  unlock_after_weeks: number | null;
  admin_unlock_only: boolean;
  performance_flag_required: boolean;
  content_url: string | null;
  content_json: Record<string, unknown>;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ModuleProgress {
  id: string;
  user_id: string;
  module_id: string;
  status: ModuleStatus;
  progress_percent: number;
  score: number | null;
  started_at: string | null;
  completed_at: string | null;
  last_activity_at: string;
  time_spent_minutes: number;
  attempts: number;
}

export interface Certification {
  id: string;
  user_id: string;
  module_id: string;
  module_name: string;
  score: number;
  issued_at: string;
  certificate_url: string | null;
  verification_code: string;
  expires_at: string | null;
}

export interface InternActivationStatus {
  id: string;
  user_id: string;
  role_track: ModuleScope;
  core_modules_completed: boolean;
  role_modules_completed: boolean;
  is_activated: boolean;
  activated_at: string | null;
  onboarding_started_at: string;
  created_at: string;
  updated_at: string;
}

export interface ModuleUnlock {
  id: string;
  user_id: string;
  module_id: string;
  unlocked_by: string;
  unlocked_at: string;
  reason: string;
}

// Combined type for display
export interface ModuleWithProgress extends TrainingModule {
  progress: ModuleProgress | null;
  certification: Certification | null;
  effectiveStatus: ModuleStatus;
  isUnlocked: boolean;
}

// Stats interface
export interface TrainingStats {
  completed: number;
  inProgress: number;
  available: number;
  locked: number;
  total: number;
  requiredCompleted: number;
  requiredTotal: number;
  overallProgress: number;
  avgScore: number;
  certCount: number;
  totalTimeMinutes: number;
  timeSpentMinutes: number;
}

// Helper function to format duration
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}m`;
}

// Helper function to calculate overall progress
export function calculateOverallProgress(
  modules: ModuleWithProgress[],
  requiredOnly: boolean = true
): number {
  const relevantModules = requiredOnly 
    ? modules.filter(m => m.is_required) 
    : modules;
  
  if (relevantModules.length === 0) return 0;
  
  const totalProgress = relevantModules.reduce((acc, m) => {
    if (m.effectiveStatus === 'COMPLETED') return acc + 100;
    if (m.effectiveStatus === 'IN_PROGRESS') return acc + (m.progress?.progress_percent || 0);
    return acc;
  }, 0);
  
  return Math.round(totalProgress / relevantModules.length);
}

