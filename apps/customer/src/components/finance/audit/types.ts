// Type definitions for Finance Audit Component

export interface AuditLog {
  id: string;
  transaction_id?: string;
  transaction_type: 'revenue' | 'expense' | 'payout' | 'invoice' | 'payment' | 'refund' | 'adjustment' | 'reconciliation';
  amount: number;
  currency: string;
  source: 'stripe' | 'ach' | 'manual' | 'payout' | 'invoice' | 'bank_transfer' | 'wire' | 'check';
  transaction_date: string;
  entered_date: string;
  cleared_date?: string;
  entered_by?: string;
  reviewed_by?: string;
  approved_by?: string;
  status: 'cleared' | 'pending' | 'flagged' | 'under_review' | 'rejected' | 'approved';
  flag_reason?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  has_documentation: boolean;
  documentation_count: number;
  account_category?: string;
  expense_category?: string;
  linked_vendor_id?: string;
  linked_driver_id?: string;
  linked_merchant_id?: string;
  linked_customer_id?: string;
  linked_order_id?: string;
  notes?: string;
  internal_notes?: string;
  cfo_comment?: string;
  ip_address?: string;
  user_agent?: string;
  device_info?: any;
  geo_location?: any;
  risk_score: number;
  anomaly_detected: boolean;
  ai_confidence_score?: number;
  audit_trail: any[];
  created_at: string;
  updated_at: string;
  locked_at?: string;
}

export interface AuditFlag {
  id: string;
  flag_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  audit_log_id?: string;
  transaction_id?: string;
  status: 'open' | 'investigating' | 'resolved' | 'false_positive' | 'escalated';
  resolved_by?: string;
  resolved_at?: string;
  resolution_notes?: string;
  detected_at: string;
  detected_by: string;
  confidence_score?: number;
  created_at: string;
  updated_at: string;
}

export interface AuditTrailEntry {
  id: string;
  action_type: string;
  action_description: string;
  target_type?: string;
  target_id?: string;
  user_id?: string;
  user_email?: string;
  user_role?: string;
  old_values?: any;
  new_values?: any;
  changed_fields?: string[];
  ip_address?: string;
  user_agent?: string;
  device_info?: any;
  geo_location?: any;
  session_id?: string;
  metadata?: any;
  created_at: string;
}

export interface AuditDocument {
  id: string;
  document_type: string;
  document_name: string;
  file_url: string;
  file_size_bytes?: number;
  mime_type?: string;
  audit_log_id?: string;
  transaction_id?: string;
  uploaded_by?: string;
  uploaded_at: string;
  description?: string;
  tags?: string[];
  verified: boolean;
  verified_by?: string;
  verified_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AuditReport {
  id: string;
  report_type: 'monthly_audit' | 'quarterly_audit' | 'annual_compliance' | 'cfo_certification' | 'ceo_summary' | 'board_audit_packet' | 'ad_hoc';
  report_name: string;
  report_period_start: string;
  report_period_end: string;
  report_data: any;
  summary?: string;
  status: 'draft' | 'final' | 'approved' | 'archived';
  generated_by?: string;
  generated_at: string;
  approved_by?: string;
  approved_at?: string;
  pdf_url?: string;
  created_at: string;
  updated_at: string;
}

export interface ReconciliationBank {
  id: string;
  account_type: 'stripe_balance' | 'operating_account' | 'payout_account' | 'disputed_amount';
  account_name: string;
  reconciliation_date: string;
  reconciliation_period_start: string;
  reconciliation_period_end: string;
  opening_balance: number;
  closing_balance: number;
  expected_balance?: number;
  actual_balance?: number;
  variance?: number;
  status: 'pending' | 'in_progress' | 'reconciled' | 'discrepancy' | 'resolved';
  reconciled_by?: string;
  reconciled_at?: string;
  checklist_completed: boolean;
  checklist_items: any[];
  notes?: string;
  discrepancy_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ReconciliationLedger {
  id: string;
  reconciliation_date: string;
  reconciliation_period_start: string;
  reconciliation_period_end: string;
  mismatch_type: 'missing_entry' | 'duplicate_entry' | 'amount_mismatch' | 'date_mismatch' | 'category_mismatch';
  description: string;
  audit_log_id?: string;
  ledger_entry_id?: string;
  expected_amount?: number;
  actual_amount?: number;
  variance?: number;
  auto_suggestion?: any;
  suggestion_confidence?: number;
  status: 'open' | 'investigating' | 'resolved' | 'false_positive';
  resolved_by?: string;
  resolved_at?: string;
  resolution_action?: string;
  manual_adjustment_log?: any[];
  created_at: string;
  updated_at: string;
}

export interface AIAnomaly {
  id: string;
  anomaly_type: 'spending_spike' | 'revenue_drop' | 'payout_irregularity' | 'merchant_delay' | 'fraud_pattern' | 'duplicate' | 'suspicious_refund' | 'outlier_transaction';
  description: string;
  audit_log_id?: string;
  transaction_id?: string;
  confidence_score: number;
  risk_score: number;
  anomaly_data: any;
  recommended_actions: string[];
  next_steps: string[];
  status: 'detected' | 'reviewing' | 'investigating' | 'resolved' | 'false_positive' | 'escalated';
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  detected_at: string;
  created_at: string;
  updated_at: string;
}

export interface AuditMetrics {
  totalRevenueMTD: number;
  totalRevenueQTD: number;
  totalRevenueYTD: number;
  totalExpensesMTD: number;
  totalExpensesQTD: number;
  totalExpensesYTD: number;
  netOperatingMargin: number;
  cashOnHand: number;
  accountsPayable: number;
  accountsReceivable: number;
  burnRate: number;
  runwayMonths: number;
  lastCompletedAudit?: string;
  internalControlStatus: 'compliant' | 'needs_attention' | 'critical';
  outstandingFlags: number;
  highRiskTransactions: number;
  unreconciledAccountsCount: number;
  missingDocumentationCount: number;
}



