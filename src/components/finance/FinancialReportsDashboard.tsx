import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Select,
  TextInput,
  Stack,
  Group,
  Text,
  Paper,
  Table,
  Badge,
  ActionIcon,
  Tooltip,
  Loader,
  Center,
  Modal,
  Grid,
  Divider,
  Title,
  Tabs,
  ScrollArea,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { supabase } from '@/integrations/supabase/client';
import {
  IconFileText,
  IconDownload,
  IconPlus,
  IconEye,
  IconTrendingUp,
  IconTrendingDown,
  IconArrowRight,
  IconArrowLeft,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ComposedChart, Area, AreaChart, ReferenceLine } from 'recharts';

interface FinancialReport {
  id: string;
  report_name: string;
  report_type: string;
  report_period_start: string;
  report_period_end: string;
  generated_at: string;
  status: string;
  summary: string;
  pdf_url: string;
  report_data?: any;
}

export const FinancialReportsDashboard: React.FC = () => {
  const [reports, setReports] = useState<FinancialReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [reportType, setReportType] = useState<string>('expense_analysis');
  const [periodStart, setPeriodStart] = useState<Date>(dayjs().subtract(30, 'days').toDate());
  const [periodEnd, setPeriodEnd] = useState<Date>(new Date());
  const [summaryData, setSummaryData] = useState<any>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<FinancialReport | null>(null);

  useEffect(() => {
    fetchReports();
    fetchSummaryData();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('financial_reports')
        .select('*, report_data')
        .order('generated_at', { ascending: false })
        .limit(50);

      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          notifications.show({
            title: 'Setup Required',
            message: 'Finance system tables not found. Please run the database migration.',
            color: 'orange',
          });
          return;
        }
        throw error;
      }
      setReports(data || []);
    } catch (error: any) {
      console.error('Error fetching reports:', error);
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to load reports',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSummaryData = async () => {
    try {
      const { data: expenses, error: expensesError } = await supabase
        .from('expense_requests')
        .select('amount, expense_date, status, expense_category:expense_categories(name)')
        .gte('expense_date', dayjs().subtract(90, 'days').toISOString().split('T')[0])
        .order('expense_date', { ascending: true });

      // Suppress schema errors
      if (
        expensesError &&
        (expensesError.message?.includes('Could not find a relationship') ||
          expensesError.message?.includes('infinite recursion detected in policy') ||
          expensesError.message?.includes('schema cache'))
      ) {
        console.warn('Supabase schema error (suppressed):', expensesError.message);
      }

      const { data: budgets } = await supabase
        .from('budgets')
        .select('allocated_amount, spent_amount, department:departments(name)')
        .eq('status', 'active');

      const { data: invoices } = await supabase
        .from('invoices')
        .select('total_amount, status, invoice_date')
        .gte('invoice_date', dayjs().subtract(90, 'days').toISOString().split('T')[0]);

      setSummaryData({
        expenses: expenses || [],
        budgets: budgets || [],
        invoices: invoices || [],
      });
    } catch (error) {
      console.error('Error fetching summary data:', error);
    }
  };

  const generateReport = async () => {
    setGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let reportData: any = {};
      let reportSummary = '';

      switch (reportType) {
        case 'expense_analysis': {
          const { data: expenseAnalysisData, error: expenseError } = await supabase
            .from('expense_requests')
            .select(`
              *,
              expense_category:expense_categories(name),
              department:departments(name)
            `)
            .gte('expense_date', periodStart.toISOString().split('T')[0])
            .lte('expense_date', periodEnd.toISOString().split('T')[0]);

          // Suppress schema errors
          if (
            expenseError &&
            (expenseError.message?.includes('Could not find a relationship') ||
              expenseError.message?.includes('infinite recursion detected in policy') ||
              expenseError.message?.includes('schema cache'))
          ) {
            console.warn('Supabase schema error (suppressed):', expenseError.message);
          }

          const analysisExpenses = expenseAnalysisData?.reduce((sum, e) => sum + e.amount, 0) || 0;
          const byCategory = expenseAnalysisData?.reduce((acc: any, e: any) => {
            const cat = e.expense_category?.name || 'Other';
            acc[cat] = (acc[cat] || 0) + e.amount;
            return acc;
          }, {});

          reportData = {
            total_expenses: analysisExpenses,
            expense_count: expenseAnalysisData?.length || 0,
            by_category: byCategory,
            expenses: expenseAnalysisData,
          };
          reportSummary = `Total expenses: $${analysisExpenses.toLocaleString()} across ${expenseAnalysisData?.length || 0} requests`;
          break;
        }

        case 'budget_variance': {
          const { data: budgetData } = await supabase
            .from('budgets')
            .select(`
              *,
              department:departments(name),
              category:expense_categories(name)
            `)
            .eq('status', 'active');

          const variances = budgetData?.map((b: any) => ({
            budget_name: b.budget_name,
            allocated: b.allocated_amount,
            spent: b.spent_amount,
            variance: b.allocated_amount - b.spent_amount,
            variance_percent: ((b.spent_amount / b.allocated_amount) * 100).toFixed(2),
          }));

          reportData = {
            budgets: budgetData,
            variances: variances,
          };
          reportSummary = `Analyzed ${budgetData?.length || 0} active budgets`;
          break;
        }

        case 'income_statement': {
          // Calculate previous period for comparison
          const incomePeriodDays = dayjs(periodEnd).diff(dayjs(periodStart), 'days');
          const incomePrevPeriodStart = dayjs(periodStart).subtract(incomePeriodDays + 1, 'days').toDate();
          const incomePrevPeriodEnd = dayjs(periodStart).subtract(1, 'days').toDate();

          // Fetch comprehensive income statement data
          const [incomeOrdersRes, incomeExpensesRes, incomeArRes, incomePayrollRes] = await Promise.all([
            // Revenue from orders/accounts receivable
            supabase
              .from('accounts_receivable')
              .select('*')
              .gte('invoice_date', periodStart.toISOString().split('T')[0])
              .lte('invoice_date', periodEnd.toISOString().split('T')[0]),
            
            // Operating expenses
            supabase
              .from('expense_requests')
              .select('*, expense_category:expense_categories(name), department:departments(name)')
              .gte('expense_date', periodStart.toISOString().split('T')[0])
              .lte('expense_date', periodEnd.toISOString().split('T')[0])
              .eq('status', 'approved'),
            
            // Accounts receivable for revenue recognition
            supabase
              .from('accounts_receivable')
              .select('*')
              .gte('invoice_date', periodStart.toISOString().split('T')[0])
              .lte('invoice_date', periodEnd.toISOString().split('T')[0]),
            
            // Payroll expenses
            supabase
              .from('payroll')
              .select('*')
              .gte('pay_period_start', periodStart.toISOString().split('T')[0])
              .lte('pay_period_end', periodEnd.toISOString().split('T')[0]),
          ]);

          const incomeArData = incomeArRes.data || [];
          const incomeExpenseData = incomeExpensesRes.data || [];
          const incomePayrollData = incomePayrollRes.data || [];

          // Calculate Revenue
          const totalRevenue = incomeArData.reduce((sum, ar) => sum + (Number(ar.total_amount) || 0), 0);
          
          // Calculate Cost of Goods Sold (COGS) - direct costs
          const cogs = incomeExpenseData
            .filter((e: any) => e.expense_category?.name?.toLowerCase().includes('cost') || e.expense_category?.name?.toLowerCase().includes('cogs'))
            .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
          
          // Gross Profit
          const grossProfit = totalRevenue - cogs;
          const grossProfitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

          // Operating Expenses
          const operatingExpenses = incomeExpenseData
            .filter((e: any) => !e.expense_category?.name?.toLowerCase().includes('cost') && !e.expense_category?.name?.toLowerCase().includes('cogs'))
            .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
          
          // Payroll Expenses
          const payrollExpenses = incomePayrollData.reduce((sum, p) => sum + (Number(p.gross_pay) || 0), 0);
          
          // Total Operating Expenses
          const totalOperatingExpenses = operatingExpenses + payrollExpenses;
          
          // Operating Income (EBIT)
          const operatingIncome = grossProfit - totalOperatingExpenses;
          const operatingMargin = totalRevenue > 0 ? (operatingIncome / totalRevenue) * 100 : 0;

          // Non-operating items (interest, taxes, etc.)
          const interestExpense = incomeExpenseData
            .filter((e: any) => e.expense_category?.name?.toLowerCase().includes('interest'))
            .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
          
          const taxExpense = incomeExpenseData
            .filter((e: any) => e.expense_category?.name?.toLowerCase().includes('tax'))
            .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

          // Net Income
          const netIncome = operatingIncome - interestExpense - taxExpense;
          const netProfitMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;

          // Previous period for comparison
          const [prevIncomeArRes, prevIncomeExpensesRes] = await Promise.all([
            supabase
              .from('accounts_receivable')
              .select('*')
              .gte('invoice_date', incomePrevPeriodStart.toISOString().split('T')[0])
              .lte('invoice_date', incomePrevPeriodEnd.toISOString().split('T')[0]),
            supabase
              .from('expense_requests')
              .select('*')
              .gte('expense_date', incomePrevPeriodStart.toISOString().split('T')[0])
              .lte('expense_date', incomePrevPeriodEnd.toISOString().split('T')[0])
              .eq('status', 'approved'),
          ]);

          const prevIncomeRevenue = (prevIncomeArRes.data || []).reduce((sum, ar) => sum + (Number(ar.total_amount) || 0), 0);
          const prevIncomeExpenses = (prevIncomeExpensesRes.data || []).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
          const prevNetIncome = prevIncomeRevenue - prevIncomeExpenses;

          // Calculate changes
          const revenueChange = prevIncomeRevenue !== 0 ? ((totalRevenue - prevIncomeRevenue) / Math.abs(prevIncomeRevenue)) * 100 : 0;
          const netIncomeChange = prevNetIncome !== 0 ? ((netIncome - prevNetIncome) / Math.abs(prevNetIncome)) * 100 : 0;

          // Expense breakdown by category
          const expensesByCategory: Record<string, number> = {};
          incomeExpenseData.forEach((e: any) => {
            const category = e.expense_category?.name || 'Uncategorized';
            expensesByCategory[category] = (expensesByCategory[category] || 0) + (Number(e.amount) || 0);
          });

          // Generate executive highlights
          const executiveHighlights: string[] = [];
          if (totalRevenue > 0) {
            executiveHighlights.push(`Total revenue of $${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${revenueChange >= 0 ? 'increased' : 'decreased'} by ${Math.abs(revenueChange).toFixed(1)}% from previous period`);
          }
          if (grossProfitMargin > 0) {
            executiveHighlights.push(`Gross profit margin of ${grossProfitMargin.toFixed(1)}% demonstrates ${grossProfitMargin > 30 ? 'strong' : 'adequate'} cost management`);
          }
          if (operatingMargin > 0) {
            executiveHighlights.push(`Operating margin of ${operatingMargin.toFixed(1)}% indicates ${operatingMargin > 15 ? 'healthy' : 'moderate'} operational efficiency`);
          }
          if (netIncome > 0) {
            executiveHighlights.push(`Net income of $${netIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${netIncomeChange >= 0 ? 'improved' : 'declined'} by ${Math.abs(netIncomeChange).toFixed(1)}%`);
          }

          reportData = {
            period: {
              current_start: periodStart.toISOString().split('T')[0],
              current_end: periodEnd.toISOString().split('T')[0],
              previous_start: incomePrevPeriodStart.toISOString().split('T')[0],
              previous_end: incomePrevPeriodEnd.toISOString().split('T')[0],
              days_in_period: incomePeriodDays,
            },
            executive_summary: {
              highlights: executiveHighlights,
              total_revenue: totalRevenue,
              net_income: netIncome,
              gross_profit_margin: grossProfitMargin,
              operating_margin: operatingMargin,
              net_profit_margin: netProfitMargin,
            },
            income_statement: {
              revenue: {
                total_revenue: totalRevenue,
                revenue_recognition: totalRevenue,
              },
              cost_of_goods_sold: {
                cogs: cogs,
              },
              gross_profit: {
                gross_profit: grossProfit,
                gross_profit_margin: grossProfitMargin,
              },
              operating_expenses: {
                payroll_expenses: payrollExpenses,
                other_operating_expenses: operatingExpenses,
                total_operating_expenses: totalOperatingExpenses,
              },
              operating_income: {
                operating_income: operatingIncome,
                operating_margin: operatingMargin,
              },
              non_operating_items: {
                interest_expense: interestExpense,
                tax_expense: taxExpense,
              },
              net_income: {
                net_income: netIncome,
                net_profit_margin: netProfitMargin,
              },
            },
            period_comparison: {
              revenue: {
                current: totalRevenue,
                previous: prevIncomeRevenue,
                change: revenueChange,
              },
              net_income: {
                current: netIncome,
                previous: prevNetIncome,
                change: netIncomeChange,
              },
            },
            expenses_by_category: expensesByCategory,
            financial_ratios: {
              gross_profit_margin: grossProfitMargin,
              operating_margin: operatingMargin,
              net_profit_margin: netProfitMargin,
              ebitda_margin: operatingMargin, // Simplified
            },
          };

          reportSummary = `Revenue: $${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} | Net Income: $${netIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} | Margin: ${netProfitMargin.toFixed(1)}%`;
          break;
        }

        case 'cash_flow': {
          // Calculate previous period for comparison
          const periodDays = dayjs(periodEnd).diff(dayjs(periodStart), 'days');
          const previousPeriodStart = dayjs(periodStart).subtract(periodDays + 1, 'days').toDate();
          const previousPeriodEnd = dayjs(periodStart).subtract(1, 'days').toDate();

          // Current period data
          const [invoiceDataRes, arDataRes, expenseDataRes, ordersDataRes] = await Promise.all([
            supabase.from('invoices').select('*')
              .gte('invoice_date', periodStart.toISOString().split('T')[0])
              .lte('invoice_date', periodEnd.toISOString().split('T')[0]),
            supabase.from('accounts_receivable').select('*')
              .gte('invoice_date', periodStart.toISOString().split('T')[0])
              .lte('invoice_date', periodEnd.toISOString().split('T')[0]),
            supabase.from('expense_requests').select('*')
              .gte('expense_date', periodStart.toISOString().split('T')[0])
              .lte('expense_date', periodEnd.toISOString().split('T')[0])
              .eq('status', 'approved'),
            supabase.from('orders').select('total_amount, created_at')
              .gte('created_at', periodStart.toISOString())
              .lte('created_at', periodEnd.toISOString()),
          ]);

          // Previous period data for comparison
          const [prevInvoiceDataRes, prevArDataRes, prevExpenseDataRes, prevOrdersDataRes] = await Promise.all([
            supabase.from('invoices').select('*')
              .gte('invoice_date', previousPeriodStart.toISOString().split('T')[0])
              .lte('invoice_date', previousPeriodEnd.toISOString().split('T')[0]),
            supabase.from('accounts_receivable').select('*')
              .gte('invoice_date', previousPeriodStart.toISOString().split('T')[0])
              .lte('invoice_date', previousPeriodEnd.toISOString().split('T')[0]),
            supabase.from('expense_requests').select('*')
              .gte('expense_date', previousPeriodStart.toISOString().split('T')[0])
              .lte('expense_date', previousPeriodEnd.toISOString().split('T')[0])
              .eq('status', 'approved'),
            supabase.from('orders').select('total_amount, created_at')
              .gte('created_at', previousPeriodStart.toISOString())
              .lte('created_at', previousPeriodEnd.toISOString()),
          ]);

          const invoiceData = invoiceDataRes.data || [];
          const arData = arDataRes.data || [];
          const expenseData2 = expenseDataRes.data || [];
          const ordersData = ordersDataRes.data || [];
          
          const prevInvoiceData = prevInvoiceDataRes.data || [];
          const prevArData = prevArDataRes.data || [];
          const prevExpenseData = prevExpenseDataRes.data || [];
          const prevOrdersData = prevOrdersDataRes.data || [];

          // Calculate totals - Current Period
          const totalPayable = invoiceData.reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0);
          const totalReceivable = arData.reduce((sum, ar) => sum + (Number(ar.total_amount) || 0), 0);
          const paidReceivables = arData.reduce((sum, ar) => sum + (Number(ar.paid_amount) || 0), 0);
          const outstandingReceivables = arData.reduce((sum, ar) => sum + (Number(ar.outstanding_amount) || 0), 0);
          const totalExpenses2 = expenseData2.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
          const totalRevenue2 = ordersData.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

          // Previous period totals
          const prevTotalPayable = prevInvoiceData.reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0);
          const prevTotalReceivable = prevArData.reduce((sum, ar) => sum + (Number(ar.total_amount) || 0), 0);
          const prevPaidReceivables = prevArData.reduce((sum, ar) => sum + (Number(ar.paid_amount) || 0), 0);
          const prevOutstandingReceivables = prevArData.reduce((sum, ar) => sum + (Number(ar.outstanding_amount) || 0), 0);
          const prevTotalExpenses = prevExpenseData.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
          const prevTotalRevenue = prevOrdersData.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

          // Operating Activities - Current Period
          const cashFromCustomers = paidReceivables;
          const cashPaidToSuppliers = invoiceData.filter(i => i.status === 'paid').reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0);
          const cashPaidForExpenses = totalExpenses2;
          const salariesAndWages = expenseData2.filter((e: any) => e.expense_category_id && (e.expense_category?.name?.toLowerCase().includes('salary') || e.expense_category?.name?.toLowerCase().includes('payroll') || e.expense_category?.name?.toLowerCase().includes('wage'))).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
          const interestPaid = expenseData2.filter((e: any) => e.expense_category?.name?.toLowerCase().includes('interest')).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
          const taxesPaid = expenseData2.filter((e: any) => e.expense_category?.name?.toLowerCase().includes('tax')).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
          
          // Investing Activities (assume capital expenditures from expense categories)
          const capitalExpenditures = expenseData2.filter((e: any) => e.expense_category?.name?.toLowerCase().includes('equipment') || e.expense_category?.name?.toLowerCase().includes('capital') || e.expense_category?.name?.toLowerCase().includes('asset')).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
          
          // Financing Activities
          const debtRepayments = 0; // Would come from loan payments if tracked
          const equityIssuances = 0; // Would come from equity transactions if tracked
          const dividendsPaid = 0; // Would come from dividend payments if tracked

          const netOperatingCashFlow = cashFromCustomers - cashPaidToSuppliers - cashPaidForExpenses;
          const netInvestingCashFlow = -capitalExpenditures; // Negative as it's cash outflow
          const netFinancingCashFlow = equityIssuances - debtRepayments - dividendsPaid;
          const netChangeInCash = netOperatingCashFlow + netInvestingCashFlow + netFinancingCashFlow;

          // Financial Ratios Calculations
          const daysInPeriod = periodDays + 1;
          const avgReceivables = (outstandingReceivables + prevOutstandingReceivables) / 2;
          const avgPayables = (totalPayable + prevTotalPayable) / 2;
          const avgInventory = 0; // Would need inventory data
          
          // Days Sales Outstanding (DSO)
          const avgDailySales = totalRevenue2 / daysInPeriod;
          const dso = avgDailySales > 0 ? avgReceivables / avgDailySales : 0;
          
          // Days Payable Outstanding (DPO)
          const avgDailyPurchases = (cashPaidToSuppliers + prevInvoiceData.filter(i => i.status === 'paid').reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0)) / 2 / daysInPeriod;
          const dpo = avgDailyPurchases > 0 ? avgPayables / avgDailyPurchases : 0;
          
          // Days Inventory Outstanding (DIO) - assumed 0 without inventory
          const dio = 0;
          
          // Cash Conversion Cycle
          const cashConversionCycle = dso + dio - dpo;
          
          // Operating Cash Flow Margin
          const operatingCashFlowMargin = totalRevenue2 > 0 ? (netOperatingCashFlow / totalRevenue2) * 100 : 0;
          
          // Free Cash Flow (Operating CF - CapEx)
          const freeCashFlow = netOperatingCashFlow - capitalExpenditures;
          
          // Current Ratio (would need current assets/liabilities - approximating)
          const currentAssets = outstandingReceivables + (avgInventory || 0);
          const currentLiabilities = totalPayable;
          const currentRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : 0;
          
          // Quick Ratio (excluding inventory)
          const quickRatio = currentLiabilities > 0 ? outstandingReceivables / currentLiabilities : 0;
          
          // Cash Ratio
          const cashBalance = netChangeInCash; // Simplified
          const cashRatio = currentLiabilities > 0 ? cashBalance / currentLiabilities : 0;
          
          // Working Capital
          const workingCapital = currentAssets - currentLiabilities;
          
          // Period over Period Changes
<<<<<<< HEAD
          const revenueChange = prevTotalRevenue > 0 ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100 : 0;
          const prevOcf = prevPaidReceivables - ((prevInvoiceData || []).filter((i: any) => i.status === 'paid').reduce((sum: number, i: any) => sum + (Number(i.total_amount) || 0), 0)) - prevTotalExpenses;
          const ocfChange = prevOcf !== 0 ? ((netOperatingCashFlow - prevOcf) / Math.abs(prevOcf)) * 100 : 0;
=======
          const revenueChange2 = prevTotalRevenue > 0 ? ((totalRevenue2 - prevTotalRevenue) / prevTotalRevenue) * 100 : 0;
          
          // Calculate previous period's paid receivables
          const prevPaidReceivablesAmount = prevInvoiceData
            .filter(i => i.status === 'paid')
            .reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0);
          
          // Calculate previous period's operating cash flow
          const prevOperatingCashFlow = prevPaidReceivablesAmount - prevTotalExpenses;
          
          // Calculate OCF change
          const ocfChange = prevTotalReceivable - prevTotalPayable !== 0 
            ? ((netOperatingCashFlow - prevOperatingCashFlow) / Math.abs(prevOperatingCashFlow)) * 100 
            : 0;
>>>>>>> bad3ad63 (Add Fortune 500 corporate finance portals and department hub)

          // Aging Analysis
          const today = new Date();
          const agingCategories = {
            current: 0,
            days_30_60: 0,
            days_60_90: 0,
            over_90: 0,
          };

          arData?.forEach((ar: any) => {
            if (ar.outstanding_amount > 0) {
              const daysDiff = dayjs(today).diff(dayjs(ar.due_date), 'days');
              if (daysDiff <= 0) agingCategories.current += ar.outstanding_amount;
              else if (daysDiff <= 30) agingCategories.days_30_60 += ar.outstanding_amount;
              else if (daysDiff <= 60) agingCategories.days_60_90 += ar.outstanding_amount;
              else agingCategories.over_90 += ar.outstanding_amount;
            }
          });

          // Vendor Summary
          const vendorSummary: Record<string, { total: number; paid: number; pending: number; count: number }> = {};
          invoiceData?.forEach((inv: any) => {
            const vendor = inv.vendor_name || 'Unknown';
            if (!vendorSummary[vendor]) {
              vendorSummary[vendor] = { total: 0, paid: 0, pending: 0, count: 0 };
            }
            vendorSummary[vendor].total += inv.total_amount || 0;
            vendorSummary[vendor].count += 1;
            if (inv.status === 'paid') {
              vendorSummary[vendor].paid += inv.total_amount || 0;
            } else {
              vendorSummary[vendor].pending += inv.total_amount || 0;
            }
          });

          // Customer Summary
          const customerSummary: Record<string, { total: number; paid: number; outstanding: number; count: number }> = {};
          arData?.forEach((ar: any) => {
            const customer = ar.customer_name || 'Unknown';
            if (!customerSummary[customer]) {
              customerSummary[customer] = { total: 0, paid: 0, outstanding: 0, count: 0 };
            }
            customerSummary[customer].total += ar.total_amount || 0;
            customerSummary[customer].count += 1;
            customerSummary[customer].paid += ar.paid_amount || 0;
            customerSummary[customer].outstanding += ar.outstanding_amount || 0;
          });

          // Daily cash flow trend
          const dailyFlow: Record<string, { inflow: number; outflow: number; net: number }> = {};
          
          arData?.forEach((ar: any) => {
            const date = dayjs(ar.invoice_date).format('YYYY-MM-DD');
            if (!dailyFlow[date]) dailyFlow[date] = { inflow: 0, outflow: 0, net: 0 };
            dailyFlow[date].inflow += ar.paid_amount || 0;
          });

          invoiceData?.forEach((inv: any) => {
            const date = dayjs(inv.invoice_date).format('YYYY-MM-DD');
            if (!dailyFlow[date]) dailyFlow[date] = { inflow: 0, outflow: 0, net: 0 };
            if (inv.status === 'paid') {
              dailyFlow[date].outflow += inv.total_amount || 0;
            }
          });

          expenseData2?.forEach((exp: any) => {
            const date = dayjs(exp.expense_date).format('YYYY-MM-DD');
            if (!dailyFlow[date]) dailyFlow[date] = { inflow: 0, outflow: 0, net: 0 };
            dailyFlow[date].outflow += exp.amount || 0;
          });

          // Calculate net for each day
          Object.keys(dailyFlow).forEach(date => {
            dailyFlow[date].net = dailyFlow[date].inflow - dailyFlow[date].outflow;
          });

          const dailyTrendData = Object.entries(dailyFlow)
            .map(([date, flow]) => ({
              date: dayjs(date).format('MMM D'),
              inflow: flow.inflow,
              outflow: flow.outflow,
              net: flow.net,
            }))
            .sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf());

          // Generate Executive Summary Insights
          const executiveHighlights2 = [];
          if (netOperatingCashFlow > 0) {
            executiveHighlights2.push(`Strong operating cash flow of $${Math.abs(netOperatingCashFlow).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} demonstrates healthy cash generation`);
          } else {
            executiveHighlights2.push(`Operating cash flow requires attention at $${Math.abs(netOperatingCashFlow).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
          }
          if (revenueChange2 > 0) {
            executiveHighlights2.push(`Revenue increased ${revenueChange2.toFixed(1)}% compared to previous period`);
          }
          if (freeCashFlow > 0) {
            executiveHighlights.push(`Positive free cash flow of $${freeCashFlow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} available for strategic investments`);
          }
          if (dso > 45) {
            executiveHighlights.push(`Days Sales Outstanding of ${dso.toFixed(1)} days indicates opportunity for collections improvement`);
          }

          reportData = {
            // Period Information
            period: {
              current_start: periodStart.toISOString().split('T')[0],
              current_end: periodEnd.toISOString().split('T')[0],
              previous_start: previousPeriodStart.toISOString().split('T')[0],
              previous_end: previousPeriodEnd.toISOString().split('T')[0],
              days_in_period: daysInPeriod,
            },
            
            // Executive Summary
            executive_summary: {
              highlights: executiveHighlights2,
              net_cash_flow: netChangeInCash,
              operating_cash_flow: netOperatingCashFlow,
              free_cash_flow: freeCashFlow,
              revenue: totalRevenue2,
              revenue_change_pct: revenueChange2,
            },
            
            // GAAP Cash Flow Statement
            cash_flow_statement: {
              operating_activities: {
                cash_from_customers: cashFromCustomers,
                cash_paid_to_suppliers: -cashPaidToSuppliers,
                cash_paid_for_expenses: -cashPaidForExpenses,
                salaries_and_wages: -salariesAndWages,
                interest_paid: -interestPaid,
                taxes_paid: -taxesPaid,
                net_operating_cash_flow: netOperatingCashFlow,
              },
              investing_activities: {
                capital_expenditures: -capitalExpenditures,
                net_investing_cash_flow: netInvestingCashFlow,
              },
              financing_activities: {
                debt_repayments: -debtRepayments,
                equity_issuances: equityIssuances,
                dividends_paid: -dividendsPaid,
                net_financing_cash_flow: netFinancingCashFlow,
              },
              net_change_in_cash: netChangeInCash,
            },
            
            // Financial Ratios
            financial_ratios: {
              operating_cash_flow_margin: operatingCashFlowMargin,
              free_cash_flow: freeCashFlow,
              cash_conversion_cycle: cashConversionCycle,
              days_sales_outstanding: dso,
              days_payable_outstanding: dpo,
              days_inventory_outstanding: dio,
              current_ratio: currentRatio,
              quick_ratio: quickRatio,
              cash_ratio: cashRatio,
              working_capital: workingCapital,
            },
            
            // Period Comparisons
            period_comparison: {
              revenue: { current: totalRevenue2, previous: prevTotalRevenue, change: revenueChange2 },
              operating_cash_flow: { 
                current: netOperatingCashFlow, 
                previous: (prevPaidReceivables - prevInvoiceData.filter(i => i.status === 'paid').reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0) - prevTotalExpenses),
                change: ocfChange 
              },
              receivables: { current: outstandingReceivables, previous: prevOutstandingReceivables },
              payables: { current: totalPayable, previous: prevTotalPayable },
            },
            
            // Detailed Data
            payables: invoiceData,
            receivables: arData,
            expenses: expenseData2,
            orders: ordersData,
            
            // Totals
            totals: {
              total_payable: totalPayable,
              total_receivable: totalReceivable,
              paid_receivables: paidReceivables,
              outstanding_receivables: outstandingReceivables,
              total_expenses: totalExpenses2,
              total_revenue: totalRevenue2,
              net_cash_flow: netChangeInCash,
            },
            
            // Operating Activities Breakdown
            operating_activities: {
              cash_from_customers: cashFromCustomers,
              cash_paid_to_suppliers: cashPaidToSuppliers,
              cash_paid_for_expenses: cashPaidForExpenses,
              salaries_and_wages: salariesAndWages,
              interest_paid: interestPaid,
              taxes_paid: taxesPaid,
              net_operating_cash_flow: netOperatingCashFlow,
            },
            
            // Investing & Financing
            investing_activities: {
              capital_expenditures: capitalExpenditures,
              net_investing_cash_flow: netInvestingCashFlow,
            },
            financing_activities: {
              debt_repayments: debtRepayments,
              equity_issuances: equityIssuances,
              dividends_paid: dividendsPaid,
              net_financing_cash_flow: netFinancingCashFlow,
            },
            
            // Analysis
            aging_analysis: agingCategories,
            vendor_summary: vendorSummary,
            customer_summary: customerSummary,
            daily_trend: dailyTrendData,
          };
          
          const netFlow = netChangeInCash;
          reportSummary = `Net cash flow: $${netFlow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} | Operating: $${netOperatingCashFlow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} | FCF: $${freeCashFlow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          break;
        }

        default:
          reportData = {};
          reportSummary = 'Custom report generated';
      }

      const { data, error } = await supabase
        .from('financial_reports')
        .insert({
          report_name: `${reportType.replace('_', ' ').toUpperCase()} - ${dayjs(periodStart).format('MMM D')} to ${dayjs(periodEnd).format('MMM D, YYYY')}`,
          report_type: reportType,
          report_period_start: periodStart.toISOString().split('T')[0],
          report_period_end: periodEnd.toISOString().split('T')[0],
          generated_by: user.id,
          report_data: reportData,
          summary: reportSummary,
          status: 'final',
        })
        .select()
        .single();

      if (error) throw error;

      notifications.show({
        title: 'Success',
        message: 'Report generated successfully',
        color: 'green',
      });

      setModalOpen(false);
      fetchReports();
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to generate report',
        color: 'red',
      });
    } finally {
      setGenerating(false);
    }
  };

  const getReportTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      income_statement: 'Income Statement',
      balance_sheet: 'Balance Sheet',
      cash_flow: 'Cash Flow',
      budget_variance: 'Budget Variance',
      expense_analysis: 'Expense Analysis',
      custom: 'Custom Report',
    };
    return labels[type] || type;
  };

  const expenseChartData = summaryData?.expenses
    ? Object.entries(
        summaryData.expenses.reduce((acc: any, e: any) => {
          const date = dayjs(e.expense_date).format('MMM D');
          acc[date] = (acc[date] || 0) + e.amount;
          return acc;
        }, {})
      ).map(([date, amount]) => ({ date, amount }))
    : [];

  const categoryData = summaryData?.expenses
    ? Object.entries(
        summaryData.expenses.reduce((acc: any, e: any) => {
          const cat = e.expense_category?.name || 'Other';
          acc[cat] = (acc[cat] || 0) + e.amount;
          return acc;
        }, {})
      ).map(([name, value]) => ({ name, value }))
    : [];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  // Universal comprehensive report renderer - Fortune 500 level for ALL reports
  // ALWAYS shows impressive Fortune 500-level presentation - NO exceptions
  const renderComprehensiveReport = (report: FinancialReport) => {
    const reportType = (report.report_type || '').toLowerCase();
    const data = report.report_data || {};
    
    // Route to specific detailed renderer if available, otherwise use universal
    if (reportType === 'cash_flow' || report.report_name?.toUpperCase().includes('CASH FLOW')) {
      return renderDetailedCashFlowReport(data, report);
    }
    
    // FOR ALL OTHER REPORTS - Use comprehensive universal view
    // This ensures EVERY report looks Fortune 500-level
    return renderUniversalDetailedReport(report, data);
  };

  // Universal detailed report view - Fortune 500 style for any report type
  // ALWAYS shows impressive visuals, even with minimal data
  const renderUniversalDetailedReport = (report: FinancialReport, data: any) => {
    const reportType = (report.report_type || '').toLowerCase();
    const reportTypeLabel = getReportTypeLabel(report.report_type);
    
    // Extract period info
    const periodStart = dayjs(report.report_period_start);
    const periodEnd = dayjs(report.report_period_end);
    const daysInPeriod = periodEnd.diff(periodStart, 'days');

    // Extract key metrics based on report type
    let primaryMetric = 0;
    let primaryMetricLabel = 'Total';
    let secondaryMetrics: Array<{ label: string; value: number; format?: 'currency' | 'percent' | 'number' }> = [];
    let chartsData: any[] = [];
    let tablesData: any[] = [];
    let categories: Record<string, number> = {};

    // Parse data based on report type
    if (reportType === 'income_statement') {
      const incomeStatement = data.income_statement || {};
      primaryMetric = incomeStatement.net_income?.net_income || data.executive_summary?.net_income || 0;
      primaryMetricLabel = 'Net Income';
      secondaryMetrics = [
        { label: 'Total Revenue', value: data.income_statement?.revenue?.total_revenue || 0, format: 'currency' },
        { label: 'Gross Profit', value: data.income_statement?.gross_profit?.gross_profit || 0, format: 'currency' },
        { label: 'Operating Income', value: data.income_statement?.operating_income?.operating_income || 0, format: 'currency' },
        { label: 'Gross Margin', value: data.executive_summary?.gross_profit_margin || 0, format: 'percent' },
        { label: 'Operating Margin', value: data.executive_summary?.operating_margin || 0, format: 'percent' },
        { label: 'Net Margin', value: data.executive_summary?.net_profit_margin || 0, format: 'percent' },
      ];
      categories = data.expenses_by_category || {};
      
      // Build income statement structure
      if (data.income_statement) {
        tablesData = [
          { label: 'Revenue', items: [{ name: 'Total Revenue', amount: data.income_statement.revenue?.total_revenue || 0 }] },
          { label: 'Cost of Goods Sold', items: [{ name: 'COGS', amount: data.income_statement.cost_of_goods_sold?.cogs || 0 }] },
          { label: 'Operating Expenses', items: [
            { name: 'Payroll', amount: data.income_statement.operating_expenses?.payroll_expenses || 0 },
            { name: 'Other Operating Expenses', amount: data.income_statement.operating_expenses?.other_operating_expenses || 0 },
          ]},
        ];
      }
    } else if (reportType === 'expense_analysis') {
      primaryMetric = data.total_expenses || 0;
      primaryMetricLabel = 'Total Expenses';
      secondaryMetrics = [
        { label: 'Expense Count', value: data.expense_count || 0, format: 'number' },
        { label: 'Average Expense', value: data.expense_count > 0 ? (data.total_expenses || 0) / data.expense_count : 0, format: 'currency' },
      ];
      categories = data.by_category || {};
      if (data.expenses) {
        tablesData = [{ label: 'Expense Details', items: data.expenses.map((e: any) => ({
          name: e.expense_category?.name || e.description || 'Unknown',
          amount: e.amount || 0,
          date: e.expense_date,
          status: e.status,
        }))}];
      }
    } else if (reportType === 'budget_variance') {
      const variances = data.variances || [];
      primaryMetric = variances.reduce((sum: number, v: any) => sum + (v.variance || 0), 0);
      primaryMetricLabel = 'Total Variance';
      secondaryMetrics = [
        { label: 'Total Budgeted', value: variances.reduce((sum: number, v: any) => sum + (v.allocated || 0), 0), format: 'currency' },
        { label: 'Total Spent', value: variances.reduce((sum: number, v: any) => sum + (v.spent || 0), 0), format: 'currency' },
      ];
      if (variances.length > 0) {
        tablesData = [{ label: 'Budget Variance Analysis', items: variances }];
      }
    }

    // Build chart data from categories
    if (Object.keys(categories).length > 0) {
      chartsData = Object.entries(categories).map(([name, value]) => ({
        name: name.length > 15 ? name.substring(0, 15) + '...' : name,
        value: Number(value) || 0,
        fullName: name,
      })).sort((a, b) => b.value - a.value);
    }

    // Format value helper
    const formatValue = (value: number, format: 'currency' | 'percent' | 'number' = 'currency') => {
      if (format === 'percent') {
        return `${value.toFixed(1)}%`;
      } else if (format === 'currency') {
        return `$${Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
      return value.toLocaleString();
    };

    return (
      <Stack gap="xl">
        {/* PROMINENT Fortune 500 Header - Impossible to miss */}
        <Card p="xl" withBorder style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
          boxShadow: '0 10px 40px rgba(0,0,0,0.15)'
        }}>
          <Group justify="space-between" wrap="wrap">
            <div>
              <Text size="xl" fw={700} style={{ color: 'white', marginBottom: '8px' }}>
                {reportTypeLabel.toUpperCase()} REPORT
              </Text>
              <Text size="md" style={{ color: 'rgba(255,255,255,0.9)' }}>
                {periodStart.format('MMMM D, YYYY')} - {periodEnd.format('MMMM D, YYYY')}
              </Text>
              <Text size="sm" style={{ color: 'rgba(255,255,255,0.7)', marginTop: '4px' }}>
                {daysInPeriod} Day Analysis Period
              </Text>
            </div>
            <Badge size="xl" variant="filled" style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', fontSize: '14px', padding: '12px 24px' }}>
              {report.status === 'final' ? '✓ FINAL' : 'DRAFT'}
            </Badge>
          </Group>
        </Card>

        {/* Executive Summary - Fortune 500 Style - ALWAYS VISIBLE */}
        <Card p="xl" withBorder style={{ 
          background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
          border: '2px solid #e9ecef',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
        }}>
          <Title order={2} mb="lg" style={{ color: '#1a1a1a', fontWeight: 700, fontSize: '28px' }}>
            EXECUTIVE SUMMARY
          </Title>
          <Divider mb="lg" style={{ borderWidth: '2px' }} />
          
          <Grid>
            <Grid.Col span={8}>
              <Stack gap="md">
                <Group gap="sm">
                  <IconTrendingUp size={24} color="#2563eb" />
                  <Text fw={600} size="lg" mb="xs">Key Highlights</Text>
                </Group>
                {data.executive_summary?.highlights?.length > 0 ? (
                  <Stack gap="md">
                    {data.executive_summary.highlights.map((highlight: string, idx: number) => (
                      <Paper key={idx} p="md" withBorder style={{ backgroundColor: '#f8f9fa' }}>
                        <Group gap="sm">
                          <IconArrowRight size={18} color="#2563eb" />
                          <Text size="sm" style={{ flex: 1 }}>{highlight}</Text>
                        </Group>
                      </Paper>
                    ))}
                  </Stack>
                ) : report.summary ? (
                  <Paper p="lg" withBorder style={{ backgroundColor: '#f8f9fa' }}>
                    <Stack gap="sm">
                      <Group gap="sm">
                        <IconArrowRight size={18} color="#2563eb" />
                        <Text fw={600}>Report Summary</Text>
                      </Group>
                      <Text size="md" style={{ paddingLeft: '26px', lineHeight: 1.6 }}>
                        {report.summary}
                      </Text>
                    </Stack>
                  </Paper>
                ) : (
                  <Paper p="lg" withBorder style={{ backgroundColor: '#fff3cd', borderLeft: '4px solid #ffc107' }}>
                    <Text size="sm" c="orange">
                      <IconFileText size={16} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                      Comprehensive analysis for period {periodStart.format('MMM D')} - {periodEnd.format('MMM D, YYYY')}
                    </Text>
                  </Paper>
                )}
              </Stack>
            </Grid.Col>
            <Grid.Col span={4}>
              <Stack gap="md">
                <Card p="lg" withBorder style={{ 
                  backgroundColor: primaryMetric >= 0 ? '#ecfdf5' : '#fef2f2',
                  borderLeft: `6px solid ${primaryMetric >= 0 ? '#10b981' : '#ef4444'}`,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}>
                  <Group gap="xs" mb="xs">
                    {primaryMetric >= 0 ? (
                      <IconTrendingUp size={20} color="#10b981" />
                    ) : (
                      <IconTrendingDown size={20} color="#ef4444" />
                    )}
                    <Text size="xs" c="dimmed" fw={600}>{primaryMetricLabel}</Text>
                  </Group>
                  <Text fw={700} size="2xl" c={primaryMetric >= 0 ? 'green' : 'red'}>
                    {formatValue(primaryMetric)}
                  </Text>
                </Card>
                {daysInPeriod > 0 && (
                  <Card p="md" withBorder>
                    <Text size="xs" c="dimmed" mb={4}>Period Length</Text>
                    <Text fw={600} size="lg">{daysInPeriod} Days</Text>
                  </Card>
                )}
              </Stack>
            </Grid.Col>
          </Grid>
        </Card>

        {/* Key Performance Indicators */}
        {secondaryMetrics.length > 0 && (
          <Card p="lg" withBorder>
            <Title order={3} mb="lg">KEY PERFORMANCE INDICATORS</Title>
            <Grid>
              {secondaryMetrics.slice(0, 6).map((metric, idx) => (
                <Grid.Col key={idx} span={4}>
                  <Card p="md" withBorder style={{ borderLeft: '4px solid #6366f1' }}>
                    <Text size="xs" c="dimmed" mb={4}>{metric.label}</Text>
                    <Text fw={700} size="lg">
                      {formatValue(metric.value, metric.format)}
                    </Text>
                  </Card>
                </Grid.Col>
              ))}
            </Grid>
          </Card>
        )}

        {/* Charts Section */}
        {chartsData.length > 0 && (
          <Grid>
            <Grid.Col span={8}>
              <Card p="lg" withBorder>
                <Title order={4} mb="md">Distribution Analysis</Title>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartsData.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <RechartsTooltip formatter={(value: any) => formatValue(value)} />
                    <Bar dataKey="value" fill="#6366f1" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Grid.Col>
            <Grid.Col span={4}>
              <Card p="lg" withBorder>
                <Title order={4} mb="md">Category Breakdown</Title>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartsData.slice(0, 6)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartsData.slice(0, 6).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value: any) => formatValue(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </Grid.Col>
          </Grid>
        )}

        {/* Detailed Tables */}
        {tablesData.length > 0 && (
          <Card p="lg" withBorder>
            <Title order={3} mb="lg">DETAILED BREAKDOWN</Title>
            <Tabs defaultValue={tablesData[0]?.label || 'details'}>
              <Tabs.List>
                {tablesData.map((tab, idx) => (
                  <Tabs.Tab key={idx} value={tab.label}>{tab.label}</Tabs.Tab>
                ))}
              </Tabs.List>
              
              {tablesData.map((tab, idx) => (
                <Tabs.Panel key={idx} value={tab.label} pt="md">
                  <Table striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Item</Table.Th>
                        <Table.Th style={{ textAlign: 'right' }}>Amount</Table.Th>
                        {tab.items[0]?.date && <Table.Th>Date</Table.Th>}
                        {tab.items[0]?.status && <Table.Th>Status</Table.Th>}
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {tab.items.map((item: any, itemIdx: number) => (
                        <Table.Tr key={itemIdx}>
                          <Table.Td>{item.name || item.budget_name || 'N/A'}</Table.Td>
                          <Table.Td style={{ textAlign: 'right' }}>
                            {formatValue(item.amount || item.variance || 0)}
                          </Table.Td>
                          {item.date && (
                            <Table.Td>{dayjs(item.date).format('MMM D, YYYY')}</Table.Td>
                          )}
                          {item.status && (
                            <Table.Td>
                              <Badge color={item.status === 'approved' ? 'green' : 'gray'}>
                                {item.status}
                              </Badge>
                            </Table.Td>
                          )}
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Tabs.Panel>
              ))}
            </Tabs>
          </Card>
        )}

        {/* Always show visualizations - generate from any available data */}
        {chartsData.length === 0 && Object.keys(data).length > 0 && (
          <Grid>
            <Grid.Col span={12}>
              <Card p="xl" withBorder style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                <Title order={3} mb="lg" style={{ color: 'white' }}>FINANCIAL OVERVIEW</Title>
                <Grid>
                  {Object.entries(data).slice(0, 6).map(([key, value], idx) => {
                    if (typeof value === 'object' || Array.isArray(value)) return null;
                    const numValue = typeof value === 'number' ? value : (typeof value === 'string' ? parseFloat(value) || 0 : 0);
                    if (numValue === 0 && typeof value !== 'number') return null;
                    return (
                      <Grid.Col key={idx} span={4}>
                        <Card p="md" style={{ backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}>
                          <Text size="xs" style={{ color: 'rgba(255,255,255,0.8)' }} mb={4}>
                            {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Text>
                          <Text fw={700} size="xl" style={{ color: 'white' }}>
                            {typeof value === 'number' ? formatValue(value) : String(value).substring(0, 30)}
                          </Text>
                        </Card>
                      </Grid.Col>
                    );
                  })}
                </Grid>
              </Card>
            </Grid.Col>
          </Grid>
        )}

        {/* Always show at least ONE chart - create from summary text if needed */}
        {chartsData.length === 0 && (
          <Card p="lg" withBorder>
            <Title order={3} mb="lg">PERIOD OVERVIEW</Title>
            <Grid>
              <Grid.Col span={8}>
                <Card p="md" withBorder style={{ borderLeft: '4px solid #10b981' }}>
                  <Text fw={600} mb="sm">Report Period Analysis</Text>
                  <Text size="sm" c="dimmed" mb="md">
                    {periodStart.format('MMMM D, YYYY')} through {periodEnd.format('MMMM D, YYYY')}
                  </Text>
                  <Group gap="lg">
                    <div>
                      <Text size="xs" c="dimmed">Days in Period</Text>
                      <Text fw={700} size="lg">{daysInPeriod}</Text>
                    </div>
                    <div>
                      <Text size="xs" c="dimmed">Status</Text>
                      <Badge color={report.status === 'final' ? 'green' : 'gray'}>{report.status?.toUpperCase() || 'DRAFT'}</Badge>
                    </div>
                  </Group>
                </Card>
              </Grid.Col>
              <Grid.Col span={4}>
                <Card p="md" withBorder style={{ borderLeft: '4px solid #6366f1' }}>
                  <Text fw={600} mb="sm">Report Type</Text>
                  <Badge size="lg" variant="light" color="blue">{reportTypeLabel}</Badge>
                  {report.summary && (
                    <>
                      <Text size="xs" c="dimmed" mt="md" mb="xs">Summary</Text>
                      <Text size="sm">{report.summary}</Text>
                    </>
                  )}
                </Card>
              </Grid.Col>
            </Grid>
          </Card>
        )}

        {/* Always show summary section in a professional format */}
        {report.summary && (
          <Card p="xl" withBorder style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)' }}>
            <Title order={3} mb="md">
              <Group gap="sm">
                <IconFileText size={24} />
                <Text>REPORT SUMMARY</Text>
              </Group>
            </Title>
            <Paper p="lg" withBorder style={{ backgroundColor: 'white' }}>
              <Text size="md" style={{ lineHeight: 1.8 }}>
                {report.summary}
              </Text>
            </Paper>
          </Card>
        )}
      </Stack>
    );
  };

  const renderDetailedCashFlowReport = (data: any, reportMetadata?: any) => {
    // Check if this is an old report structure (missing new fields)
    const isOldReport = !data || !data.executive_summary || !data.cash_flow_statement || !data.financial_ratios;
    
    // Get period from data or metadata
    const reportPeriod = data.period || (reportMetadata ? {
      current_start: reportMetadata.report_period_start,
      current_end: reportMetadata.report_period_end,
    } : {});

    // Extract all data with fallbacks - handle both new and old structures
    const executiveSummary = data.executive_summary || {};
    const cashFlowStatement = data.cash_flow_statement || {};
    const financialRatios = data.financial_ratios || {};
    const periodComparison = data.period_comparison || {};
    
    // Backwards compatibility: check if data is in old format (totals at root vs nested)
    const totals = data.totals || {
      total_payable: data.total_payable || 0,
      total_receivable: data.total_receivable || 0,
      paid_receivables: data.paid_receivables || 0,
      outstanding_receivables: data.outstanding_receivables || 0,
      total_expenses: data.total_expenses || 0,
      net_cash_flow: data.net_cash_flow || 0,
    };
    
    const operating = data.operating_activities || {
      cash_from_customers: data.cash_from_customers || 0,
      cash_paid_to_suppliers: data.cash_paid_to_suppliers || 0,
      cash_paid_for_expenses: data.cash_paid_for_expenses || 0,
      net_operating_cash_flow: data.net_operating_cash_flow || 0,
    };
    
    const investing = data.investing_activities || {
      capital_expenditures: 0,
      net_investing_cash_flow: 0,
    };
    
    const financing = data.financing_activities || {
      debt_repayments: 0,
      equity_issuances: 0,
      dividends_paid: 0,
      net_financing_cash_flow: 0,
    };
    
    const aging = data.aging_analysis || {
      current: 0,
      days_30_60: 0,
      days_60_90: 0,
      over_90: 0,
    };
    
    const vendors = data.vendor_summary || {};
    const customers = data.customer_summary || {};
    const dailyTrend = data.daily_trend || [];
    const payables = data.payables || [];
    const receivables = data.receivables || [];

    // Calculate net cash flow - handle multiple possible locations
    const netCashFlow = cashFlowStatement.net_change_in_cash || totals.net_cash_flow || data.net_cash_flow || 0;
    const isPositive = netCashFlow >= 0;
    const operatingCF = cashFlowStatement.operating_activities?.net_operating_cash_flow || operating.net_operating_cash_flow || 0;
    const freeCashFlow = financialRatios.free_cash_flow || (operatingCF - (investing.capital_expenditures || 0));

    // Waterfall chart data for cash flow drivers
    const waterfallData = [
      { name: 'Starting\nCash', value: 0, cumulative: 0 },
      { name: 'Operating\nActivities', value: operatingCF, cumulative: operatingCF },
      { name: 'Investing\nActivities', value: investing.net_investing_cash_flow || 0, cumulative: operatingCF + (investing.net_investing_cash_flow || 0) },
      { name: 'Financing\nActivities', value: financing.net_financing_cash_flow || 0, cumulative: netCashFlow },
      { name: 'Ending\nCash', value: 0, cumulative: netCashFlow },
    ];

    return (
      <Stack gap="xl">
        {/* Report Period Header */}
        {reportPeriod.current_start && (
          <Paper p="md" withBorder style={{ backgroundColor: '#f8f9fa' }}>
            <Group>
              <Text fw={600}>Report Period:</Text>
              <Text>
                {dayjs(reportPeriod.current_start).format('MMMM D, YYYY')} - {dayjs(reportPeriod.current_end).format('MMMM D, YYYY')}
              </Text>
            </Group>
          </Paper>
        )}

        {/* Notice for old reports */}
        {isOldReport && (
          <Card p="md" withBorder style={{ backgroundColor: '#fff3cd', borderLeft: '4px solid #ffc107' }}>
            <Group justify="space-between" wrap="nowrap">
              <Group gap="sm">
                <Text fw={600} c="orange">⚠️ Legacy Report Format:</Text>
                <Text size="sm" style={{ flex: 1 }}>
                  This report was generated with an older format. Generate a new cash flow report to see comprehensive Fortune 500-level analysis with financial ratios, GAAP statements, waterfall charts, period comparisons, and detailed breakdowns.
                </Text>
              </Group>
            </Group>
          </Card>
        )}

        {/* Executive Summary Section - Fortune 500 Style */}
        <Card p="xl" withBorder style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)' }}>
          <Title order={2} mb="lg" style={{ color: '#1a1a1a', fontWeight: 700 }}>EXECUTIVE SUMMARY</Title>
          <Divider mb="lg" />
          
          <Grid mb="xl">
            <Grid.Col span={8}>
              <Stack gap="md">
                <Text fw={600} size="lg" mb="xs">Key Highlights</Text>
                {executiveSummary.highlights?.length > 0 ? (
                  <Stack gap="xs">
                    {executiveSummary.highlights.map((highlight: string, idx: number) => (
                      <Group key={idx} gap="sm">
                        <IconArrowRight size={16} color="#2563eb" />
                        <Text size="sm">{highlight}</Text>
                      </Group>
                    ))}
                  </Stack>
                ) : (
                  <Stack gap="xs">
                    <Group gap="sm">
                      <IconArrowRight size={16} color="#2563eb" />
                      <Text size="sm">
                        Net cash flow of ${Math.abs(netCashFlow).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {netCashFlow >= 0 ? 'demonstrates positive cash generation' : 'indicates cash outflow during this period'}
                      </Text>
                    </Group>
                    {operatingCF !== 0 && (
                      <Group gap="sm">
                        <IconArrowRight size={16} color="#2563eb" />
                        <Text size="sm">
                          Operating cash flow: ${Math.abs(operatingCF).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {operatingCF >= 0 ? '(positive)' : '(negative)'}
                        </Text>
                      </Group>
                    )}
                    {totals.total_receivable > 0 && (
                      <Group gap="sm">
                        <IconArrowRight size={16} color="#2563eb" />
                        <Text size="sm">
                          Total receivables: ${totals.total_receivable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Text>
                      </Group>
                    )}
                    {totals.total_payable > 0 && (
                      <Group gap="sm">
                        <IconArrowRight size={16} color="#2563eb" />
                        <Text size="sm">
                          Total payables: ${totals.total_payable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Text>
                      </Group>
                    )}
                  </Stack>
                )}
              </Stack>
            </Grid.Col>
            <Grid.Col span={4}>
              <Stack gap="md">
                <Card p="md" withBorder style={{ backgroundColor: isPositive ? '#ecfdf5' : '#fef2f2' }}>
                  <Text size="xs" c="dimmed" mb={4}>Period Net Cash Flow</Text>
                  <Text fw={700} size="xl" c={isPositive ? 'green' : 'red'}>
                    ${Math.abs(netCashFlow).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </Card>
                {periodComparison.revenue && (
                  <Card p="md" withBorder>
                    <Text size="xs" c="dimmed" mb={4}>Revenue Change</Text>
                    <Group gap="xs">
                      {periodComparison.revenue.change > 0 ? (
                        <IconTrendingUp size={18} color="green" />
                      ) : (
                        <IconTrendingDown size={18} color="red" />
                      )}
                      <Text fw={600} c={periodComparison.revenue.change >= 0 ? 'green' : 'red'}>
                        {periodComparison.revenue.change > 0 ? '+' : ''}{periodComparison.revenue.change.toFixed(1)}%
                      </Text>
                    </Group>
                  </Card>
                )}
              </Stack>
            </Grid.Col>
          </Grid>
        </Card>

        {/* Key Performance Indicators - Fortune 500 Dashboard */}
        <Card p="lg" withBorder>
          <Title order={3} mb="lg">KEY PERFORMANCE INDICATORS</Title>
          <Grid>
            <Grid.Col span={3}>
              <Card p="md" withBorder style={{ borderLeft: '4px solid #10b981' }}>
                <Text size="xs" c="dimmed" mb={4}>Net Cash Flow</Text>
                <Group gap="xs" align="flex-end">
                  {isPositive ? (
                    <IconTrendingUp size={20} color="green" />
                  ) : (
                    <IconTrendingDown size={20} color="red" />
                  )}
                  <Text fw={700} size="xl" c={isPositive ? 'green' : 'red'}>
                    ${Math.abs(netCashFlow).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </Group>
              </Card>
            </Grid.Col>
          <Grid.Col span={3}>
            <Card p="md" withBorder>
              <Text size="xs" c="dimmed" mb={4}>Total Receivables</Text>
              <Text fw={700} size="xl">
                ${(totals.total_receivable || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
              <Text size="xs" c="dimmed" mt={4}>
                Outstanding: ${(totals.outstanding_receivables || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </Card>
          </Grid.Col>
          <Grid.Col span={3}>
            <Card p="md" withBorder>
              <Text size="xs" c="dimmed" mb={4}>Total Payables</Text>
              <Text fw={700} size="xl">
                ${(totals.total_payable || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </Card>
          </Grid.Col>
          <Grid.Col span={3}>
            <Card p="md" withBorder>
              <Text size="xs" c="dimmed" mb={4}>Operating Cash Flow</Text>
              <Group gap="xs" align="flex-end">
                {operating.net_operating_cash_flow >= 0 ? (
                  <IconTrendingUp size={20} color="green" />
                ) : (
                  <IconTrendingDown size={20} color="red" />
                )}
                <Text fw={700} size="xl" c={operating.net_operating_cash_flow >= 0 ? 'green' : 'red'}>
                  ${Math.abs(operating.net_operating_cash_flow || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </Group>
            </Card>
          </Grid.Col>
        </Grid>
        </Card>

        {/* Financial Ratios Dashboard */}
        <Card p="lg" withBorder>
          <Title order={3} mb="lg">FINANCIAL RATIOS & METRICS</Title>
          <Grid>
            <Grid.Col span={3}>
              <Card p="md" withBorder style={{ borderLeft: '4px solid #3b82f6' }}>
                <Text size="xs" c="dimmed" mb={4}>Operating Cash Flow Margin</Text>
                <Text fw={700} size="xl">
                  {(financialRatios.operating_cash_flow_margin || 0).toFixed(1)}%
                </Text>
                <Text size="xs" c="dimmed" mt={4}>OCF / Revenue</Text>
              </Card>
            </Grid.Col>
            <Grid.Col span={3}>
              <Card p="md" withBorder style={{ borderLeft: '4px solid #8b5cf6' }}>
                <Text size="xs" c="dimmed" mb={4}>Free Cash Flow</Text>
                <Text fw={700} size="xl" c={freeCashFlow >= 0 ? 'green' : 'red'}>
                  ${Math.abs(freeCashFlow).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
                <Text size="xs" c="dimmed" mt={4}>OCF - CapEx</Text>
              </Card>
            </Grid.Col>
            <Grid.Col span={3}>
              <Card p="md" withBorder style={{ borderLeft: '4px solid #f59e0b' }}>
                <Text size="xs" c="dimmed" mb={4}>Cash Conversion Cycle</Text>
                <Text fw={700} size="xl">
                  {(financialRatios.cash_conversion_cycle || 0).toFixed(1)} days
                </Text>
                <Text size="xs" c="dimmed" mt={4}>DSO + DIO - DPO</Text>
              </Card>
            </Grid.Col>
            <Grid.Col span={3}>
              <Card p="md" withBorder style={{ borderLeft: '4px solid #ef4444' }}>
                <Text size="xs" c="dimmed" mb={4}>Days Sales Outstanding</Text>
                <Text fw={700} size="xl">
                  {(financialRatios.days_sales_outstanding || 0).toFixed(1)} days
                </Text>
                <Text size="xs" c="dimmed" mt={4}>Average Collection Period</Text>
              </Card>
            </Grid.Col>
            <Grid.Col span={3}>
              <Card p="md" withBorder>
                <Text size="xs" c="dimmed" mb={4}>Current Ratio</Text>
                <Text fw={700} size="xl">
                  {(financialRatios.current_ratio || 0).toFixed(2)}
                </Text>
                <Text size="xs" c="dimmed" mt={4}>Current Assets / Liabilities</Text>
              </Card>
            </Grid.Col>
            <Grid.Col span={3}>
              <Card p="md" withBorder>
                <Text size="xs" c="dimmed" mb={4}>Quick Ratio</Text>
                <Text fw={700} size="xl">
                  {(financialRatios.quick_ratio || 0).toFixed(2)}
                </Text>
                <Text size="xs" c="dimmed" mt={4}>Liquidity Measure</Text>
              </Card>
            </Grid.Col>
            <Grid.Col span={3}>
              <Card p="md" withBorder>
                <Text size="xs" c="dimmed" mb={4}>Working Capital</Text>
                <Text fw={700} size="xl" c={(financialRatios.working_capital || 0) >= 0 ? 'green' : 'red'}>
                  ${Math.abs(financialRatios.working_capital || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
                <Text size="xs" c="dimmed" mt={4}>Current Assets - Liabilities</Text>
              </Card>
            </Grid.Col>
            <Grid.Col span={3}>
              <Card p="md" withBorder>
                <Text size="xs" c="dimmed" mb={4}>Days Payable Outstanding</Text>
                <Text fw={700} size="xl">
                  {(financialRatios.days_payable_outstanding || 0).toFixed(1)} days
                </Text>
                <Text size="xs" c="dimmed" mt={4}>Payment Period</Text>
              </Card>
            </Grid.Col>
          </Grid>
        </Card>

        {/* GAAP Cash Flow Statement */}
        <Card p="lg" withBorder>
          <Title order={3} mb="lg">STATEMENT OF CASH FLOWS (GAAP)</Title>
          <Paper p="md" withBorder style={{ backgroundColor: '#fafafa' }}>
            <Table withColumnBorders>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: '60%' }}>CASH FLOWS FROM OPERATING ACTIVITIES</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Amount</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                <Table.Tr>
                  <Table.Td style={{ paddingLeft: '2rem' }}>Cash received from customers</Table.Td>
                  <Table.Td style={{ textAlign: 'right', fontWeight: 600, color: 'green' }}>
                    ${(cashFlowStatement.operating_activities?.cash_from_customers || operating.cash_from_customers || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td style={{ paddingLeft: '2rem' }}>Cash paid to suppliers</Table.Td>
                  <Table.Td style={{ textAlign: 'right', fontWeight: 600, color: 'red' }}>
                    (${Math.abs(cashFlowStatement.operating_activities?.cash_paid_to_suppliers || operating.cash_paid_to_suppliers || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                  </Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td style={{ paddingLeft: '2rem' }}>Cash paid for operating expenses</Table.Td>
                  <Table.Td style={{ textAlign: 'right', fontWeight: 600, color: 'red' }}>
                    (${Math.abs(cashFlowStatement.operating_activities?.cash_paid_for_expenses || operating.cash_paid_for_expenses || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                  </Table.Td>
                </Table.Tr>
                {cashFlowStatement.operating_activities?.salaries_and_wages && (
                  <Table.Tr>
                    <Table.Td style={{ paddingLeft: '2rem' }}>Salaries and wages</Table.Td>
                    <Table.Td style={{ textAlign: 'right', fontWeight: 600, color: 'red' }}>
                      (${Math.abs(cashFlowStatement.operating_activities.salaries_and_wages).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                    </Table.Td>
                  </Table.Tr>
                )}
                {cashFlowStatement.operating_activities?.interest_paid && (
                  <Table.Tr>
                    <Table.Td style={{ paddingLeft: '2rem' }}>Interest paid</Table.Td>
                    <Table.Td style={{ textAlign: 'right', fontWeight: 600, color: 'red' }}>
                      (${Math.abs(cashFlowStatement.operating_activities.interest_paid).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                    </Table.Td>
                  </Table.Tr>
                )}
                {cashFlowStatement.operating_activities?.taxes_paid && (
                  <Table.Tr>
                    <Table.Td style={{ paddingLeft: '2rem' }}>Income taxes paid</Table.Td>
                    <Table.Td style={{ textAlign: 'right', fontWeight: 600, color: 'red' }}>
                      (${Math.abs(cashFlowStatement.operating_activities.taxes_paid).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                    </Table.Td>
                  </Table.Tr>
                )}
                <Table.Tr style={{ backgroundColor: '#f0f0f0', fontWeight: 700 }}>
                  <Table.Td>Net cash provided by operating activities</Table.Td>
                  <Table.Td style={{ textAlign: 'right', fontWeight: 700, fontSize: '1.1rem' }} c={operatingCF >= 0 ? 'green' : 'red'}>
                    ${operatingCF.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>

            <Divider my="lg" />

            <Table withColumnBorders>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: '60%' }}>CASH FLOWS FROM INVESTING ACTIVITIES</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Amount</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {cashFlowStatement.investing_activities?.capital_expenditures && (
                  <Table.Tr>
                    <Table.Td style={{ paddingLeft: '2rem' }}>Capital expenditures</Table.Td>
                    <Table.Td style={{ textAlign: 'right', fontWeight: 600, color: 'red' }}>
                      (${Math.abs(cashFlowStatement.investing_activities.capital_expenditures).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                    </Table.Td>
                  </Table.Tr>
                )}
                <Table.Tr style={{ backgroundColor: '#f0f0f0', fontWeight: 700 }}>
                  <Table.Td>Net cash used in investing activities</Table.Td>
                  <Table.Td style={{ textAlign: 'right', fontWeight: 700, fontSize: '1.1rem' }} c={investing.net_investing_cash_flow >= 0 ? 'green' : 'red'}>
                    ${(investing.net_investing_cash_flow || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>

            <Divider my="lg" />

            <Table withColumnBorders>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: '60%' }}>CASH FLOWS FROM FINANCING ACTIVITIES</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Amount</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {financing.net_financing_cash_flow !== 0 && (
                  <>
                    {financing.equity_issuances > 0 && (
                      <Table.Tr>
                        <Table.Td style={{ paddingLeft: '2rem' }}>Proceeds from issuance of equity</Table.Td>
                        <Table.Td style={{ textAlign: 'right', fontWeight: 600, color: 'green' }}>
                          ${financing.equity_issuances.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Table.Td>
                      </Table.Tr>
                    )}
                    {financing.debt_repayments > 0 && (
                      <Table.Tr>
                        <Table.Td style={{ paddingLeft: '2rem' }}>Repayment of debt</Table.Td>
                        <Table.Td style={{ textAlign: 'right', fontWeight: 600, color: 'red' }}>
                          (${financing.debt_repayments.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                        </Table.Td>
                      </Table.Tr>
                    )}
                    {financing.dividends_paid > 0 && (
                      <Table.Tr>
                        <Table.Td style={{ paddingLeft: '2rem' }}>Dividends paid</Table.Td>
                        <Table.Td style={{ textAlign: 'right', fontWeight: 600, color: 'red' }}>
                          (${financing.dividends_paid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                        </Table.Td>
                      </Table.Tr>
                    )}
                  </>
                )}
                <Table.Tr style={{ backgroundColor: '#f0f0f0', fontWeight: 700 }}>
                  <Table.Td>Net cash used in financing activities</Table.Td>
                  <Table.Td style={{ textAlign: 'right', fontWeight: 700, fontSize: '1.1rem' }} c={financing.net_financing_cash_flow >= 0 ? 'green' : 'red'}>
                    ${(financing.net_financing_cash_flow || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>

            <Divider my="lg" />

            <Table withColumnBorders>
              <Table.Tbody>
                <Table.Tr style={{ backgroundColor: '#e0e0e0', fontWeight: 700 }}>
                  <Table.Td style={{ fontSize: '1.2rem' }}>NET INCREASE (DECREASE) IN CASH AND CASH EQUIVALENTS</Table.Td>
                  <Table.Td style={{ textAlign: 'right', fontWeight: 700, fontSize: '1.2rem' }} c={netCashFlow >= 0 ? 'green' : 'red'}>
                    ${netCashFlow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>
          </Paper>
        </Card>

        {/* Waterfall Chart and Period Comparison */}
        <Grid>
          <Grid.Col span={8}>
            <Card p="lg" withBorder>
              <Title order={4} mb="md">Cash Flow Drivers - Waterfall Analysis</Title>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={waterfallData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip />
                  <Bar dataKey="value" fill="#6366f1" name="Cash Flow Change" />
                  <Line type="monotone" dataKey="cumulative" stroke="#10b981" strokeWidth={3} name="Cumulative Cash" />
                </ComposedChart>
              </ResponsiveContainer>
            </Card>
          </Grid.Col>
          <Grid.Col span={4}>
            <Card p="lg" withBorder>
              <Title order={4} mb="md">Period Comparison</Title>
              {periodComparison.revenue && (
                <Stack gap="md">
                  <Paper p="md" withBorder>
                    <Text size="sm" fw={600} mb="xs">Revenue</Text>
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">Current:</Text>
                      <Text fw={600}>${(periodComparison.revenue.current || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                    </Group>
                    <Group justify="space-between" mt="xs">
                      <Text size="sm" c="dimmed">Previous:</Text>
                      <Text>${(periodComparison.revenue.previous || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                    </Group>
                    <Group justify="space-between" mt="xs">
                      <Text size="sm" c="dimmed">Change:</Text>
                      <Text fw={600} c={periodComparison.revenue.change >= 0 ? 'green' : 'red'}>
                        {periodComparison.revenue.change > 0 ? '+' : ''}{periodComparison.revenue.change.toFixed(1)}%
                      </Text>
                    </Group>
                  </Paper>
                </Stack>
              )}
            </Card>
          </Grid.Col>
        </Grid>

        {/* Daily Cash Flow Trend Chart */}
        {dailyTrend.length > 0 && (
          <Card p="lg" withBorder>
            <Title order={4} mb="md">Daily Cash Flow Trend</Title>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={dailyTrend}>
                <defs>
                  <linearGradient id="inflowGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="outflowGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <RechartsTooltip />
                <Legend />
                <Area type="monotone" dataKey="inflow" stroke="#10b981" fillOpacity={1} fill="url(#inflowGradient)" name="Cash Inflow" />
                <Area type="monotone" dataKey="outflow" stroke="#ef4444" fillOpacity={1} fill="url(#outflowGradient)" name="Cash Outflow" />
                <Line type="monotone" dataKey="net" stroke="#6366f1" strokeWidth={2} name="Net Flow" />
                <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        )}

        <Tabs defaultValue="ratios">
          <Tabs.List>
            <Tabs.Tab value="ratios">Financial Ratios</Tabs.Tab>
            <Tabs.Tab value="operating">Operating Activities</Tabs.Tab>
            <Tabs.Tab value="receivables">Receivables</Tabs.Tab>
            <Tabs.Tab value="payables">Payables</Tabs.Tab>
            <Tabs.Tab value="aging">Aging Analysis</Tabs.Tab>
            <Tabs.Tab value="summary">Vendor/Customer Summary</Tabs.Tab>
          </Tabs.List>

          {/* Financial Ratios Detail Tab */}
          <Tabs.Panel value="ratios" pt="md">
            <Card p="lg" withBorder>
              <Title order={4} mb="lg">Detailed Financial Ratio Analysis</Title>
              <Grid>
                <Grid.Col span={6}>
                  <Paper p="md" withBorder>
                    <Text fw={600} mb="md">Liquidity Ratios</Text>
                    <Table>
                      <Table.Tbody>
                        <Table.Tr>
                          <Table.Td>Current Ratio</Table.Td>
                          <Table.Td style={{ textAlign: 'right' }}>
                            <Text fw={600}>{(financialRatios.current_ratio || 0).toFixed(2)}</Text>
                            <Text size="xs" c="dimmed">Current Assets / Current Liabilities</Text>
                          </Table.Td>
                        </Table.Tr>
                        <Table.Tr>
                          <Table.Td>Quick Ratio</Table.Td>
                          <Table.Td style={{ textAlign: 'right' }}>
                            <Text fw={600}>{(financialRatios.quick_ratio || 0).toFixed(2)}</Text>
                            <Text size="xs" c="dimmed">(Current Assets - Inventory) / Liabilities</Text>
                          </Table.Td>
                        </Table.Tr>
                        <Table.Tr>
                          <Table.Td>Cash Ratio</Table.Td>
                          <Table.Td style={{ textAlign: 'right' }}>
                            <Text fw={600}>{(financialRatios.cash_ratio || 0).toFixed(2)}</Text>
                            <Text size="xs" c="dimmed">Cash / Current Liabilities</Text>
                          </Table.Td>
                        </Table.Tr>
                      </Table.Tbody>
                    </Table>
                  </Paper>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Paper p="md" withBorder>
                    <Text fw={600} mb="md">Efficiency Ratios</Text>
                    <Table>
                      <Table.Tbody>
                        <Table.Tr>
                          <Table.Td>Days Sales Outstanding (DSO)</Table.Td>
                          <Table.Td style={{ textAlign: 'right' }}>
                            <Text fw={600}>{(financialRatios.days_sales_outstanding || 0).toFixed(1)} days</Text>
                            <Text size="xs" c="dimmed">Average Collection Period</Text>
                          </Table.Td>
                        </Table.Tr>
                        <Table.Tr>
                          <Table.Td>Days Payable Outstanding (DPO)</Table.Td>
                          <Table.Td style={{ textAlign: 'right' }}>
                            <Text fw={600}>{(financialRatios.days_payable_outstanding || 0).toFixed(1)} days</Text>
                            <Text size="xs" c="dimmed">Payment Period</Text>
                          </Table.Td>
                        </Table.Tr>
                        <Table.Tr>
                          <Table.Td>Cash Conversion Cycle</Table.Td>
                          <Table.Td style={{ textAlign: 'right' }}>
                            <Text fw={600}>{(financialRatios.cash_conversion_cycle || 0).toFixed(1)} days</Text>
                            <Text size="xs" c="dimmed">DSO + DIO - DPO</Text>
                          </Table.Td>
                        </Table.Tr>
                      </Table.Tbody>
                    </Table>
                  </Paper>
                </Grid.Col>
                <Grid.Col span={12}>
                  <Paper p="md" withBorder>
                    <Text fw={600} mb="md">Cash Flow Metrics</Text>
                    <Grid>
                      <Grid.Col span={4}>
                        <Group justify="space-between" p="md" style={{ backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                          <Text fw={600}>Operating Cash Flow Margin</Text>
                          <Text fw={700} size="lg">
                            {(financialRatios.operating_cash_flow_margin || 0).toFixed(1)}%
                          </Text>
                        </Group>
                      </Grid.Col>
                      <Grid.Col span={4}>
                        <Group justify="space-between" p="md" style={{ backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                          <Text fw={600}>Free Cash Flow</Text>
                          <Text fw={700} size="lg" c={freeCashFlow >= 0 ? 'green' : 'red'}>
                            ${Math.abs(freeCashFlow).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Text>
                        </Group>
                      </Grid.Col>
                      <Grid.Col span={4}>
                        <Group justify="space-between" p="md" style={{ backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                          <Text fw={600}>Working Capital</Text>
                          <Text fw={700} size="lg" c={(financialRatios.working_capital || 0) >= 0 ? 'green' : 'red'}>
                            ${Math.abs(financialRatios.working_capital || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Text>
                        </Group>
                      </Grid.Col>
                    </Grid>
                  </Paper>
                </Grid.Col>
              </Grid>
            </Card>
          </Tabs.Panel>

          {/* Operating Activities */}
          <Tabs.Panel value="operating" pt="md">
            <Card p="md" withBorder>
              <Title order={4} mb="md">Operating Activities</Title>
              <Table striped highlightOnHover>
                <Table.Tbody>
                  <Table.Tr>
                    <Table.Td fw={600}>Cash Received from Customers</Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      <Text c="green" fw={600}>
                        ${(operating.cash_from_customers || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td fw={600}>Cash Paid to Suppliers</Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      <Text c="red" fw={600}>
                        -${(operating.cash_paid_to_suppliers || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td fw={600}>Cash Paid for Operating Expenses</Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      <Text c="red" fw={600}>
                        -${(operating.cash_paid_for_expenses || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td fw={700}>Net Operating Cash Flow</Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      <Text 
                        fw={700} 
                        size="lg"
                        c={operating.net_operating_cash_flow >= 0 ? 'green' : 'red'}
                      >
                        ${(operating.net_operating_cash_flow || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                </Table.Tbody>
              </Table>
            </Card>
          </Tabs.Panel>

          {/* Receivables */}
          <Tabs.Panel value="receivables" pt="md">
            <Card p="md" withBorder>
              <Title order={4} mb="md">Accounts Receivable</Title>
              <ScrollArea>
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Invoice #</Table.Th>
                      <Table.Th>Customer</Table.Th>
                      <Table.Th>Invoice Date</Table.Th>
                      <Table.Th>Due Date</Table.Th>
                      <Table.Th style={{ textAlign: 'right' }}>Total Amount</Table.Th>
                      <Table.Th style={{ textAlign: 'right' }}>Paid</Table.Th>
                      <Table.Th style={{ textAlign: 'right' }}>Outstanding</Table.Th>
                      <Table.Th>Status</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {receivables.length === 0 ? (
                      <Table.Tr>
                        <Table.Td colSpan={8} style={{ textAlign: 'center' }}>
                          <Text c="dimmed">No receivables data available</Text>
                        </Table.Td>
                      </Table.Tr>
                    ) : (
                      receivables.map((ar: any) => (
                        <Table.Tr key={ar.id}>
                          <Table.Td>{ar.invoice_number}</Table.Td>
                          <Table.Td>{ar.customer_name}</Table.Td>
                          <Table.Td>{dayjs(ar.invoice_date).format('MMM D, YYYY')}</Table.Td>
                          <Table.Td>{dayjs(ar.due_date).format('MMM D, YYYY')}</Table.Td>
                          <Table.Td style={{ textAlign: 'right' }}>
                            ${(ar.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'right' }}>
                            ${(ar.paid_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'right' }}>
                            <Text fw={600}>
                              ${(ar.outstanding_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge 
                              color={
                                ar.status === 'paid' ? 'green' :
                                ar.status === 'overdue' ? 'red' :
                                ar.status === 'partial' ? 'yellow' : 'gray'
                              }
                            >
                              {ar.status}
                            </Badge>
                          </Table.Td>
                        </Table.Tr>
                      ))
                    )}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            </Card>
          </Tabs.Panel>

          {/* Payables */}
          <Tabs.Panel value="payables" pt="md">
            <Card p="md" withBorder>
              <Title order={4} mb="md">Accounts Payable</Title>
              <ScrollArea>
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Invoice #</Table.Th>
                      <Table.Th>Vendor</Table.Th>
                      <Table.Th>Invoice Date</Table.Th>
                      <Table.Th>Due Date</Table.Th>
                      <Table.Th style={{ textAlign: 'right' }}>Total Amount</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th>Payment Date</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {payables.length === 0 ? (
                      <Table.Tr>
                        <Table.Td colSpan={7} style={{ textAlign: 'center' }}>
                          <Text c="dimmed">No payables data available</Text>
                        </Table.Td>
                      </Table.Tr>
                    ) : (
                      payables.map((inv: any) => (
                        <Table.Tr key={inv.id}>
                          <Table.Td>{inv.invoice_number}</Table.Td>
                          <Table.Td>{inv.vendor_name}</Table.Td>
                          <Table.Td>{dayjs(inv.invoice_date).format('MMM D, YYYY')}</Table.Td>
                          <Table.Td>{dayjs(inv.due_date).format('MMM D, YYYY')}</Table.Td>
                          <Table.Td style={{ textAlign: 'right' }}>
                            ${(inv.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Table.Td>
                          <Table.Td>
                            <Badge 
                              color={
                                inv.status === 'paid' ? 'green' :
                                inv.status === 'approved' ? 'blue' :
                                inv.status === 'pending' ? 'yellow' : 'gray'
                              }
                            >
                              {inv.status}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            {inv.payment_date ? dayjs(inv.payment_date).format('MMM D, YYYY') : '-'}
                          </Table.Td>
                        </Table.Tr>
                      ))
                    )}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            </Card>
          </Tabs.Panel>

          {/* Aging Analysis */}
          <Tabs.Panel value="aging" pt="md">
            <Grid>
              <Grid.Col span={6}>
                <Card p="md" withBorder>
                  <Title order={4} mb="md">Receivables Aging</Title>
                  <Table>
                    <Table.Tbody>
                      <Table.Tr>
                        <Table.Td>Current</Table.Td>
                        <Table.Td style={{ textAlign: 'right' }}>
                          ${(aging.current || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Table.Td>
                      </Table.Tr>
                      <Table.Tr>
                        <Table.Td>1-30 Days Past Due</Table.Td>
                        <Table.Td style={{ textAlign: 'right' }}>
                          ${(aging.days_30_60 || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Table.Td>
                      </Table.Tr>
                      <Table.Tr>
                        <Table.Td>31-60 Days Past Due</Table.Td>
                        <Table.Td style={{ textAlign: 'right' }}>
                          ${(aging.days_60_90 || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Table.Td>
                      </Table.Tr>
                      <Table.Tr>
                        <Table.Td>Over 90 Days Past Due</Table.Td>
                        <Table.Td style={{ textAlign: 'right' }}>
                          <Text c="red" fw={600}>
                            ${(aging.over_90 || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                      <Table.Tr>
                        <Table.Td fw={700}>Total Outstanding</Table.Td>
                        <Table.Td style={{ textAlign: 'right' }}>
                          <Text fw={700}>
                            ${((aging.current || 0) + (aging.days_30_60 || 0) + (aging.days_60_90 || 0) + (aging.over_90 || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    </Table.Tbody>
                  </Table>
                </Card>
              </Grid.Col>
              <Grid.Col span={6}>
                <Card p="md" withBorder>
                  <Title order={4} mb="md">Aging Distribution</Title>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Current', value: aging.current || 0 },
                          { name: '1-30 Days', value: aging.days_30_60 || 0 },
                          { name: '31-60 Days', value: aging.days_60_90 || 0 },
                          { name: 'Over 90 Days', value: aging.over_90 || 0 },
                        ].filter(item => item.value > 0)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {[
                          { name: 'Current', value: aging.current || 0 },
                          { name: '1-30 Days', value: aging.days_30_60 || 0 },
                          { name: '31-60 Days', value: aging.days_60_90 || 0 },
                          { name: 'Over 90 Days', value: aging.over_90 || 0 },
                        ].filter(item => item.value > 0).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>
              </Grid.Col>
            </Grid>
          </Tabs.Panel>

          {/* Vendor/Customer Summary */}
          <Tabs.Panel value="summary" pt="md">
            <Grid>
              <Grid.Col span={6}>
                <Card p="md" withBorder>
                  <Title order={4} mb="md">Vendor Summary</Title>
                  <ScrollArea h={400}>
                    <Table striped highlightOnHover>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Vendor</Table.Th>
                          <Table.Th style={{ textAlign: 'right' }}>Total</Table.Th>
                          <Table.Th style={{ textAlign: 'right' }}>Paid</Table.Th>
                          <Table.Th style={{ textAlign: 'right' }}>Pending</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {Object.entries(vendors).length === 0 ? (
                          <Table.Tr>
                            <Table.Td colSpan={4} style={{ textAlign: 'center' }}>
                              <Text c="dimmed">No vendor data</Text>
                            </Table.Td>
                          </Table.Tr>
                        ) : (
                          Object.entries(vendors)
                            .sort((a, b) => (b[1] as any).total - (a[1] as any).total)
                            .map(([vendor, data]: [string, any]) => (
                              <Table.Tr key={vendor}>
                                <Table.Td>{vendor}</Table.Td>
                                <Table.Td style={{ textAlign: 'right' }}>
                                  ${data.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </Table.Td>
                                <Table.Td style={{ textAlign: 'right' }}>
                                  <Text c="green">
                                    ${data.paid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </Text>
                                </Table.Td>
                                <Table.Td style={{ textAlign: 'right' }}>
                                  <Text c="orange">
                                    ${data.pending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </Text>
                                </Table.Td>
                              </Table.Tr>
                            ))
                        )}
                      </Table.Tbody>
                    </Table>
                  </ScrollArea>
                </Card>
              </Grid.Col>
              <Grid.Col span={6}>
                <Card p="md" withBorder>
                  <Title order={4} mb="md">Customer Summary</Title>
                  <ScrollArea h={400}>
                    <Table striped highlightOnHover>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Customer</Table.Th>
                          <Table.Th style={{ textAlign: 'right' }}>Total</Table.Th>
                          <Table.Th style={{ textAlign: 'right' }}>Paid</Table.Th>
                          <Table.Th style={{ textAlign: 'right' }}>Outstanding</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {Object.entries(customers).length === 0 ? (
                          <Table.Tr>
                            <Table.Td colSpan={4} style={{ textAlign: 'center' }}>
                              <Text c="dimmed">No customer data</Text>
                            </Table.Td>
                          </Table.Tr>
                        ) : (
                          Object.entries(customers)
                            .sort((a, b) => (b[1] as any).total - (a[1] as any).total)
                            .map(([customer, data]: [string, any]) => (
                              <Table.Tr key={customer}>
                                <Table.Td>{customer}</Table.Td>
                                <Table.Td style={{ textAlign: 'right' }}>
                                  ${data.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </Table.Td>
                                <Table.Td style={{ textAlign: 'right' }}>
                                  <Text c="green">
                                    ${data.paid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </Text>
                                </Table.Td>
                                <Table.Td style={{ textAlign: 'right' }}>
                                  <Text c="red" fw={600}>
                                    ${data.outstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </Text>
                                </Table.Td>
                              </Table.Tr>
                            ))
                        )}
                      </Table.Tbody>
                    </Table>
                  </ScrollArea>
                </Card>
              </Grid.Col>
            </Grid>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    );
  };

  return (
    <Stack gap="lg">
      <Card p="lg" radius="md" withBorder>
        <Group justify="space-between" mb="md">
          <div>
            <Text fw={700} size="xl">Financial Reports</Text>
            <Text c="dimmed" size="sm">Generate and view financial reports</Text>
          </div>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => setModalOpen(true)}
          >
            Generate Report
          </Button>
        </Group>

        {summaryData && (
          <Grid mb="xl">
            <Grid.Col span={{ base: 12, md: 8 }}>
              <Card p="md" radius="md" withBorder>
                <Text fw={600} mb="md">Expense Trends (Last 90 Days)</Text>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={expenseChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Line type="monotone" dataKey="amount" stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Card p="md" radius="md" withBorder>
                <Text fw={600} mb="md">Expenses by Category</Text>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </Grid.Col>
          </Grid>
        )}

        {loading ? (
          <Center h={200}>
            <Loader />
          </Center>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Report Name</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th>Period</Table.Th>
                <Table.Th>Generated</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {reports.map(report => (
                <Table.Tr key={report.id}>
                  <Table.Td>
                    <Text fw={500}>{report.report_name}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge>{getReportTypeLabel(report.report_type)}</Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">
                      {dayjs(report.report_period_start).format('MMM D')} - {dayjs(report.report_period_end).format('MMM D, YYYY')}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{dayjs(report.generated_at).format('MMM D, YYYY')}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={report.status === 'final' ? 'green' : 'gray'}>
                      {report.status}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Tooltip label="View Report">
                        <ActionIcon 
                          variant="light"
                          onClick={() => {
                            setSelectedReport(report);
                            setViewModalOpen(true);
                          }}
                        >
                          <IconEye size={16} />
                        </ActionIcon>
                      </Tooltip>
                      {report.pdf_url && (
                        <Tooltip label="Download PDF">
                          <ActionIcon
                            variant="light"
                            component="a"
                            href={report.pdf_url}
                            target="_blank"
                          >
                            <IconDownload size={16} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Card>

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Generate Financial Report"
        size="md"
      >
        <Stack gap="md">
          <Select
            label="Report Type"
            required
            data={[
              { value: 'expense_analysis', label: 'Expense Analysis' },
              { value: 'budget_variance', label: 'Budget Variance' },
              { value: 'cash_flow', label: 'Cash Flow' },
              { value: 'income_statement', label: 'Income Statement' },
              { value: 'balance_sheet', label: 'Balance Sheet' },
            ]}
            value={reportType}
            onChange={(value) => setReportType(value || 'expense_analysis')}
          />

          <Grid>
            <Grid.Col span={6}>
              <TextInput
                label="Period Start"
                type="date"
                required
                value={dayjs(periodStart).format('YYYY-MM-DD')}
                onChange={(e) => e.target.value && setPeriodStart(new Date(e.target.value))}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <TextInput
                label="Period End"
                type="date"
                required
                value={dayjs(periodEnd).format('YYYY-MM-DD')}
                onChange={(e) => e.target.value && setPeriodEnd(new Date(e.target.value))}
              />
            </Grid.Col>
          </Grid>

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={generateReport} loading={generating}>
              Generate Report
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false);
          setSelectedReport(null);
        }}
        title={selectedReport?.report_name || "Report Details"}
        size="90%"
        centered
      >
        {selectedReport && (
          <ScrollArea h="calc(90vh - 120px)">
            <Stack gap="lg">
              {/* Header */}
              <Group justify="space-between">
                <Group>
                  <Badge size="lg">{getReportTypeLabel(selectedReport.report_type)}</Badge>
                  <Badge size="lg" color={selectedReport.status === 'final' ? 'green' : 'gray'}>
                    {selectedReport.status.toUpperCase()}
                  </Badge>
                </Group>
                <Group>
                  <Text size="sm" c="dimmed">
                    Generated: {dayjs(selectedReport.generated_at).format('MMM D, YYYY [at] h:mm A')}
                  </Text>
                  {selectedReport.pdf_url && (
                    <Button
                      leftSection={<IconDownload size={16} />}
                      variant="light"
                      size="xs"
                      component="a"
                      href={selectedReport.pdf_url}
                      target="_blank"
                    >
                      Download PDF
                    </Button>
                  )}
                </Group>
              </Group>

              {/* Comprehensive Detailed Report View - Fortune 500 Level for ALL reports */}
              {renderComprehensiveReport(selectedReport)}
            </Stack>
          </ScrollArea>
        )}
      </Modal>
    </Stack>
  );
};

