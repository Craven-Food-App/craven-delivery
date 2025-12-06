import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Row,
  Col,
  Table,
  Typography,
  Space,
  Button,
  Input,
  Select,
  DatePicker,
  Tag,
  Statistic,
  Tooltip,
  message,
  Spin,
  Tabs,
  Badge,
  Descriptions,
  Modal,
  Alert,
  Form,
  InputNumber,
  Popconfirm,
  Divider,
  Progress,
  Switch,
} from 'antd';
import {
  SearchOutlined,
  DownloadOutlined,
  ReloadOutlined,
  DollarOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  EditOutlined,
  ExportOutlined,
  PlusOutlined,
  DeleteOutlined,
  CheckOutlined,
  CloseOutlined,
  UserOutlined,
  CalculatorOutlined,
  FilePdfOutlined,
  PrinterOutlined,
  CalendarOutlined,
  TeamOutlined,
  BankOutlined,
} from '@ant-design/icons';
import { supabase } from '@/integrations/supabase/client';
import dayjs, { Dayjs } from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import { hasFullAccess } from '@/utils/torranceAccess';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

interface PayrollRun {
  id: string;
  run_number: string;
  pay_period_start: string;
  pay_period_end: string;
  pay_date: string;
  pay_frequency: string;
  run_type: string;
  description: string;
  status: string;
  total_employees: number;
  total_gross_pay: number;
  total_taxes: number;
  total_deductions: number;
  total_net_pay: number;
  total_employer_taxes: number;
  total_employer_contributions: number;
  requires_approval: boolean;
  approved_by: string | null;
  approved_at: string | null;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
}

interface PayrollEntry {
  id: string;
  payroll_run_id: string;
  employee_id: string;
  employee_name?: string;
  pay_period_start: string;
  pay_period_end: string;
  pay_date: string;
  gross_pay: number;
  total_taxes: number;
  total_deductions: number;
  net_pay: number;
  payment_status: string;
  status: string;
  ytd_gross_pay: number;
  ytd_net_pay: number;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  position: string;
  department_id: string;
  salary: number;
  employment_type: string;
}

export const PayrollView: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('runs');
  const [canManage, setCanManage] = useState(false);

  // Data state
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [payrollEntries, setPayrollEntries] = useState<PayrollEntry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);

  // Modal states
  const [runModalVisible, setRunModalVisible] = useState(false);
  const [entryModalVisible, setEntryModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [editingRun, setEditingRun] = useState<PayrollRun | null>(null);
  const [editingEntry, setEditingEntry] = useState<PayrollEntry | null>(null);

  // Forms
  const [runForm] = Form.useForm();
  const [entryForm] = Form.useForm();

  // Filters
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<[Dayjs, Dayjs] | null>(null);

  // Fetch all data
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.allSettled([
        fetchPayrollRuns(),
        fetchEmployees(),
      ]);
    } catch (error: any) {
      console.error('Error fetching payroll data:', error);
      if (!error?.message?.includes('Could not find the table') && 
          !error?.message?.includes('schema cache') &&
          error?.code !== 'PGRST116' &&
          error?.code !== '42P01') {
        message.error(error?.message || 'Failed to load Payroll data');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const checkAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCanManage(false);
        return;
      }

      const userEmail = user.email?.toLowerCase();
      
      // TORRANCE STROMAN: UNIVERSAL ACCESS - CHECK FIRST
      if (hasFullAccess(userEmail)) {
        setCanManage(true);
        return;
      }

      // Check if user is CFO
      const { data: execUser } = await supabase
        .from('exec_users')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'cfo')
        .maybeSingle();

      if (execUser) {
        setCanManage(true);
        return;
      }

      // Check finance employees with can_view_all_financials
      const { data: financeEmployee } = await supabase
        .from('finance_employees')
        .select('can_view_all_financials')
        .eq('employee_id', user.id)
        .maybeSingle();

      if (financeEmployee?.can_view_all_financials) {
        setCanManage(true);
        return;
      }

      setCanManage(false);
    } catch (error) {
      console.error('Error checking access:', error);
      setCanManage(false);
    }
  };

  const fetchPayrollRuns = async () => {
    try {
      const { data, error } = await supabase
        .from('payroll_runs')
        .select('*')
        .order('pay_period_start', { ascending: false })
        .limit(100);

      if (error) {
        if (error.code === 'PGRST116' || 
            error.message?.includes('Could not find the table') ||
            error.message?.includes('schema cache') ||
            error.code === '42P01') {
          console.warn('payroll_runs table not found, proceeding with empty data');
          setPayrollRuns([]);
          return;
        }
        throw error;
      }
      setPayrollRuns(data || []);
    } catch (error: any) {
      console.error('Error fetching payroll runs:', error);
      if (error.code === 'PGRST116' || 
          error.message?.includes('Could not find the table') ||
          error.message?.includes('schema cache') ||
          error.code === '42P01') {
        setPayrollRuns([]);
        return;
      }
      throw error;
    }
  };

  const fetchPayrollEntries = async (runId?: string) => {
    try {
      let query = supabase
        .from('payroll_entries')
        .select(`
          *,
          employees!inner(first_name, last_name, email, position)
        `)
        .order('employee_id', { ascending: true });

      if (runId) {
        query = query.eq('payroll_run_id', runId);
      }

      const { data, error } = await query.limit(500);

      if (error) {
        if (error.code === 'PGRST116' || 
            error.message?.includes('Could not find the table') ||
            error.message?.includes('schema cache') ||
            error.code === '42P01') {
          console.warn('payroll_entries table not found, proceeding with empty data');
          setPayrollEntries([]);
          return;
        }
        throw error;
      }

      const entries = (data || []).map((entry: any) => ({
        ...entry,
        employee_name: entry.employees 
          ? `${entry.employees.first_name} ${entry.employees.last_name}`
          : 'Unknown Employee',
      }));

      setPayrollEntries(entries);
    } catch (error: any) {
      console.error('Error fetching payroll entries:', error);
      if (error.code === 'PGRST116' || 
          error.message?.includes('Could not find the table') ||
          error.message?.includes('schema cache') ||
          error.code === '42P01') {
        setPayrollEntries([]);
        return;
      }
      throw error;
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name, email, position, department_id, salary, employment_type')
        .eq('employment_status', 'active')
        .order('last_name', { ascending: true });

      if (error && error.code !== 'PGRST116' && error.code !== '42P01') {
        console.warn('Error fetching employees:', error);
      }
      setEmployees(data || []);
    } catch (error: any) {
      console.error('Error fetching employees:', error);
      setEmployees([]);
    }
  };

  // Create/Update Payroll Run
  const handleCreateOrUpdateRun = async (values: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        message.error('You must be logged in to manage payroll runs');
        return;
      }

      const runData = {
        pay_period_start: dayjs(values.pay_period_start).format('YYYY-MM-DD'),
        pay_period_end: dayjs(values.pay_period_end).format('YYYY-MM-DD'),
        pay_date: dayjs(values.pay_date).format('YYYY-MM-DD'),
        pay_frequency: values.pay_frequency,
        run_type: values.run_type || 'regular',
        description: values.description || null,
        status: 'draft',
        requires_approval: values.requires_approval !== false,
        created_by: user.id,
      };

      if (editingRun) {
        const { error } = await supabase
          .from('payroll_runs')
          .update(runData)
          .eq('id', editingRun.id);

        if (error) throw error;
        message.success('Payroll run updated successfully');
      } else {
        const { error } = await (supabase as any)
          .from('payroll_runs')
          .insert(runData);

        if (error) throw error;
        message.success('Payroll run created successfully');
      }

      setRunModalVisible(false);
      setEditingRun(null);
      runForm.resetFields();
      fetchPayrollRuns();
    } catch (error: any) {
      console.error('Error saving payroll run:', error);
      message.error(error?.message || 'Failed to save payroll run');
    }
  };

  // Calculate Payroll - Enhanced with proper tax and deduction calculations
  const handleCalculatePayroll = async (runId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        message.error('You must be logged in to calculate payroll');
        return;
      }

      // Update run status to calculating
      await supabase
        .from('payroll_runs')
        .update({ status: 'calculating' })
        .eq('id', runId);

      const run = payrollRuns.find(r => r.id === runId);
      if (!run) {
        message.error('Payroll run not found');
        return;
      }

      // Get active employees
      const { data: activeEmployees, error: empError } = await supabase
        .from('employees')
        .select('id, first_name, last_name, salary, hourly_rate, employment_type, employment_status')
        .eq('employment_status', 'active');

      if (empError) throw empError;
      if (!activeEmployees || activeEmployees.length === 0) {
        message.warning('No active employees found');
        await supabase
          .from('payroll_runs')
          .update({ status: 'draft' })
          .eq('id', runId);
        return;
      }

      // Calculate pay periods per year based on frequency
      const payPeriodsPerYear: Record<string, number> = {
        weekly: 52,
        biweekly: 26,
        semimonthly: 24,
        monthly: 12,
        quarterly: 4,
        annual: 1,
      };
      const periodsPerYear = payPeriodsPerYear[run.pay_frequency] || 12;

      // Fetch tax configurations
      const { data: taxConfigs } = await supabase
        .from('payroll_tax_configs')
        .select('*')
        .eq('is_active', true)
        .gte('effective_date', run.pay_period_start)
        .or(`expiration_date.is.null,expiration_date.gte.${run.pay_period_end}`);

      // Fetch employee tax settings and deductions
      const employeeIds = activeEmployees.map(emp => emp.id);
      const [taxSettingsResult, deductionsResult] = await Promise.all([
        supabase
          .from('employee_tax_settings')
          .select('*')
          .in('employee_id', employeeIds)
          .eq('federal_exempt', false)
          .lte('effective_date', run.pay_period_end)
          .or(`expiration_date.is.null,expiration_date.gte.${run.pay_period_start}`),
        supabase
          .from('employee_deductions')
          .select('*')
          .in('employee_id', employeeIds)
          .eq('is_active', true)
          .lte('effective_date', run.pay_period_end)
          .or(`expiration_date.is.null,expiration_date.gte.${run.pay_period_start}`),
      ]);

      const taxSettingsMap = new Map((taxSettingsResult.data || []).map(ts => [ts.employee_id, ts]));
      const deductionsMap = new Map<string, any[]>();
      (deductionsResult.data || []).forEach(ded => {
        if (!deductionsMap.has(ded.employee_id)) {
          deductionsMap.set(ded.employee_id, []);
        }
        deductionsMap.get(ded.employee_id)!.push(ded);
      });

      // Get SS and Medicare rates from tax configs
      const ssConfig = taxConfigs?.find(tc => tc.tax_type === 'social_security');
      const medicareConfig = taxConfigs?.find(tc => tc.tax_type === 'medicare');
      const ssRate = (ssConfig?.tax_rate || 6.2) / 100;
      const ssWageBase = ssConfig?.wage_base || 168600;
      const medicareRate = (medicareConfig?.tax_rate || 1.45) / 100;

      // Calculate payroll entries for each employee
      const entries = await Promise.all(activeEmployees.map(async (emp) => {
        // Calculate gross pay based on employment type
        let grossPay = 0;
        if (emp.employment_type === 'full-time' || emp.employment_type === 'part-time') {
          if (emp.salary) {
            // Salaried employee - divide annual salary by pay periods
            grossPay = emp.salary / periodsPerYear;
          } else if (emp.hourly_rate) {
            // Hourly employee - calculate based on standard hours
            const hoursPerPeriod = run.pay_frequency === 'weekly' ? 40 :
                                   run.pay_frequency === 'biweekly' ? 80 :
                                   run.pay_frequency === 'semimonthly' ? 86.67 :
                                   run.pay_frequency === 'monthly' ? 173.33 : 40;
            grossPay = emp.hourly_rate * hoursPerPeriod;
          }
        }

        // Get employee tax settings
        const taxSettings = taxSettingsMap.get(emp.id);
        
        // Calculate pre-tax deductions
        const preTaxDeductions = (deductionsMap.get(emp.id) || [])
          .filter(d => d.deduction_type === 'pre_tax')
          .reduce((sum, d) => {
            if (d.calculation_method === 'percentage') {
              return sum + (grossPay * (d.percentage || 0) / 100);
            } else if (d.calculation_method === 'fixed_amount') {
              return sum + (d.amount || 0);
            }
            return sum;
          }, 0);

        // Taxable income
        const taxableIncome = grossPay - preTaxDeductions;

        // Calculate taxes (simplified - in production, use proper tax tables)
        const federalTax = taxSettings?.federal_exempt ? 0 : taxableIncome * 0.15; // Simplified
        const stateTax = taxSettings?.state_exempt ? 0 : taxableIncome * 0.05; // Simplified
        const socialSecurity = taxSettings?.social_security_exempt ? 0 : 
          Math.min(taxableIncome * ssRate, (ssWageBase / periodsPerYear) * ssRate);
        const medicare = taxSettings?.medicare_exempt ? 0 : taxableIncome * medicareRate;
        const totalTaxes = federalTax + stateTax + socialSecurity + medicare;

        // Calculate post-tax deductions
        const postTaxDeductions = (deductionsMap.get(emp.id) || [])
          .filter(d => d.deduction_type === 'post_tax')
          .reduce((sum, d) => {
            if (d.calculation_method === 'percentage') {
              return sum + (grossPay * (d.percentage || 0) / 100);
            } else if (d.calculation_method === 'fixed_amount') {
              return sum + (d.amount || 0);
            }
            return sum;
          }, 0);

        const totalDeductions = preTaxDeductions + totalTaxes + postTaxDeductions;
        const netPay = grossPay - totalDeductions;

        // Get YTD totals (simplified - in production, calculate from previous payroll entries)
        const { data: previousEntries } = await supabase
          .from('payroll_entries')
          .select('gross_pay, net_pay, total_taxes, total_deductions')
          .eq('employee_id', emp.id)
          .lt('pay_period_end', run.pay_period_start)
          .in('status', ['paid', 'processed']);

        const ytdGross = (previousEntries || []).reduce((sum, e) => sum + (e.gross_pay || 0), 0) + grossPay;
        const ytdNet = (previousEntries || []).reduce((sum, e) => sum + (e.net_pay || 0), 0) + netPay;
        const ytdTaxes = (previousEntries || []).reduce((sum, e) => sum + (e.total_taxes || 0), 0) + totalTaxes;
        const ytdDeductions = (previousEntries || []).reduce((sum, e) => sum + (e.total_deductions || 0), 0) + totalDeductions;

        // Employer taxes
        const employerSS = Math.min(taxableIncome * ssRate, (ssWageBase / periodsPerYear) * ssRate);
        const employerMedicare = taxableIncome * medicareRate;
        const employerUnemployment = Math.min(taxableIncome * 0.006, 7000 * 0.006 / periodsPerYear);

        return {
          payroll_run_id: runId,
          employee_id: emp.id,
          pay_period_start: run.pay_period_start,
          pay_period_end: run.pay_period_end,
          pay_date: run.pay_date,
          base_salary: grossPay,
          gross_pay: grossPay,
          pre_tax_deductions: preTaxDeductions,
          taxable_income: taxableIncome,
          federal_income_tax: federalTax,
          state_income_tax: stateTax,
          social_security_tax: socialSecurity,
          medicare_tax: medicare,
          total_taxes: totalTaxes,
          post_tax_deductions: postTaxDeductions,
          total_deductions: totalDeductions,
          net_pay: netPay,
          ytd_gross_pay: ytdGross,
          ytd_taxes: ytdTaxes,
          ytd_deductions: ytdDeductions,
          ytd_net_pay: ytdNet,
          employer_social_security: employerSS,
          employer_medicare: employerMedicare,
          employer_unemployment: employerUnemployment,
          status: 'calculated',
          payment_status: 'pending',
        };
      }));

      // Upsert payroll entries
      const { error: entriesError } = await supabase
        .from('payroll_entries')
        .upsert(entries, { onConflict: 'payroll_run_id,employee_id' });

      if (entriesError) throw entriesError;

      // Update run status to review (totals will be updated by trigger)
      await supabase
        .from('payroll_runs')
        .update({ status: 'review' })
        .eq('id', runId);

      message.success(`Payroll calculated successfully for ${activeEmployees.length} employees`);
      fetchPayrollRuns();
      fetchPayrollEntries(runId);
    } catch (error: any) {
      console.error('Error calculating payroll:', error);
      message.error(error?.message || 'Failed to calculate payroll');
      // Reset status on error
      await supabase
        .from('payroll_runs')
        .update({ status: 'draft' })
        .eq('id', runId);
    }
  };

  // Approve Payroll Run
  const handleApproveRun = async (runId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        message.error('You must be logged in to approve payroll runs');
        return;
      }

      const { error } = await supabase
        .from('payroll_runs')
        .update({
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', runId);

      if (error) throw error;
      message.success('Payroll run approved');
      fetchPayrollRuns();
    } catch (error: any) {
      message.error(error?.message || 'Failed to approve payroll run');
    }
  };

  // Process Payroll Run
  const handleProcessRun = async (runId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        message.error('You must be logged in to process payroll runs');
        return;
      }

      const { error } = await supabase
        .from('payroll_runs')
        .update({
          status: 'processed',
          processed_by: user.id,
          processed_at: new Date().toISOString(),
        })
        .eq('id', runId);

      if (error) throw error;

      // Update all entries to paid
      await supabase
        .from('payroll_entries')
        .update({ payment_status: 'paid', status: 'paid' })
        .eq('payroll_run_id', runId);

      message.success('Payroll run processed successfully');
      fetchPayrollRuns();
      fetchPayrollEntries(runId);
    } catch (error: any) {
      message.error(error?.message || 'Failed to process payroll run');
    }
  };

  // Calculate metrics
  const totalNetPay = payrollRuns.reduce((sum, run) => sum + (run.total_net_pay || 0), 0);
  const totalGrossPay = payrollRuns.reduce((sum, run) => sum + (run.total_gross_pay || 0), 0);
  const totalTaxes = payrollRuns.reduce((sum, run) => sum + (run.total_taxes || 0), 0);
  const pendingRuns = payrollRuns.filter(r => r.status === 'draft' || r.status === 'review' || r.status === 'calculating').length;
  const approvedRuns = payrollRuns.filter(r => r.status === 'approved').length;
  const processedRuns = payrollRuns.filter(r => r.status === 'processed' || r.status === 'paid').length;

  // Filtered data
  const filteredRuns = payrollRuns.filter(run => {
    if (statusFilter !== 'all' && run.status !== statusFilter) return false;
    if (searchText && !run.run_number.toLowerCase().includes(searchText.toLowerCase()) && 
        !run.description?.toLowerCase().includes(searchText.toLowerCase())) return false;
    if (periodFilter) {
      const [start, end] = periodFilter;
      const runStart = dayjs(run.pay_period_start);
      if (runStart.isBefore(start) || runStart.isAfter(end)) return false;
    }
    return true;
  });

  // Auto-refresh
  useEffect(() => {
    fetchAllData();
    checkAccess();
    const interval = setInterval(() => {
      fetchAllData();
    }, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, [fetchAllData]);

  // Load entries when run is selected
  useEffect(() => {
    if (selectedRun) {
      fetchPayrollEntries(selectedRun.id);
    }
  }, [selectedRun]);

  const runColumns: ColumnsType<PayrollRun> = [
    {
      title: 'Run #',
      dataIndex: 'run_number',
      key: 'run_number',
      width: 140,
      fixed: 'left',
      render: (text: string) => <Text strong style={{ fontFamily: 'monospace' }}>{text}</Text>,
    },
    {
      title: 'Pay Period',
      key: 'period',
      width: 200,
      render: (_: any, record: PayrollRun) => (
        <div>
          <div>{dayjs(record.pay_period_start).format('MM/DD/YYYY')} - {dayjs(record.pay_period_end).format('MM/DD/YYYY')}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Pay Date: {dayjs(record.pay_date).format('MM/DD/YYYY')}
          </Text>
        </div>
      ),
    },
    {
      title: 'Frequency',
      dataIndex: 'pay_frequency',
      key: 'pay_frequency',
      width: 120,
      render: (freq: string) => <Tag color="blue">{freq}</Tag>,
    },
    {
      title: 'Type',
      dataIndex: 'run_type',
      key: 'run_type',
      width: 120,
      render: (type: string) => <Tag>{type}</Tag>,
    },
    {
      title: 'Employees',
      dataIndex: 'total_employees',
      key: 'total_employees',
      width: 100,
      align: 'center',
      render: (count: number) => <Text strong>{count || 0}</Text>,
    },
    {
      title: 'Gross Pay',
      dataIndex: 'total_gross_pay',
      key: 'total_gross_pay',
      width: 130,
      align: 'right',
      render: (amount: number) => (
        <Text strong>
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0)}
        </Text>
      ),
    },
    {
      title: 'Taxes',
      dataIndex: 'total_taxes',
      key: 'total_taxes',
      width: 130,
      align: 'right',
      render: (amount: number) => (
        <Text style={{ color: '#ff4d4f' }}>
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0)}
        </Text>
      ),
    },
    {
      title: 'Net Pay',
      dataIndex: 'total_net_pay',
      key: 'total_net_pay',
      width: 130,
      align: 'right',
      render: (amount: number) => (
        <Text strong style={{ color: '#52c41a', fontSize: 16 }}>
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0)}
        </Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => {
        const statusConfig: Record<string, { color: string; text: string }> = {
          draft: { color: 'default', text: 'Draft' },
          calculating: { color: 'processing', text: 'Calculating' },
          review: { color: 'warning', text: 'Review' },
          approved: { color: 'success', text: 'Approved' },
          processing: { color: 'processing', text: 'Processing' },
          processed: { color: 'success', text: 'Processed' },
          paid: { color: 'success', text: 'Paid' },
          cancelled: { color: 'error', text: 'Cancelled' },
          failed: { color: 'error', text: 'Failed' },
        };
        const config = statusConfig[status] || { color: 'default', text: status };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (_: any, record: PayrollRun) => (
        <Space>
          <Tooltip title="View Details">
            <Button
              type="text"
              icon={<EyeOutlined />}
              size="small"
              onClick={() => {
                setSelectedRun(record);
                setDetailModalVisible(true);
              }}
            />
          </Tooltip>
          {record.status === 'draft' && (
            <Tooltip title={canManage ? "Calculate Payroll" : "Calculate Payroll (Requires Finance Access)"}>
              <Button
                type="text"
                icon={<CalculatorOutlined />}
                size="small"
                disabled={!canManage}
                onClick={() => {
                  if (!canManage) {
                    message.warning('You need Finance Department access to calculate payroll');
                    return;
                  }
                  handleCalculatePayroll(record.id);
                }}
              />
            </Tooltip>
          )}
          {record.status === 'review' && (
            <Popconfirm
              title="Approve Payroll Run"
              description="Are you sure you want to approve this payroll run?"
              onConfirm={() => {
                if (!canManage) {
                  message.warning('You need Finance Department access to approve payroll runs');
                  return;
                }
                handleApproveRun(record.id);
              }}
              okText="Yes"
              cancelText="No"
            >
              <Tooltip title={canManage ? "Approve" : "Approve (Requires Finance Access)"}>
                <Button
                  type="text"
                  icon={<CheckOutlined />}
                  size="small"
                  disabled={!canManage}
                  style={{ color: 'green' }}
                />
              </Tooltip>
            </Popconfirm>
          )}
          {record.status === 'approved' && (
            <Popconfirm
              title="Process Payroll"
              description="Are you sure you want to process this payroll? This will mark all entries as paid."
              onConfirm={() => {
                if (!canManage) {
                  message.warning('You need Finance Department access to process payroll');
                  return;
                }
                handleProcessRun(record.id);
              }}
              okText="Yes"
              cancelText="No"
            >
              <Tooltip title={canManage ? "Process" : "Process (Requires Finance Access)"}>
                <Button
                  type="text"
                  icon={<BankOutlined />}
                  size="small"
                  disabled={!canManage}
                  style={{ color: 'blue' }}
                />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const entryColumns: ColumnsType<PayrollEntry> = [
    {
      title: 'Employee',
      dataIndex: 'employee_name',
      key: 'employee_name',
      width: 200,
      fixed: 'left',
    },
    {
      title: 'Gross Pay',
      dataIndex: 'gross_pay',
      key: 'gross_pay',
      width: 130,
      align: 'right',
      render: (amount: number) => (
        <Text strong>
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0)}
        </Text>
      ),
    },
    {
      title: 'Taxes',
      dataIndex: 'total_taxes',
      key: 'total_taxes',
      width: 130,
      align: 'right',
      render: (amount: number) => (
        <Text style={{ color: '#ff4d4f' }}>
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0)}
        </Text>
      ),
    },
    {
      title: 'Deductions',
      dataIndex: 'total_deductions',
      key: 'total_deductions',
      width: 130,
      align: 'right',
      render: (amount: number) => (
        <Text>
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0)}
        </Text>
      ),
    },
    {
      title: 'Net Pay',
      dataIndex: 'net_pay',
      key: 'net_pay',
      width: 130,
      align: 'right',
      render: (amount: number) => (
        <Text strong style={{ color: '#52c41a', fontSize: 16 }}>
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0)}
        </Text>
      ),
    },
    {
      title: 'YTD Gross',
      dataIndex: 'ytd_gross_pay',
      key: 'ytd_gross_pay',
      width: 130,
      align: 'right',
      render: (amount: number) => (
        <Text type="secondary">
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0)}
        </Text>
      ),
    },
    {
      title: 'YTD Net',
      dataIndex: 'ytd_net_pay',
      key: 'ytd_net_pay',
      width: 130,
      align: 'right',
      render: (amount: number) => (
        <Text type="secondary">
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0)}
        </Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'payment_status',
      key: 'payment_status',
      width: 100,
      render: (status: string) => {
        const statusConfig: Record<string, { color: string; text: string }> = {
          pending: { color: 'warning', text: 'Pending' },
          processing: { color: 'processing', text: 'Processing' },
          paid: { color: 'success', text: 'Paid' },
          failed: { color: 'error', text: 'Failed' },
          cancelled: { color: 'default', text: 'Cancelled' },
        };
        const config = statusConfig[status] || { color: 'default', text: status };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
  ];

  if (loading && payrollRuns.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
      {/* Header Section */}
      <Card
        style={{
          marginBottom: 24,
          background: 'linear-gradient(135deg, #001529 0%, #002140 100%)',
          border: 'none',
          borderRadius: 8,
        }}
        bodyStyle={{ padding: '32px' }}
      >
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2} style={{ color: '#fff', margin: 0, fontWeight: 600 }}>
              <TeamOutlined style={{ marginRight: 12, fontSize: 28 }} />
              Payroll Runs
            </Title>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, display: 'block', marginTop: 8 }}>
              Enterprise-grade payroll processing, tax calculations, and pay stub management
            </Text>
          </Col>
          <Col>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchAllData}
                style={{ background: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }}
              >
                Refresh
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                disabled={!canManage}
                onClick={() => {
                  if (!canManage) {
                    message.warning('You need Finance Department access to create payroll runs');
                    return;
                  }
                  setEditingRun(null);
                  runForm.resetFields();
                  runForm.setFieldsValue({
                    pay_period_start: dayjs().startOf('month'),
                    pay_period_end: dayjs().endOf('month'),
                    pay_date: dayjs().endOf('month').add(3, 'days'),
                    pay_frequency: 'monthly',
                    run_type: 'regular',
                    requires_approval: true,
                  });
                  setRunModalVisible(true);
                }}
                style={{ background: '#52c41a', borderColor: '#52c41a' }}
              >
                New Payroll Run
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Access Notice */}
      {!canManage && (
        <Alert
          message="View-Only Mode"
          description="You are viewing Payroll in read-only mode. To create payroll runs, calculate payroll, or process payments, you need Finance Department access (CFO or Finance Employee with permissions)."
          type="info"
          closable
          style={{ marginBottom: 24 }}
        />
      )}

      {/* KPI Metrics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Net Pay"
              value={totalNetPay}
              prefix={<DollarOutlined />}
              precision={2}
              valueStyle={{ color: '#52c41a', fontSize: 24, fontWeight: 700 }}
              formatter={(value) => `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Gross Pay"
              value={totalGrossPay}
              prefix={<DollarOutlined />}
              precision={2}
              valueStyle={{ color: '#1890ff', fontSize: 24, fontWeight: 700 }}
              formatter={(value) => `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Taxes"
              value={totalTaxes}
              prefix={<DollarOutlined />}
              precision={2}
              valueStyle={{ color: '#ff4d4f', fontSize: 24, fontWeight: 700 }}
              formatter={(value) => `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Pending Runs"
              value={pendingRuns}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14', fontSize: 24, fontWeight: 700 }}
              suffix={`/ ${payrollRuns.length} total`}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters Section */}
      <Card style={{ marginBottom: 24 }} title={<Text strong>Filters & Search</Text>}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="Search by run #, description..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="Status"
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={setStatusFilter}
            >
              <Option value="all">All Statuses</Option>
              <Option value="draft">Draft</Option>
              <Option value="calculating">Calculating</Option>
              <Option value="review">Review</Option>
              <Option value="approved">Approved</Option>
              <Option value="processed">Processed</Option>
              <Option value="paid">Paid</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <RangePicker
              style={{ width: '100%' }}
              value={periodFilter}
              onChange={(dates) => setPeriodFilter(dates as [Dayjs, Dayjs] | null)}
              format="MM/DD/YYYY"
            />
          </Col>
        </Row>
      </Card>

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <Tabs.TabPane tab={<span><FileTextOutlined /> Payroll Runs ({payrollRuns.length})</span>} key="runs">
          <Card
            title={
              <Space>
                <FileTextOutlined />
                <Text strong>Payroll Runs</Text>
                <Badge count={filteredRuns.length} showZero style={{ backgroundColor: '#1890ff' }} />
              </Space>
            }
          >
            <Table
              columns={runColumns}
              dataSource={filteredRuns}
              loading={loading}
              rowKey="id"
              scroll={{ x: 1500 }}
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                showTotal: (total) => `${total} payroll runs`,
              }}
              size="small"
              bordered
            />
          </Card>
        </Tabs.TabPane>

        <Tabs.TabPane 
          tab={<span><UserOutlined /> Payroll Entries ({payrollEntries.length})</span>} 
          key="entries"
        >
          <Card
            title={
              <Space>
                <UserOutlined />
                <Text strong>Payroll Entries</Text>
                {selectedRun && (
                  <Badge count={payrollEntries.length} showZero style={{ backgroundColor: '#1890ff' }} />
                )}
              </Space>
            }
            extra={
              selectedRun ? (
                <Space>
                  <Text type="secondary">Run: {selectedRun.run_number}</Text>
                  <Button onClick={() => setSelectedRun(null)}>Clear Selection</Button>
                </Space>
              ) : (
                <Text type="secondary">Select a payroll run to view entries</Text>
              )
            }
          >
            {selectedRun ? (
              <Table
                columns={entryColumns}
                dataSource={payrollEntries}
                loading={loading}
                rowKey="id"
                scroll={{ x: 1200 }}
                pagination={{
                  pageSize: 50,
                  showSizeChanger: true,
                  showTotal: (total) => `${total} entries`,
                }}
                size="small"
                bordered
              />
            ) : (
              <Alert
                message="No Payroll Run Selected"
                description="Select a payroll run from the 'Payroll Runs' tab to view its entries."
                type="info"
              />
            )}
          </Card>
        </Tabs.TabPane>
      </Tabs>

      {/* Payroll Run Modal */}
      <Modal
        title={editingRun ? 'Edit Payroll Run' : 'Create New Payroll Run'}
        open={runModalVisible}
        onCancel={() => {
          setRunModalVisible(false);
          setEditingRun(null);
          runForm.resetFields();
        }}
        footer={null}
        width={800}
      >
        <Form
          form={runForm}
          layout="vertical"
          onFinish={handleCreateOrUpdateRun}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="pay_period_start"
                label="Pay Period Start"
                rules={[{ required: true, message: 'Please select pay period start date' }]}
              >
                <DatePicker style={{ width: '100%' }} format="MM/DD/YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="pay_period_end"
                label="Pay Period End"
                rules={[{ required: true, message: 'Please select pay period end date' }]}
              >
                <DatePicker style={{ width: '100%' }} format="MM/DD/YYYY" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="pay_date"
                label="Pay Date"
                rules={[{ required: true, message: 'Please select pay date' }]}
              >
                <DatePicker style={{ width: '100%' }} format="MM/DD/YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="pay_frequency"
                label="Pay Frequency"
                rules={[{ required: true, message: 'Please select pay frequency' }]}
              >
                <Select>
                  <Option value="weekly">Weekly</Option>
                  <Option value="biweekly">Biweekly</Option>
                  <Option value="semimonthly">Semi-Monthly</Option>
                  <Option value="monthly">Monthly</Option>
                  <Option value="quarterly">Quarterly</Option>
                  <Option value="annual">Annual</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="run_type"
                label="Run Type"
                rules={[{ required: true, message: 'Please select run type' }]}
              >
                <Select>
                  <Option value="regular">Regular</Option>
                  <Option value="bonus">Bonus</Option>
                  <Option value="commission">Commission</Option>
                  <Option value="adjustment">Adjustment</Option>
                  <Option value="correction">Correction</Option>
                  <Option value="termination">Termination</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="requires_approval"
                label="Requires Approval"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="description"
            label="Description"
          >
            <Input.TextArea rows={3} placeholder="Optional description for this payroll run" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button
                onClick={() => {
                  setRunModalVisible(false);
                  setEditingRun(null);
                  runForm.resetFields();
                }}
              >
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                {editingRun ? 'Update' : 'Create'} Payroll Run
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Payroll Run Detail Modal */}
      <Modal
        title={
          <Space>
            <FileTextOutlined />
            <Text strong>Payroll Run Details</Text>
          </Space>
        }
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setSelectedRun(null);
        }}
        footer={null}
        width={900}
      >
        {selectedRun && (
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="Run Number" span={2}>
              <Text strong style={{ fontFamily: 'monospace' }}>{selectedRun.run_number}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Pay Period">
              {dayjs(selectedRun.pay_period_start).format('MM/DD/YYYY')} - {dayjs(selectedRun.pay_period_end).format('MM/DD/YYYY')}
            </Descriptions.Item>
            <Descriptions.Item label="Pay Date">
              {dayjs(selectedRun.pay_date).format('MM/DD/YYYY')}
            </Descriptions.Item>
            <Descriptions.Item label="Frequency">
              <Tag color="blue">{selectedRun.pay_frequency}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Type">
              <Tag>{selectedRun.run_type}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Status" span={2}>
              <Tag color={
                selectedRun.status === 'paid' || selectedRun.status === 'processed' ? 'success' :
                selectedRun.status === 'approved' ? 'blue' :
                selectedRun.status === 'review' ? 'warning' :
                selectedRun.status === 'draft' ? 'default' : 'error'
              }>
                {selectedRun.status.toUpperCase()}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Total Employees">
              <Text strong>{selectedRun.total_employees || 0}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Total Gross Pay">
              <Text strong style={{ fontSize: 16 }}>
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selectedRun.total_gross_pay || 0)}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Total Taxes">
              <Text strong style={{ color: '#ff4d4f', fontSize: 16 }}>
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selectedRun.total_taxes || 0)}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Total Deductions">
              <Text strong>
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selectedRun.total_deductions || 0)}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Total Net Pay" span={2}>
              <Text strong style={{ color: '#52c41a', fontSize: 20 }}>
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selectedRun.total_net_pay || 0)}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Employer Taxes">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selectedRun.total_employer_taxes || 0)}
            </Descriptions.Item>
            <Descriptions.Item label="Employer Contributions">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selectedRun.total_employer_contributions || 0)}
            </Descriptions.Item>
            {selectedRun.description && (
              <Descriptions.Item label="Description" span={2}>
                {selectedRun.description}
              </Descriptions.Item>
            )}
            {selectedRun.approved_at && (
              <Descriptions.Item label="Approved At">
                {dayjs(selectedRun.approved_at).format('MM/DD/YYYY HH:mm:ss')}
              </Descriptions.Item>
            )}
            {selectedRun.processed_at && (
              <Descriptions.Item label="Processed At">
                {dayjs(selectedRun.processed_at).format('MM/DD/YYYY HH:mm:ss')}
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
        {selectedRun && (
          <div style={{ marginTop: 24 }}>
            <Button
              type="primary"
              icon={<EyeOutlined />}
              onClick={() => {
                setDetailModalVisible(false);
                setActiveTab('entries');
                fetchPayrollEntries(selectedRun.id);
              }}
            >
              View Payroll Entries
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
};
