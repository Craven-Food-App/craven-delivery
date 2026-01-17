import { supabase } from '@/integrations/supabase/client';
import { ExpenseRequest, Budget } from '@/types/finance';
import dayjs from 'dayjs';

/**
 * Format currency amount
 */
export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Calculate budget utilization percentage
 */
export const calculateBudgetUtilization = (budget: Budget): number => {
  const totalUsed = budget.spent_amount + budget.committed_amount;
  return budget.allocated_amount > 0
    ? Math.min(100, (totalUsed / budget.allocated_amount) * 100)
    : 0;
};

/**
 * Get budget status color based on utilization
 */
export const getBudgetStatusColor = (utilization: number): string => {
  if (utilization >= 100) return 'red';
  if (utilization >= 80) return 'orange';
  if (utilization >= 50) return 'yellow';
  return 'green';
};

/**
 * Check if expense requires approval
 */
export const requiresApproval = (
  amount: number,
  categoryThreshold: number,
  categoryRequiresApproval: boolean
): boolean => {
  return categoryRequiresApproval && amount >= categoryThreshold;
};

/**
 * Check if invoice is overdue
 */
export const isInvoiceOverdue = (dueDate: string, status: string): boolean => {
  return dayjs(dueDate).isBefore(dayjs(), 'day') && status !== 'paid';
};

/**
 * Calculate days until due date
 */
export const daysUntilDue = (dueDate: string): number => {
  return dayjs(dueDate).diff(dayjs(), 'day');
};

/**
 * Get expense status color
 */
export const getExpenseStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    draft: 'gray',
    submitted: 'blue',
    pending_approval: 'orange',
    approved: 'green',
    rejected: 'red',
    paid: 'teal',
    cancelled: 'dark',
  };
  return colors[status] || 'gray';
};

/**
 * Get priority color
 */
export const getPriorityColor = (priority: string): string => {
  const colors: Record<string, string> = {
    low: 'gray',
    normal: 'blue',
    high: 'orange',
    urgent: 'red',
  };
  return colors[priority] || 'blue';
};

/**
 * Generate expense request number
 */
export const generateExpenseNumber = async (): Promise<string> => {
  const year = new Date().getFullYear();
  try {
    const { count, error } = await supabase
      .from('expense_requests')
      .select('*', { count: 'exact', head: true })
      .like('request_number', `EXP-${year}-%`);

    // Suppress schema errors
    if (
      error &&
      (error.message?.includes('Could not find a relationship') ||
        error.message?.includes('infinite recursion detected in policy') ||
        error.message?.includes('schema cache'))
    ) {
      console.warn('Supabase schema error (suppressed):', error.message);
      return `EXP-${year}-000001`;
    }

    if (error) throw error;
    const seqNum = (count || 0) + 1;
    return `EXP-${year}-${seqNum.toString().padStart(6, '0')}`;
  } catch (error: any) {
    // Fallback if table doesn't exist
    if (error.code === '42P01' || error.message?.includes('does not exist')) {
      return `EXP-${year}-000001`;
    }
    throw error;
  }
};

/**
 * Calculate total expenses by category
 */
export const calculateExpensesByCategory = (
  expenses: ExpenseRequest[]
): Record<string, number> => {
  return expenses.reduce((acc, expense) => {
    const category = expense.expense_category?.name || 'Other';
    acc[category] = (acc[category] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);
};

/**
 * Calculate total expenses by department
 */
export const calculateExpensesByDepartment = (
  expenses: ExpenseRequest[]
): Record<string, number> => {
  return expenses.reduce((acc, expense) => {
    const department = expense.department?.name || 'Unassigned';
    acc[department] = (acc[department] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);
};

/**
 * Filter expenses by date range
 */
export const filterExpensesByDateRange = (
  expenses: ExpenseRequest[],
  startDate: Date,
  endDate: Date
): ExpenseRequest[] => {
  return expenses.filter(expense => {
    const expenseDate = dayjs(expense.expense_date);
    return (
      expenseDate.isAfter(dayjs(startDate).subtract(1, 'day')) &&
      expenseDate.isBefore(dayjs(endDate).add(1, 'day'))
    );
  });
};

/**
 * Calculate budget variance
 */
export const calculateBudgetVariance = (budget: Budget): {
  variance: number;
  variancePercent: number;
  isOverBudget: boolean;
} => {
  const totalUsed = budget.spent_amount + budget.committed_amount;
  const variance = budget.allocated_amount - totalUsed;
  const variancePercent = budget.allocated_amount > 0
    ? (variance / budget.allocated_amount) * 100
    : 0;
  const isOverBudget = totalUsed > budget.allocated_amount;

  return {
    variance,
    variancePercent,
    isOverBudget,
  };
};

/**
 * Get approval workflow based on amount
 */
export const getApprovalWorkflow = (
  amount: number,
  userApprovalLimit: number
): {
  requiresApproval: boolean;
  approverLevel: number;
} => {
  if (amount <= userApprovalLimit) {
    return { requiresApproval: false, approverLevel: 0 };
  }

  // Define approval levels based on amount thresholds
  if (amount <= 1000) {
    return { requiresApproval: true, approverLevel: 1 }; // Manager
  } else if (amount <= 5000) {
    return { requiresApproval: true, approverLevel: 2 }; // Director
  } else if (amount <= 25000) {
    return { requiresApproval: true, approverLevel: 3 }; // VP
  } else {
    return { requiresApproval: true, approverLevel: 4 }; // CFO
  }
};

/**
 * Format expense request for display
 */
export const formatExpenseRequest = (expense: ExpenseRequest): string => {
  return `${expense.request_number} - ${expense.description} (${formatCurrency(expense.amount)})`;
};

/**
 * Calculate aging for accounts receivable
 */
export const calculateAging = (dueDate: string): {
  days: number;
  category: 'current' | '1-30' | '31-60' | '61-90' | '90+';
} => {
  const days = dayjs().diff(dayjs(dueDate), 'day');

  let category: 'current' | '1-30' | '31-60' | '61-90' | '90+';
  if (days <= 0) {
    category = 'current';
  } else if (days <= 30) {
    category = '1-30';
  } else if (days <= 60) {
    category = '31-60';
  } else if (days <= 90) {
    category = '61-90';
  } else {
    category = '90+';
  }

  return { days: Math.abs(days), category };
};

/**
 * Validate expense request data
 */
export const validateExpenseRequest = (data: Partial<ExpenseRequest>): {
  valid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  if (!data.expense_category_id) {
    errors.push('Expense category is required');
  }

  if (!data.amount || data.amount <= 0) {
    errors.push('Amount must be greater than 0');
  }

  if (!data.description || data.description.trim().length === 0) {
    errors.push('Description is required');
  }

  if (!data.business_purpose || data.business_purpose.trim().length === 0) {
    errors.push('Business purpose is required');
  }

  if (!data.expense_date) {
    errors.push('Expense date is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

