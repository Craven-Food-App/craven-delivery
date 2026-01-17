export interface ExpenseRequest {
  id: string;
  request_number: string;
  requester_id: string;
  requester_employee_id?: string;
  department_id?: string;
  expense_category_id: string;
  amount: number;
  currency: string;
  description: string;
  business_purpose: string;
  justification?: string;
  expense_date: string;
  requested_date: string;
  due_date?: string;
  status: 'draft' | 'submitted' | 'pending_approval' | 'approved' | 'rejected' | 'paid' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  approver_id?: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  payment_method: 'company_card' | 'reimbursement' | 'direct_pay' | 'wire_transfer';
  vendor_name?: string;
  vendor_account_number?: string;
  receipt_urls: string[];
  supporting_documents: string[];
  gl_account_code?: string;
  cost_center?: string;
  project_code?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  expense_category?: ExpenseCategory;
  department?: Department;
  requester?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export interface ExpenseCategory {
  id: string;
  name: string;
  code: string;
  parent_category_id?: string;
  description?: string;
  requires_receipt: boolean;
  requires_approval: boolean;
  approval_threshold: number;
  budget_code?: string;
  is_active: boolean;
  created_at: string;
}

export interface Budget {
  id: string;
  budget_name: string;
  budget_year: number;
  budget_quarter?: number;
  department_id?: string;
  category_id?: string;
  allocated_amount: number;
  spent_amount: number;
  committed_amount: number;
  remaining_amount: number;
  status: 'draft' | 'active' | 'closed' | 'archived';
  created_by?: string;
  approved_by?: string;
  approved_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  department?: Department;
  category?: ExpenseCategory;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  vendor_id?: string;
  vendor_name: string;
  vendor_email?: string;
  vendor_address?: string;
  invoice_date: string;
  due_date: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  status: 'pending' | 'approved' | 'paid' | 'disputed' | 'cancelled';
  department_id?: string;
  expense_category_id?: string;
  budget_id?: string;
  line_items: InvoiceLineItem[];
  approver_id?: string;
  approved_by?: string;
  approved_at?: string;
  payment_method?: string;
  payment_date?: string;
  payment_reference?: string;
  paid_by?: string;
  invoice_file_url?: string;
  supporting_documents: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
  department?: Department;
  expense_category?: ExpenseCategory;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export interface AccountsReceivable {
  id: string;
  invoice_number: string;
  customer_id?: string;
  customer_name: string;
  customer_email?: string;
  invoice_date: string;
  due_date: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  status: 'pending' | 'partial' | 'paid' | 'overdue' | 'written_off';
  order_id?: string;
  payment_terms: string;
  payments: PaymentRecord[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentRecord {
  date: string;
  amount: number;
  method: string;
  reference: string;
}

export interface FinancialReport {
  id: string;
  report_name: string;
  report_type: 'income_statement' | 'balance_sheet' | 'cash_flow' | 'budget_variance' | 'expense_analysis' | 'custom';
  report_period_start: string;
  report_period_end: string;
  generated_by?: string;
  generated_at: string;
  report_data: Record<string, any>;
  summary?: string;
  status: 'draft' | 'final' | 'archived';
  is_public: boolean;
  pdf_url?: string;
  excel_url?: string;
  created_at: string;
}

export interface FinancePosition {
  id: string;
  position_title: string;
  position_level: number;
  department: string;
  reports_to_position_id?: string;
  min_salary?: number;
  max_salary?: number;
  required_experience_years: number;
  required_education: 'bachelor' | 'master' | 'mba' | 'cpa' | 'cfa';
  key_responsibilities: string[];
  required_skills: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  reports_to_position?: FinancePosition;
}

export interface FinanceEmployee {
  id: string;
  employee_id: string;
  position_id: string;
  hire_date: string;
  start_date: string;
  employment_status: 'active' | 'on-leave' | 'terminated' | 'suspended';
  termination_date?: string;
  manager_id?: string;
  access_level: number;
  can_approve_expenses_up_to: number;
  can_create_budgets: boolean;
  can_view_all_financials: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  employee?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  position?: FinancePosition;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  budget: number;
  head_employee_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ExpenseApprovalLog {
  id: string;
  expense_request_id: string;
  action: 'submitted' | 'approved' | 'rejected' | 'returned' | 'escalated';
  actor_id?: string;
  actor_name?: string;
  comments?: string;
  previous_status: string;
  new_status: string;
  created_at: string;
}

