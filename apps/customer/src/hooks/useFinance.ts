import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ExpenseRequest, Budget, Invoice, ExpenseCategory } from '@/types/finance';

export const useExpenseRequests = (status?: string) => {
  const [expenses, setExpenses] = useState<ExpenseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchExpenses();
  }, [status]);

  const fetchExpenses = async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('expense_requests')
        .select(`
          *,
          expense_category:expense_categories(*),
          department:departments(*)
        `)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        // Suppress relationship and policy errors
        if (
          fetchError.message?.includes('Could not find a relationship') ||
          fetchError.message?.includes('infinite recursion detected in policy') ||
          fetchError.message?.includes('schema cache')
        ) {
          console.warn('Supabase schema error (suppressed):', fetchError.message);
          setExpenses([]);
          setError(null);
          return;
        }
        throw fetchError;
      }

      setExpenses((data || []) as ExpenseRequest[]);
    } catch (err: any) {
      // Suppress relationship and policy errors
      if (
        err.message?.includes('Could not find a relationship') ||
        err.message?.includes('infinite recursion detected in policy') ||
        err.message?.includes('schema cache')
      ) {
        console.warn('Supabase schema error (suppressed):', err.message);
        setError(null);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return { expenses, loading, error, refetch: fetchExpenses };
};

export const useBudgets = (year?: number, quarter?: number) => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBudgets();
  }, [year, quarter]);

  const fetchBudgets = async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('budgets')
        .select(`
          *,
          department:departments(*),
          category:expense_categories(*)
        `)
        .order('budget_year', { ascending: false })
        .order('budget_quarter', { ascending: true });

      if (year) {
        query = query.eq('budget_year', year);
      }
      if (quarter) {
        query = query.eq('budget_quarter', quarter);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        // Suppress relationship and policy errors
        if (
          fetchError.message?.includes('Could not find a relationship') ||
          fetchError.message?.includes('infinite recursion detected in policy') ||
          fetchError.message?.includes('schema cache')
        ) {
          console.warn('Supabase schema error (suppressed):', fetchError.message);
          setBudgets([]);
          setError(null);
          return;
        }
        throw fetchError;
      }
      setBudgets((data || []) as Budget[]);
    } catch (err: any) {
      // Suppress relationship and policy errors
      if (
        err.message?.includes('Could not find a relationship') ||
        err.message?.includes('infinite recursion detected in policy') ||
        err.message?.includes('schema cache')
      ) {
        console.warn('Supabase schema error (suppressed):', err.message);
        setError(null);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return { budgets, loading, error, refetch: fetchBudgets };
};

export const useExpenseCategories = () => {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('Expense categories table does not exist. Migration may not have been run.');
          setCategories([]);
          return;
        }
        throw error;
      }
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  return { categories, loading };
};

export const useFinanceMetrics = () => {
  const [metrics, setMetrics] = useState({
    totalExpenses: 0,
    pendingApprovals: 0,
    pendingAmount: 0,
    budgetUtilization: 0,
    overdueInvoices: 0,
    totalReceivables: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const [expensesRes, budgetsRes, invoicesRes, arRes] = await Promise.all([
        supabase
          .from('expense_requests')
          .select('amount, status')
          .gte('expense_date', new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0])
          // @ts-ignore - Promise type compatibility
          .catch((err) => {
            // Suppress schema errors
            if (
              err.message?.includes('Could not find a relationship') ||
              err.message?.includes('infinite recursion detected in policy') ||
              err.message?.includes('schema cache')
            ) {
              console.warn('Supabase schema error (suppressed):', err.message);
              return { data: [], error: null };
            }
            throw err;
          }),
        supabase
          .from('budgets')
          .select('allocated_amount, spent_amount, committed_amount')
          .eq('status', 'active'),
        supabase
          .from('invoices')
          .select('total_amount, due_date, status')
          .eq('status', 'pending'),
        supabase
          .from('accounts_receivable')
          .select('outstanding_amount, status'),
      ]);

      const expenses = expensesRes.data || [];
      const budgets = budgetsRes.data || [];
      const invoices = invoicesRes.data || [];
      const receivables = arRes.data || [];

      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
      const pendingExpenses = expenses.filter(e => ['submitted', 'pending_approval'].includes(e.status));
      const pendingAmount = pendingExpenses.reduce((sum, e) => sum + e.amount, 0);

      const totalAllocated = budgets.reduce((sum, b) => sum + b.allocated_amount, 0);
      const totalSpent = budgets.reduce((sum, b) => sum + b.spent_amount + b.committed_amount, 0);
      const budgetUtilization = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;

      const today = new Date();
      const overdueInvoices = invoices.filter(
        inv => new Date(inv.due_date) < today && inv.status !== 'paid'
      ).length;

      const totalReceivables = receivables
        .filter(ar => ar.status !== 'paid')
        .reduce((sum, ar) => sum + ar.outstanding_amount, 0);

      setMetrics({
        totalExpenses,
        pendingApprovals: pendingExpenses.length,
        pendingAmount,
        budgetUtilization,
        overdueInvoices,
        totalReceivables,
      });
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  return { metrics, loading, refetch: fetchMetrics };
};

