// =====================================================
// CXO PORTAL TYPE DEFINITIONS
// =====================================================

// Experience Metrics
export interface ExperienceMetricsSnapshot {
  id: string;
  capturedAt: string;
  timeBucket: 'hour' | 'day' | 'week';
  openOrders: number;
  delayedOrders: number;
  avgDeliveryMinutes: number | null;
  maxDeliveryMinutes: number | null;
  driverOnlineCount: number;
  driverOfflineCount: number;
  ticketsOpenCount: number;
  ticketsEscalatedCount: number;
  cancellationRate: number;
  atRiskRestaurantsCount: number;
  problemZones: ProblemZone[];
  createdAt: string;
}

export interface ProblemZone {
  zone: string;
  delayedOrders: number;
  avgDeliveryTime?: number;
}

// Experience Tickets
export interface ExperienceTicket {
  id: string;
  externalTicketId: string | null;
  type: 'driver' | 'customer' | 'merchant' | 'system';
  category: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  summary: string;
  description: string;
  customerId: string | null;
  driverId: string | null;
  merchantId: string | null;
  zone: string | null;
  createdBy: string | null;
  assignedTo: string | null;
  resolutionNotes: string | null;
  rootCauseTag: string | null;
  approvedCreditAmount: number | null;
  needsCxoApproval: boolean;
  createdAt: string;
  updatedAt: string;
}

// Drivers
export interface Driver {
  id: string;
  name: string;
  phone: string | null;
  status: 'active' | 'inactive' | 'suspended';
  onlineState: 'online' | 'offline';
  homeZone: string | null;
  rating: number | null;
  createdAt: string;
}

// Merchants
export interface Merchant {
  id: string;
  name: string;
  address: string | null;
  zone: string | null;
  status: 'active' | 'paused' | 'offline';
  avgPrepMinutes: number | null;
  rating: number | null;
  isAtRisk: boolean;
  createdAt: string;
}

// Support Staff
export interface SupportStaff {
  id: string;
  userId: string | null;
  role: 'support_agent' | 'support_manager' | 'driver_onboarding' | 'merchant_success';
  name: string;
  active: boolean;
  createdAt: string;
}

export interface SupportStaffMetrics {
  id: string;
  staffId: string;
  date: string;
  ticketsResolved: number;
  avgHandleMinutes: number | null;
  escalationsCount: number;
  csatScore: number | null;
  notes: string | null;
  createdAt: string;
}

// Experience Analytics
export interface ExperienceAnalytics {
  id: string;
  date: string;
  csatScore: number | null;
  npsScore: number | null;
  totalSurveys: number | null;
  avgDeliveryMinutes: number | null;
  lateDeliveryRate: number | null;
  repeatComplaintRate: number | null;
  segment: 'driver' | 'customer' | 'merchant' | 'global';
  createdAt: string;
}

// Experience Initiatives
export interface ExperienceInitiative {
  id: string;
  title: string;
  problemStatement: string;
  rootCause: string | null;
  plan: string;
  ownerId: string | null;
  status: 'planned' | 'in_progress' | 'completed' | 'on_hold';
  impactMetrics: ImpactMetrics;
  startDate: string;
  targetDate: string | null;
  completedDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ImpactMetrics {
  targetMetric?: string;
  baseline?: number;
  target?: number;
  current?: number;
}

// Experience Incidents
export interface ExperienceIncident {
  id: string;
  title: string;
  description: string;
  type: 'system_outage' | 'merchant_outage' | 'driver_shortage' | 'safety' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'mitigating' | 'resolved' | 'closed';
  zone: string | null;
  reportedAt: string;
  resolvedAt: string | null;
  ownerId: string | null;
  linkedTicketId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// CXO Reports
export interface CxoReport {
  id: string;
  reportDate: string;
  type: 'daily' | 'weekly';
  biggestIssue: string | null;
  fixDeployed: string | null;
  metricsMoved: string | null;
  ticketBacklogStatus: string | null;
  recommendationForTomorrow: string | null;
  authorId: string | null;
  createdAt: string;
}

