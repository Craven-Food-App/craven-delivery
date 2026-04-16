// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
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
  Progress,
  Alert,
  Form,
  InputNumber,
  Popconfirm,
  Divider,
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
  WarningOutlined,
  CalendarOutlined,
  PlusOutlined,
  DeleteOutlined,
  CheckOutlined,
  CloseOutlined,
  CreditCardOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { supabase } from '@/integrations/supabase/client';
import dayjs, { Dayjs } from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import { hasFullAccess } from '@/utils/torranceAccess';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

interface Invoice {
  id: string;
  invoice_number: string;
  vendor_name: string;
  vendor_email: string;
  invoice_date: string;
  due_date: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  status: string;
  payment_status: string;
  department: string;
  expense_category: string;
  days_overdue: number;
  payment_terms: string;
  created_at: string;
  notes?: string;
}

interface APMetrics {
  totalOutstanding: number;
  totalOverdue: number;
  invoicesCount: number;
  overdueCount: number;
  avgDaysToPay: number;
  cashFlowImpact: number;
}

interface CorporateAccountsPayableProps {
  onHeaderActionsChange?: (actions: React.ReactNode | null) => void;
}

export const CorporateAccountsPayable: React.FC<CorporateAccountsPayableProps> = ({ onHeaderActionsChange }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<APMetrics>({
    totalOutstanding: 0,
    totalOverdue: 0,
    invoicesCount: 0,
    overdueCount: 0,
    avgDaysToPay: 0,
    cashFlowImpact: 0,
  });
  const [selectedPeriod, setSelectedPeriod] = useState<[Dayjs, Dayjs] | null>(null);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 50, total: 0 });
  
  // Operational modals
  const [invoiceModalVisible, setInvoiceModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [approvalModalVisible, setApprovalModalVisible] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [invoiceForm] = Form.useForm();
  const [paymentForm] = Form.useForm();
  const [approvalForm] = Form.useForm();
  const [departments, setDepartments] = useState<any[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [submittingInvoice, setSubmittingInvoice] = useState(false);
  const [approvingInvoice, setApprovingInvoice] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [emailReceivedCount, setEmailReceivedCount] = useState(0);

  const openCreateInvoiceModal = () => {
    if (!canManage) {
      message.warning('You need Finance Department access to create invoices');
      return;
    }
    setEditingInvoice(null);
    invoiceForm.resetFields();
    invoiceForm.setFieldsValue({
      invoice_date: dayjs(),
      due_date: dayjs().add(30, 'days'),
      payment_terms: 'Net 30',
      amount: 0,
      tax_amount: 0,
    });
    setInvoiceModalVisible(true);
  };

  useEffect(() => {
    fetchInvoices();
    fetchDepartments();
    fetchExpenseCategories();
    fetchVendors();
    checkAccess();
    
    // Check if opened from Purchase Order
    const urlParams = new URLSearchParams(window.location.search);
    const fromPO = urlParams.get('from_po');
    if (fromPO) {
      try {
        const poData = JSON.parse(decodeURIComponent(fromPO));
        handleCreateFromPO(poData);
        // Clean up URL
        window.history.replaceState({}, '', window.location.pathname);
      } catch (error) {
        console.error('Error parsing PO data:', error);
      }
    }
  }, [activeTab]);

  useEffect(() => {
    applyFilters();
  }, [invoices, searchText, statusFilter, selectedPeriod]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          department:departments(name),
          expense_category:expense_categories(name)
        `)
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) {
        // If table doesn't exist, just show empty state
        if (error.code === '42P01') {
          console.warn('Invoices table not found');
          setInvoices([]);
          calculateMetrics([]);
          return;
        }
        throw error;
      }

      const processedInvoices: Invoice[] = (data || []).map((inv: any) => {
        const dueDate = dayjs(inv.due_date || inv.invoice_date);
        const today = dayjs();
        const daysOverdue = dueDate.isBefore(today) ? today.diff(dueDate, 'days') : 0;

        return {
          id: inv.id,
          invoice_number: inv.invoice_number || `INV-${inv.id.substring(0, 8).toUpperCase()}`,
          vendor_name: inv.vendor_name || 'Unknown Vendor',
          vendor_email: inv.vendor_email || '',
          invoice_date: inv.invoice_date,
          due_date: inv.due_date || inv.invoice_date,
          amount: Number(inv.amount || 0),
          tax_amount: Number(inv.tax_amount || 0),
          total_amount: Number(inv.total_amount || inv.amount || 0),
          status: inv.status || 'pending',
          payment_status: inv.payment_status || inv.status || 'unpaid',
          department: inv.department?.name || 'Unassigned',
          expense_category: inv.expense_category?.name || 'Uncategorized',
          days_overdue: daysOverdue,
          payment_terms: (inv.notes?.match(/Payment Terms:\s*(.+)/)?.[1]) || 'Net 30',
          created_at: inv.created_at,
        };
      });

      setInvoices(processedInvoices);
      calculateMetrics(processedInvoices);
      
      // Count invoices received via email (check notes field from raw data)
      const emailReceived = (data || []).filter((inv: any) => {
        const notes = inv.notes || '';
        return notes.includes('Received via email') || 
               notes.includes('invoices@cravenusa.com');
      }).length;
      setEmailReceivedCount(emailReceived);
    } catch (error: any) {
      console.error('Error fetching invoices:', error);
      message.error('Failed to load Accounts Payable data');
    } finally {
      setLoading(false);
    }
  };

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

      // Check if user is CFO or has finance permissions
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

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name')
        .order('name');

      if (error && error.code !== 'PGRST116') throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchExpenseCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('id, name')
        .order('name');

      if (error && error.code !== 'PGRST116') throw error;
      setExpenseCategories(data || []);
    } catch (error) {
      console.error('Error fetching expense categories:', error);
    }
  };

  const fetchVendors = async () => {
    try {
      const { data, error } = await supabase
        .from('partner_vendors')
        .select('id, vendor_name, contact_email, payment_terms')
        .eq('status', 'active')
        .order('vendor_name');

      if (error && error.code !== 'PGRST116') throw error;
      setVendors(data || []);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const calculateMetrics = (data: Invoice[]) => {
    const unpaid = data.filter(inv => inv.payment_status !== 'paid' && inv.status !== 'cancelled');
    const overdue = unpaid.filter(inv => inv.days_overdue > 0);
    
    const totalOutstanding = unpaid.reduce((sum, inv) => sum + inv.total_amount, 0);
    const totalOverdue = overdue.reduce((sum, inv) => sum + inv.total_amount, 0);

    setMetrics({
      totalOutstanding,
      totalOverdue,
      invoicesCount: unpaid.length,
      overdueCount: overdue.length,
      avgDaysToPay: 0, // Would need payment history to calculate
      cashFlowImpact: totalOverdue,
    });
  };

  const applyFilters = () => {
    let filtered = [...invoices];

    // Tab filter
    if (activeTab === 'pending') {
      filtered = filtered.filter(inv => inv.payment_status !== 'paid' && inv.status !== 'cancelled');
    } else if (activeTab === 'overdue') {
      filtered = filtered.filter(inv => inv.days_overdue > 0 && inv.payment_status !== 'paid');
    } else if (activeTab === 'paid') {
      filtered = filtered.filter(inv => inv.payment_status === 'paid');
    }

    // Search filter
    if (searchText) {
      filtered = filtered.filter(
        inv =>
          inv.invoice_number?.toLowerCase().includes(searchText.toLowerCase()) ||
          inv.vendor_name?.toLowerCase().includes(searchText.toLowerCase()) ||
          inv.vendor_email?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(inv => inv.status === statusFilter);
    }

    // Period filter
    if (selectedPeriod) {
      const [start, end] = selectedPeriod;
      filtered = filtered.filter(inv => {
        const date = dayjs(inv.invoice_date);
        return date.isAfter(start.subtract(1, 'day')) && date.isBefore(end.add(1, 'day'));
      });
    }

    setFilteredInvoices(filtered);
    setPagination(prev => ({ ...prev, total: filtered.length }));
  };

  const handleCreateFromPO = async (poData: any) => {
    try {
      // Fetch PO details
      const { data: po, error: poError } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          vendor:partner_vendors(vendor_name, contact_email, payment_terms)
        `)
        .eq('id', poData.po_id)
        .single();

      if (poError || !po) {
        message.error('Purchase order not found');
        return;
      }

      // Pre-fill invoice form
      setEditingInvoice(null);
      invoiceForm.setFieldsValue({
        vendor_id: po.vendor_id,
        vendor_name: po.vendor?.vendor_name || '',
        vendor_email: po.vendor?.contact_email || '',
        amount: po.total_amount,
        tax_amount: 0,
        payment_terms: po.vendor?.payment_terms || 'Net 30',
        notes: `Created from Purchase Order: ${po.po_number}`,
        invoice_date: dayjs(),
        due_date: dayjs().add(30, 'days'),
      });

      // Store PO reference for linking
      (invoiceForm as any)._poId = po.id;
      (invoiceForm as any)._poNumber = po.po_number;

      setInvoiceModalVisible(true);
      message.info(`Pre-filled invoice from PO ${po.po_number}`);
    } catch (error: any) {
      console.error('Error creating invoice from PO:', error);
      message.error('Failed to load purchase order data');
    }
  };

  const handleCreateOrUpdateInvoice = async (values: any) => {
    setSubmittingInvoice(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const error = new Error('You must be logged in to create invoices');
        message.error(error.message);
        throw error;
      }

      const amount = Number(values.amount) || 0;
      const taxAmount = Number(values.tax_amount) || 0;
      const totalAmount = amount + taxAmount;

      const invoiceData: any = {
        vendor_id: values.vendor_id || null,
        vendor_name: values.vendor_name,
        vendor_email: values.vendor_email,
        invoice_date: values.invoice_date.format('YYYY-MM-DD'),
        due_date: values.due_date.format('YYYY-MM-DD'),
        amount: amount,
        tax_amount: taxAmount,
        department_id: values.department_id,
        expense_category_id: values.expense_category_id,
        status: 'pending',
        updated_at: new Date().toISOString(),
      };

      // Store payment_terms in notes if provided
      if (values.payment_terms) {
        invoiceData.notes = `Payment Terms: ${values.payment_terms}`;
      }

      if (editingInvoice) {
        // Update existing invoice
        const { error } = await supabase
          .from('invoices')
          .update(invoiceData)
          .eq('id', editingInvoice.id);

        if (error) {
          console.error('Error updating invoice:', error);
          message.error(error.message || 'Failed to update invoice');
          throw error;
        }
        message.success('Invoice updated successfully');
      } else {
        // Check if this invoice is linked to a PO
        const poId = (invoiceForm as any)._poId;
        if (poId) {
          invoiceData.purchase_order_id = poId;
          const poNumber = (invoiceForm as any)._poNumber || '';
          invoiceData.notes = `${invoiceData.notes || ''}\nLinked to PO: ${poNumber}`.trim();
        }

        // Generate invoice number using timestamp (much faster than counting)
        // Format: INV-YYYY-XXXXXX where XXXXXX is based on timestamp to ensure uniqueness
        const year = new Date().getFullYear();
        const timestamp = Date.now();
        // Use last 6 digits of timestamp (milliseconds ensure uniqueness within the year)
        const sequencePart = timestamp.toString().slice(-6).padStart(6, '0');
        const invoiceNumber = `INV-${year}-${sequencePart}`;

        const { data: newInvoice, error } = await supabase
          .from('invoices')
          .insert({
            ...invoiceData,
            invoice_number: invoiceNumber,
          })
          .select(`
            *,
            department:departments(name),
            expense_category:expense_categories(name)
          `)
          .single();

        if (error) {
          console.error('Error creating invoice:', error);
          message.error(error.message || 'Failed to create invoice');
          throw error;
        }

        // Optimistically add the new invoice to the list instead of refetching all
        if (newInvoice) {
          const dueDate = dayjs(newInvoice.due_date || newInvoice.invoice_date);
          const today = dayjs();
          const daysOverdue = dueDate.isBefore(today) ? today.diff(dueDate, 'days') : 0;

          const processedInvoice: Invoice = {
            id: newInvoice.id,
            invoice_number: newInvoice.invoice_number || `INV-${newInvoice.id.substring(0, 8).toUpperCase()}`,
            vendor_name: newInvoice.vendor_name || 'Unknown Vendor',
            vendor_email: newInvoice.vendor_email || '',
            invoice_date: newInvoice.invoice_date,
            due_date: newInvoice.due_date || newInvoice.invoice_date,
            amount: Number(newInvoice.amount || 0),
            tax_amount: Number(newInvoice.tax_amount || 0),
            total_amount: Number(newInvoice.total_amount || newInvoice.amount || 0),
            status: newInvoice.status || 'pending',
            payment_status: newInvoice.payment_status || newInvoice.status || 'unpaid',
            department: (newInvoice.department as any)?.name || 'Unassigned',
            expense_category: (newInvoice.expense_category as any)?.name || 'Uncategorized',
            days_overdue: daysOverdue,
            payment_terms: (newInvoice.notes?.match(/Payment Terms:\s*(.+)/)?.[1]) || 'Net 30',
            created_at: newInvoice.created_at,
          };

          // Add to the beginning of the list
          setInvoices(prev => [processedInvoice, ...prev]);
          calculateMetrics([processedInvoice, ...invoices]);

          // Link PO to invoice if applicable
          const poId = (invoiceForm as any)._poId;
          if (poId) {
            await supabase
              .from('purchase_orders')
              .update({ invoice_id: newInvoice.id, status: 'received' })
              .eq('id', poId)
              .catch(err => console.error('Error linking PO to invoice:', err));
          }
        }

        message.success('Invoice created successfully');
      }

      setInvoiceModalVisible(false);
      setEditingInvoice(null);
      invoiceForm.resetFields();
      
      // Only refetch if editing (to get updated data), otherwise we already added it optimistically
      if (editingInvoice) {
        fetchInvoices();
      }
    } finally {
      setSubmittingInvoice(false);
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status: 'cancelled' })
        .eq('id', invoiceId);

      if (error) throw error;
      message.success('Invoice cancelled successfully');
      fetchInvoices();
    } catch (error: any) {
      console.error('Error deleting invoice:', error);
      message.error(error?.message || 'Failed to delete invoice');
    }
  };

  const handleProcessPayment = async (values: any) => {
    if (!selectedInvoice) {
      const error = new Error('No invoice selected');
      message.error(error.message);
      throw error;
    }

    setProcessingPayment(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const error = new Error('You must be logged in to process payments');
        message.error(error.message);
        throw error;
      }

      const { error } = await supabase
        .from('invoices')
        .update({
          status: 'paid',
          payment_status: 'paid',
          payment_date: values.payment_date.format('YYYY-MM-DD'),
          payment_method: values.payment_method,
          payment_reference: values.payment_reference,
          paid_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedInvoice.id);

      if (error) {
        console.error('Error processing payment:', error);
        message.error(error.message || 'Failed to process payment');
        throw error;
      }

      // Optimistically update the invoice in the list
      setInvoices(prev => prev.map(inv => 
        inv.id === selectedInvoice.id 
          ? { ...inv, status: 'paid', payment_status: 'paid' }
          : inv
      ));

      message.success('Payment processed successfully');
      setPaymentModalVisible(false);
      paymentForm.resetFields();
      setSelectedInvoice(null);
      
      // Refresh to get updated data
      fetchInvoices();
    } catch (error: any) {
      console.error('Error processing payment:', error);
      message.error(error?.message || 'Failed to process payment');
      throw error; // Re-throw so modal knows it failed
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleApproveInvoice = async (values: any) => {
    if (!selectedInvoice) {
      const error = new Error('No invoice selected');
      message.error(error.message);
      throw error;
    }

    setApprovingInvoice(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const error = new Error('You must be logged in to approve invoices');
        message.error(error.message);
        throw error;
      }

      // Merge notes if both exist
      let notes = '';
      if (values.notes) {
        notes = values.notes;
      } else if (selectedInvoice.notes) {
        notes = selectedInvoice.notes;
      }

      const { error } = await supabase
        .from('invoices')
        .update({
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          notes: notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedInvoice.id);

      if (error) {
        console.error('Error approving invoice:', error);
        message.error(error.message || 'Failed to approve invoice');
        throw error;
      }

      // Optimistically update the invoice in the list
      setInvoices(prev => prev.map(inv => 
        inv.id === selectedInvoice.id 
          ? { ...inv, status: 'approved' }
          : inv
      ));

      message.success('Invoice approved successfully');
      setApprovalModalVisible(false);
      approvalForm.resetFields();
      setSelectedInvoice(null);
      
      // Refresh to get updated data
      fetchInvoices();
    } catch (error: any) {
      console.error('Error approving invoice:', error);
      message.error(error?.message || 'Failed to approve invoice');
      throw error; // Re-throw so modal knows it failed
    } finally {
      setApprovingInvoice(false);
    }
  };

  const handleExport = () => {
    const csv = [
      ['Invoice #', 'Vendor', 'Date', 'Due Date', 'Amount', 'Tax', 'Total', 'Status', 'Days Overdue', 'Department'].join(','),
      ...filteredInvoices.map(inv =>
        [
          inv.invoice_number,
          `"${inv.vendor_name}"`,
          inv.invoice_date,
          inv.due_date,
          inv.amount,
          inv.tax_amount,
          inv.total_amount,
          inv.status,
          inv.days_overdue,
          inv.department,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `accounts-payable-${dayjs().format('YYYY-MM-DD')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    message.success('Accounts Payable data exported successfully');
  };

  useEffect(() => {
    if (!onHeaderActionsChange) return;
    onHeaderActionsChange(
      <Space>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={openCreateInvoiceModal}
          style={{ background: '#52c41a', borderColor: '#52c41a' }}
          disabled={!canManage}
        >
          New Invoice
        </Button>
        <Button
          icon={<ReloadOutlined />}
          onClick={fetchInvoices}
        >
          Refresh
        </Button>
        <Button
          type="primary"
          icon={<ExportOutlined />}
          onClick={handleExport}
          style={{ background: '#1890ff', borderColor: '#1890ff' }}
        >
          Export CSV
        </Button>
      </Space>
    );
    return () => onHeaderActionsChange(null);
  }, [onHeaderActionsChange, canManage, filteredInvoices.length]);

  const columns: ColumnsType<Invoice> = [
    {
      title: 'Invoice #',
      dataIndex: 'invoice_number',
      key: 'invoice_number',
      width: 140,
      fixed: 'left',
      render: (text: string) => <Text strong style={{ fontFamily: 'monospace' }}>{text}</Text>,
    },
    {
      title: 'Vendor',
      dataIndex: 'vendor_name',
      key: 'vendor_name',
      width: 200,
      ellipsis: true,
      render: (text: string, record: Invoice) => (
        <Space>
          <Text>{text}</Text>
          {record.notes?.includes('Received via email') && (
            <Tooltip title="Received via email from invoices@cravenusa.com">
              <Tag color="blue" icon={<UploadOutlined />} style={{ margin: 0 }}>
                Email
              </Tag>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'Invoice Date',
      dataIndex: 'invoice_date',
      key: 'invoice_date',
      width: 120,
      sorter: (a, b) => dayjs(a.invoice_date).unix() - dayjs(b.invoice_date).unix(),
      render: (date: string) => dayjs(date).format('MM/DD/YYYY'),
    },
    {
      title: 'Due Date',
      dataIndex: 'due_date',
      key: 'due_date',
      width: 120,
      sorter: (a, b) => dayjs(a.due_date).unix() - dayjs(b.due_date).unix(),
      render: (date: string, record: Invoice) => {
        const isOverdue = record.days_overdue > 0;
        return (
          <Text style={{ color: isOverdue ? '#ff4d4f' : '#595959' }}>
            {dayjs(date).format('MM/DD/YYYY')}
          </Text>
        );
      },
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      align: 'right',
      sorter: (a, b) => a.amount - b.amount,
      render: (amount: number) => (
        <Text strong>
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)}
        </Text>
      ),
    },
    {
      title: 'Tax',
      dataIndex: 'tax_amount',
      key: 'tax_amount',
      width: 100,
      align: 'right',
      render: (tax: number) =>
        tax > 0 ? (
          <Text type="secondary">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(tax)}
          </Text>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: 'Total',
      dataIndex: 'total_amount',
      key: 'total_amount',
      width: 130,
      align: 'right',
      sorter: (a, b) => a.total_amount - b.total_amount,
      render: (total: number) => (
        <Text strong style={{ fontSize: 15, color: '#1890ff' }}>
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(total)}
        </Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'payment_status',
      key: 'payment_status',
      width: 120,
      filters: [
        { text: 'Unpaid', value: 'unpaid' },
        { text: 'Partial', value: 'partial' },
        { text: 'Paid', value: 'paid' },
      ],
      onFilter: (value, record) => record.payment_status === value,
      render: (status: string, record: Invoice) => {
        if (status === 'paid') {
          return <Tag color="success" icon={<CheckCircleOutlined />}>Paid</Tag>;
        } else if (record.days_overdue > 0) {
          return <Tag color="error" icon={<ExclamationCircleOutlined />}>Overdue</Tag>;
        } else {
          return <Tag color="warning" icon={<ClockCircleOutlined />}>Pending</Tag>;
        }
      },
    },
    {
      title: 'Days Overdue',
      dataIndex: 'days_overdue',
      key: 'days_overdue',
      width: 120,
      sorter: (a, b) => a.days_overdue - b.days_overdue,
      render: (days: number) => {
        if (days <= 0) return <Text type="secondary">—</Text>;
        return (
          <Text strong style={{ color: '#ff4d4f' }}>
            {days} {days === 1 ? 'day' : 'days'}
          </Text>
        );
      },
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
      width: 150,
      ellipsis: true,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      fixed: 'right',
      render: (_: any, record: Invoice) => (
        <Space>
          <Tooltip title="View Details">
            <Button
              type="text"
              icon={<EyeOutlined />}
              size="small"
              onClick={() => {
                setSelectedInvoice(record);
                setDetailModalVisible(true);
              }}
            />
          </Tooltip>
          {record.status !== 'paid' && record.status !== 'cancelled' && (
            <>
              <Tooltip title={canManage ? "Edit Invoice" : "Edit Invoice (Requires Finance Access)"}>
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  size="small"
                  disabled={!canManage}
                  onClick={() => {
                    if (!canManage) {
                      message.warning('You need Finance Department access to edit invoices');
                      return;
                    }
                    setEditingInvoice(record);
                    invoiceForm.setFieldsValue({
                      vendor_id: record.vendor_id || undefined,
                      vendor_name: record.vendor_name,
                      vendor_email: record.vendor_email,
                      invoice_date: dayjs(record.invoice_date),
                      due_date: dayjs(record.due_date),
                      amount: record.amount,
                      tax_amount: record.tax_amount,
                      payment_terms: (record.payment_terms || 'Net 30'),
                    });
                    setInvoiceModalVisible(true);
                  }}
                />
              </Tooltip>
              {record.status === 'approved' && (
                <Tooltip title={canManage ? "Process Payment" : "Process Payment (Requires Finance Access)"}>
                  <Button
                    type="text"
                    icon={<CreditCardOutlined />}
                    size="small"
                    disabled={!canManage}
                    onClick={() => {
                      if (!canManage) {
                        message.warning('You need Finance Department access to process payments');
                        return;
                      }
                      setSelectedInvoice(record);
                      paymentForm.setFieldsValue({
                        amount: record.total_amount,
                        payment_date: dayjs(),
                      });
                      setPaymentModalVisible(true);
                    }}
                  />
                </Tooltip>
              )}
              {record.status === 'pending' && (
                <Tooltip title={canManage ? "Approve Invoice" : "Approve Invoice (Requires Finance Access)"}>
                  <Button
                    type="text"
                    icon={<CheckOutlined />}
                    size="small"
                    disabled={!canManage}
                    onClick={() => {
                      if (!canManage) {
                        message.warning('You need Finance Department access to approve invoices');
                        return;
                      }
                      setSelectedInvoice(record);
                      setApprovalModalVisible(true);
                    }}
                  />
                </Tooltip>
              )}
            </>
          )}
          {record.status !== 'paid' && (
            <Popconfirm
              title="Delete Invoice"
              description="Are you sure you want to delete this invoice?"
              onConfirm={() => {
                if (!canManage) {
                  message.warning('You need Finance Department access to delete invoices');
                  return;
                }
                handleDeleteInvoice(record.id);
              }}
              okText="Yes"
              cancelText="No"
            >
              <Tooltip title={canManage ? "Delete Invoice" : "Delete Invoice (Requires Finance Access)"}>
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  size="small"
                  disabled={!canManage}
                />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '12px', background: '#f5f5f5', minHeight: '100vh' }}>
      {/* Access Notice */}
      {!canManage && (
        <Alert
          message="View-Only Mode"
          description="You are viewing Accounts Payable in read-only mode. To create invoices, process payments, or edit records, you need Finance Department access (CFO or Finance Employee with permissions)."
          type="info"
          closable
          style={{ marginBottom: 12 }}
        />
      )}

      {/* Email Received Alert */}
      {emailReceivedCount > 0 && (
        <Alert
          message={`${emailReceivedCount} New Invoice${emailReceivedCount > 1 ? 's' : ''} Received via Email`}
          description={`${emailReceivedCount} invoice${emailReceivedCount > 1 ? 's have' : ' has'} been automatically added from invoices@cravenusa.com. Please review and approve.`}
          type="info"
          icon={<FileTextOutlined />}
          showIcon
          closable
          style={{ marginBottom: 12 }}
          action={
            <Button size="small" type="primary" onClick={() => {
              setSearchText('Received via email');
              setActiveTab('pending');
            }}>
              View Email Invoices
            </Button>
          }
        />
      )}

      {/* Critical Alerts */}
      {metrics.overdueCount > 0 && (
        <Alert
          message={`${metrics.overdueCount} Overdue Invoice${metrics.overdueCount > 1 ? 's' : ''}`}
          description={`Total overdue amount: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(metrics.totalOverdue)}. Immediate attention required.`}
          type="error"
          icon={<WarningOutlined />}
          showIcon
          closable
          style={{ marginBottom: 12 }}
          action={
            <Button size="small" danger onClick={() => setActiveTab('overdue')}>
              View Overdue
            </Button>
          }
        />
      )}

      {/* KPI Metrics */}
      <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Outstanding"
              value={metrics.totalOutstanding}
              precision={2}
              valueStyle={{ color: '#1890ff', fontSize: 24, fontWeight: 700 }}
              formatter={(value) => `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Overdue Amount"
              value={metrics.totalOverdue}
              precision={2}
              valueStyle={{ color: '#ff4d4f', fontSize: 24, fontWeight: 700 }}
              formatter={(value) => `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Pending Invoices"
              value={metrics.invoicesCount}
              valueStyle={{ color: '#722ed1', fontSize: 24, fontWeight: 700 }}
              suffix={metrics.overdueCount > 0 ? `${metrics.overdueCount} overdue` : 'overdue'}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Cash Flow Impact"
              value={metrics.cashFlowImpact}
              precision={2}
              valueStyle={{ color: '#fa541c', fontSize: 24, fontWeight: 700 }}
              formatter={(value) => `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters Section */}
      <Card style={{ marginBottom: 12 }} title={<Text strong>Filters & Search</Text>}>
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="Search by invoice #, vendor name..."
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
              <Option value="pending">Pending</Option>
              <Option value="approved">Approved</Option>
              <Option value="paid">Paid</Option>
              <Option value="cancelled">Cancelled</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <RangePicker
              style={{ width: '100%' }}
              value={selectedPeriod}
              onChange={(dates) => setSelectedPeriod(dates as [Dayjs, Dayjs] | null)}
              format="MM/DD/YYYY"
            />
          </Col>
        </Row>
      </Card>

      {/* Invoices Table */}
      <Card
        title={
          <Tabs 
            activeKey={activeTab} 
            onChange={setActiveTab}
            items={[
              {
                key: 'pending',
                label: (
                  <span>
                    Pending <Badge count={invoices.filter(inv => inv.payment_status !== 'paid' && inv.status !== 'cancelled').length} />
                  </span>
                ),
              },
              {
                key: 'overdue',
                label: (
                  <span>
                    Overdue <Badge count={invoices.filter(inv => inv.days_overdue > 0 && inv.payment_status !== 'paid').length} style={{ backgroundColor: '#ff4d4f' }} />
                  </span>
                ),
              },
              {
                key: 'paid',
                label: (
                  <span>
                    Paid <Badge count={invoices.filter(inv => inv.payment_status === 'paid').length} style={{ backgroundColor: '#52c41a' }} />
                  </span>
                ),
              },
            ]}
          />
        }
        extra={
          <Text type="secondary" style={{ fontSize: 12 }}>
            Last updated: {dayjs().format('MM/DD/YYYY HH:mm:ss')}
          </Text>
        }
      >
        <Table
          columns={columns}
          dataSource={filteredInvoices}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1500 }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} invoices`,
            pageSizeOptions: ['25', '50', '100', '200'],
            onChange: (page, pageSize) => setPagination({ current: page, pageSize, total: pagination.total }),
          }}
          size="small"
          bordered
          rowClassName={(record) => {
            if (record.days_overdue > 0) return 'overdue-row';
            if (record.payment_status === 'paid') return 'paid-row';
            return '';
          }}
        />
      </Card>

      {/* Invoice Detail Modal - Fortune 500 Format */}
      <Modal
        title=""
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setSelectedInvoice(null);
        }}
        footer={null}
        width="90%"
        styles={{
          body: { padding: 0 },
          content: { maxHeight: '90vh' },
        }}
      >
        {selectedInvoice && (
          <div style={{ 
            fontFamily: 'Georgia, "Times New Roman", serif',
            padding: '60px 80px',
            background: '#ffffff',
            color: '#1a1a1a',
            lineHeight: 1.6,
          }}>
            {/* Header */}
            <div style={{ 
              borderBottom: '3px solid #1a1a1a',
              paddingBottom: '20px',
              marginBottom: '40px',
            }}>
              <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <Text style={{ fontSize: '32px', fontWeight: 700, letterSpacing: '2px', marginBottom: '10px', display: 'block' }}>
                  CRAVE'N, INC.
                </Text>
                <Text style={{ fontSize: '18px', color: '#666', letterSpacing: '1px', display: 'block' }}>
                  ACCOUNTS PAYABLE INVOICE REPORT
                </Text>
              </div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                fontSize: '12px',
                color: '#666',
                marginTop: '20px',
              }}>
                <div>
                  <Text strong>Invoice Date:</Text>{' '}
                  {dayjs(selectedInvoice.invoice_date).format('MMMM D, YYYY')}
                </div>
                <div>
                  <Text strong>Generated:</Text>{' '}
                  {dayjs().format('MMMM D, YYYY [at] h:mm A')}
                </div>
                <div>
                  <Text strong>Status:</Text>{' '}
                  <Tag color={
                    selectedInvoice.payment_status === 'paid' ? 'green' :
                    selectedInvoice.days_overdue > 0 ? 'red' :
                    selectedInvoice.status === 'approved' ? 'blue' : 'yellow'
                  }>
                    {selectedInvoice.payment_status === 'paid' ? 'PAID' :
                     selectedInvoice.days_overdue > 0 ? 'OVERDUE' :
                     selectedInvoice.status === 'approved' ? 'APPROVED' : 'PENDING'}
                  </Tag>
                </div>
              </div>
            </div>

            {/* Executive Summary */}
            <div style={{ marginBottom: '50px' }}>
              <Title level={2} style={{ 
                fontSize: '24px',
                fontWeight: 700,
                marginBottom: '20px',
                borderBottom: '2px solid #e0e0e0',
                paddingBottom: '10px',
              }}>
                INVOICE SUMMARY
              </Title>
              <div style={{ 
                background: '#f8f9fa',
                padding: '25px',
                borderRadius: '4px',
                marginBottom: '20px',
              }}>
                <Text style={{ fontSize: '14px', lineHeight: 1.8 }}>
                  This invoice report provides a comprehensive analysis of vendor invoice{' '}
                  <Text strong style={{ fontFamily: 'monospace' }}>
                    {selectedInvoice.invoice_number}
                  </Text> from vendor{' '}
                  <Text strong>{selectedInvoice.vendor_name}</Text>. 
                  The invoice total of{' '}
                  <Text strong style={{ color: '#1890ff' }}>
                    ${selectedInvoice.total_amount.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Text> is{' '}
                  {selectedInvoice.payment_status === 'paid' ? (
                    <Text strong style={{ color: '#52c41a' }}>paid</Text>
                  ) : selectedInvoice.days_overdue > 0 ? (
                    <Text strong style={{ color: '#ff4d4f' }}>
                      {selectedInvoice.days_overdue} days overdue
                    </Text>
                  ) : (
                    <Text strong style={{ color: '#faad14' }}>pending payment</Text>
                  )}. 
                  {selectedInvoice.days_overdue > 0 && (
                    <> This invoice requires immediate attention to maintain vendor relationships and avoid late fees.</>
                  )}
                </Text>
              </div>
            </div>

            {/* Invoice Details Table */}
            <div style={{ marginBottom: '50px' }}>
              <Title level={2} style={{ 
                fontSize: '24px',
                fontWeight: 700,
                marginBottom: '20px',
                borderBottom: '2px solid #e0e0e0',
                paddingBottom: '10px',
              }}>
                INVOICE DETAILS
              </Title>
              <Table
                bordered
                pagination={false}
                style={{
                  fontSize: '14px',
                }}
                dataSource={[
                  {
                    key: '1',
                    field: 'Invoice Number',
                    value: selectedInvoice.invoice_number,
                    style: { fontFamily: 'monospace', fontWeight: 700, fontSize: '16px' },
                  },
                  {
                    key: '2',
                    field: 'Vendor Name',
                    value: selectedInvoice.vendor_name,
                    style: { fontWeight: 600 },
                  },
                  {
                    key: '3',
                    field: 'Vendor Email',
                    value: selectedInvoice.vendor_email || 'N/A',
                  },
                  {
                    key: '4',
                    field: 'Invoice Date',
                    value: dayjs(selectedInvoice.invoice_date).format('MMMM D, YYYY'),
                  },
                  {
                    key: '5',
                    field: 'Due Date',
                    value: dayjs(selectedInvoice.due_date).format('MMMM D, YYYY'),
                    style: { 
                      color: selectedInvoice.days_overdue > 0 ? '#ff4d4f' : '#595959',
                      fontWeight: selectedInvoice.days_overdue > 0 ? 700 : 400,
                    },
                  },
                  {
                    key: '6',
                    field: 'Days Overdue',
                    value: selectedInvoice.days_overdue > 0 
                      ? `${selectedInvoice.days_overdue} ${selectedInvoice.days_overdue === 1 ? 'day' : 'days'}`
                      : 'Not overdue',
                    style: { 
                      color: selectedInvoice.days_overdue > 0 ? '#ff4d4f' : '#52c41a',
                      fontWeight: 600,
                    },
                  },
                  {
                    key: '7',
                    field: 'Subtotal Amount',
                    value: `$${selectedInvoice.amount.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`,
                    style: { fontFamily: 'monospace', fontWeight: 600 },
                  },
                  {
                    key: '8',
                    field: 'Tax Amount',
                    value: selectedInvoice.tax_amount > 0
                      ? `$${selectedInvoice.tax_amount.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`
                      : 'No tax',
                    style: { fontFamily: 'monospace' },
                  },
                  {
                    key: '9',
                    field: 'Total Amount',
                    value: `$${selectedInvoice.total_amount.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`,
                    style: { 
                      fontWeight: 700,
                      fontSize: '18px',
                      fontFamily: 'monospace',
                      color: '#1890ff',
                    },
                  },
                  {
                    key: '10',
                    field: 'Payment Status',
                    value: selectedInvoice.payment_status.toUpperCase(),
                  },
                  {
                    key: '11',
                    field: 'Invoice Status',
                    value: selectedInvoice.status.toUpperCase(),
                  },
                  {
                    key: '12',
                    field: 'Department',
                    value: selectedInvoice.department,
                  },
                  {
                    key: '13',
                    field: 'Expense Category',
                    value: selectedInvoice.expense_category,
                  },
                  {
                    key: '14',
                    field: 'Payment Terms',
                    value: selectedInvoice.payment_terms,
                  },
                ]}
                columns={[
                  {
                    title: 'Field',
                    dataIndex: 'field',
                    key: 'field',
                    width: '30%',
                    render: (text: string) => (
                      <Text strong style={{ fontSize: '14px' }}>{text}</Text>
                    ),
                  },
                  {
                    title: 'Value',
                    dataIndex: 'value',
                    key: 'value',
                    render: (value: string, record: any) => (
                      <Text style={record.style || {}}>{value}</Text>
                    ),
                  },
                ]}
              />
            </div>

            {/* Financial Impact */}
            <div style={{ marginBottom: '50px' }}>
              <Title level={2} style={{ 
                fontSize: '24px',
                fontWeight: 700,
                marginBottom: '20px',
                borderBottom: '2px solid #e0e0e0',
                paddingBottom: '10px',
              }}>
                FINANCIAL IMPACT
              </Title>
              <Row gutter={[16, 16]}>
                <Col span={8}>
                  <Card style={{ 
                    background: '#e6f7ff',
                    border: '2px solid #1890ff',
                  }}>
                    <Statistic
                      title="Subtotal"
                      value={selectedInvoice.amount}
                      prefix={<DollarOutlined />}
                      precision={2}
                      valueStyle={{ 
                        color: '#1890ff',
                        fontSize: 24,
                        fontWeight: 700,
                      }}
                      formatter={(value) => 
                        `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      }
                    />
                  </Card>
                </Col>
                <Col span={8}>
                  <Card style={{ 
                    background: selectedInvoice.tax_amount > 0 ? '#fff7e6' : '#f0f0f0',
                    border: `2px solid ${selectedInvoice.tax_amount > 0 ? '#faad14' : '#d9d9d9'}`,
                  }}>
                    <Statistic
                      title="Tax Amount"
                      value={selectedInvoice.tax_amount}
                      prefix={<DollarOutlined />}
                      precision={2}
                      valueStyle={{ 
                        color: selectedInvoice.tax_amount > 0 ? '#faad14' : '#999',
                        fontSize: 24,
                        fontWeight: 700,
                      }}
                      formatter={(value) => 
                        selectedInvoice.tax_amount > 0
                          ? `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : 'No Tax'
                      }
                    />
                  </Card>
                </Col>
                <Col span={8}>
                  <Card style={{ 
                    background: selectedInvoice.payment_status === 'paid' ? '#f6ffed' : 
                               selectedInvoice.days_overdue > 0 ? '#fff1f0' : '#fffbe6',
                    border: `2px solid ${
                      selectedInvoice.payment_status === 'paid' ? '#52c41a' : 
                      selectedInvoice.days_overdue > 0 ? '#ff4d4f' : '#faad14'
                    }`,
                  }}>
                    <Statistic
                      title="Total Amount"
                      value={selectedInvoice.total_amount}
                      prefix={<DollarOutlined />}
                      precision={2}
                      valueStyle={{ 
                        color: selectedInvoice.payment_status === 'paid' ? '#52c41a' : 
                               selectedInvoice.days_overdue > 0 ? '#ff4d4f' : '#faad14',
                        fontSize: 28,
                        fontWeight: 700,
                      }}
                      formatter={(value) => 
                        `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      }
                    />
                  </Card>
                </Col>
              </Row>
            </div>

            {/* Payment Timeline */}
            {selectedInvoice.days_overdue > 0 && (
              <div style={{ marginBottom: '50px' }}>
                <Title level={2} style={{ 
                  fontSize: '24px',
                  fontWeight: 700,
                  marginBottom: '20px',
                  borderBottom: '2px solid #e0e0e0',
                  paddingBottom: '10px',
                }}>
                  PAYMENT TIMELINE
                </Title>
                <Alert
                  message="Overdue Invoice"
                  description={
                    <div>
                      <Text strong>This invoice is {selectedInvoice.days_overdue} {selectedInvoice.days_overdue === 1 ? 'day' : 'days'} overdue.</Text>
                      <br />
                      <Text>Due date: {dayjs(selectedInvoice.due_date).format('MMMM D, YYYY')}</Text>
                      <br />
                      <Text>Immediate payment processing is recommended to maintain vendor relationships and avoid late fees.</Text>
                    </div>
                  }
                  type="error"
                  icon={<ExclamationCircleOutlined />}
                  showIcon
                  style={{ fontSize: '14px' }}
                />
              </div>
            )}

            {/* Footer */}
            <div style={{ 
              marginTop: '60px',
              paddingTop: '30px',
              borderTop: '2px solid #e0e0e0',
              fontSize: '11px',
              color: '#666',
              textAlign: 'center',
            }}>
              <Text style={{ marginBottom: '10px', display: 'block' }}>
                <Text strong>CRAVE'N, INC.</Text> | Accounts Payable Invoice Report | 
                Generated {dayjs().format('MMMM D, YYYY [at] h:mm A')}
              </Text>
              <Text style={{ fontStyle: 'italic', lineHeight: 1.6, display: 'block' }}>
                This report is prepared for internal use and accounts payable management purposes. 
                All invoice data is based on vendor submissions and reflects actual accounts payable obligations. 
                This report supports payment processing, vendor relationship management, and financial planning activities.
              </Text>
              <Text style={{ marginTop: '15px', fontSize: '10px', display: 'block' }}>
                Invoice ID: {selectedInvoice.id} | Status: {selectedInvoice.payment_status.toUpperCase()} | 
                Invoice Number: {selectedInvoice.invoice_number}
              </Text>
            </div>

            {/* Action Buttons */}
            <div style={{ 
              paddingTop: '30px',
              borderTop: '1px solid #e0e0e0',
              background: '#f8f9fa',
              margin: '40px -80px -60px -80px',
              padding: '20px 80px',
              textAlign: 'right',
            }}>
              <Space>
                <Button onClick={() => {
                  setDetailModalVisible(false);
                  setSelectedInvoice(null);
                }}>
                  Close
                </Button>
                <Button
                  type="primary"
                  icon={<ExportOutlined />}
                  onClick={() => {
                    message.info('PDF export functionality coming soon');
                  }}
                >
                  Download PDF
                </Button>
              </Space>
            </div>
          </div>
        )}
      </Modal>

      {/* Create/Edit Invoice Modal */}
      <Modal
        title={editingInvoice ? 'Edit Invoice' : 'Create New Invoice'}
        open={invoiceModalVisible}
        onCancel={() => {
          setInvoiceModalVisible(false);
          setEditingInvoice(null);
          invoiceForm.resetFields();
        }}
        onOk={async () => {
          try {
            const values = await invoiceForm.validateFields();
            await handleCreateOrUpdateInvoice(values);
            // If successful, the function will close the modal and reset the form
          } catch (error: any) {
            // If it's a validation error (errorFields), Ant Design shows it automatically
            // and we don't need to do anything - just prevent modal from closing
            if (error?.errorFields) {
              // Validation errors are shown by Ant Design, just prevent modal close
              return Promise.reject(error);
            }
            // For other errors, they're already shown by handleCreateOrUpdateInvoice
            // Re-throw to prevent modal from closing
            return Promise.reject(error);
          }
        }}
        width={800}
        okButtonProps={{ 
          htmlType: 'button',
          loading: submittingInvoice,
          disabled: submittingInvoice
        }}
        okText={submittingInvoice ? 'Processing...' : 'OK'}
      >
        <Form
          form={invoiceForm}
          layout="vertical"
          onFinish={handleCreateOrUpdateInvoice}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="vendor_id"
                label="Vendor"
                rules={[{ required: true, message: 'Please select vendor' }]}
              >
                <Select
                  placeholder="Select vendor"
                  showSearch
                  optionFilterProp="children"
                  allowClear
                  onChange={(value) => {
                    if (value) {
                      const vendor = vendors.find(v => v.id === value);
                      if (vendor) {
                        invoiceForm.setFieldsValue({
                          vendor_name: vendor.vendor_name,
                          vendor_email: vendor.contact_email || '',
                          payment_terms: vendor.payment_terms || 'Net 30',
                        });
                      }
                    } else {
                      invoiceForm.setFieldsValue({
                        vendor_name: '',
                        vendor_email: '',
                      });
                    }
                  }}
                >
                  {vendors.map(vendor => (
                    <Option key={vendor.id} value={vendor.id}>
                      {vendor.vendor_name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="vendor_name"
                label="Vendor Name (Auto-filled)"
              >
                <Input placeholder="Auto-filled from vendor selection" disabled />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="vendor_email"
                label="Vendor Email (Auto-filled)"
              >
                <Input placeholder="Auto-filled from vendor selection" disabled />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="payment_terms"
                label="Payment Terms (Auto-filled)"
              >
                <Input placeholder="Auto-filled from vendor selection" disabled />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="invoice_date"
                label="Invoice Date"
                rules={[{ required: true, message: 'Please select invoice date' }]}
              >
                <DatePicker style={{ width: '100%' }} format="MM/DD/YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="due_date"
                label="Due Date"
                rules={[{ required: true, message: 'Please select due date' }]}
              >
                <DatePicker style={{ width: '100%' }} format="MM/DD/YYYY" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="amount"
                label="Amount"
                rules={[{ required: true, message: 'Please enter amount' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  precision={2}
                  formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={value => value!.replace(/\$\s?|(,*)/g, '') as unknown as 0}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="tax_amount"
                label="Tax Amount"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  precision={2}
                  formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={value => value!.replace(/\$\s?|(,*)/g, '') as unknown as 0}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="department_id"
                label="Department"
              >
                <Select placeholder="Select department" allowClear>
                  {departments.map(dept => (
                    <Option key={dept.id} value={dept.id}>{dept.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="expense_category_id"
                label="Expense Category"
              >
                <Select placeholder="Select category" allowClear>
                  {expenseCategories.map(cat => (
                    <Option key={cat.id} value={cat.id}>{cat.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="payment_terms"
            label="Payment Terms"
          >
            <Select placeholder="Select payment terms">
              <Option value="Net 15">Net 15</Option>
              <Option value="Net 30">Net 30</Option>
              <Option value="Net 45">Net 45</Option>
              <Option value="Net 60">Net 60</Option>
              <Option value="Due on Receipt">Due on Receipt</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Payment Processing Modal */}
      <Modal
        title="Process Payment"
        open={paymentModalVisible}
        onCancel={() => {
          setPaymentModalVisible(false);
          paymentForm.resetFields();
          setSelectedInvoice(null);
        }}
        onOk={async () => {
          try {
            const values = await paymentForm.validateFields();
            await handleProcessPayment(values);
            // If successful, the function will close the modal and reset the form
          } catch (error: any) {
            // If it's a validation error (errorFields), Ant Design shows it automatically
            if (error?.errorFields) {
              return Promise.reject(error);
            }
            // For other errors, they're already shown by handleProcessPayment
            return Promise.reject(error);
          }
        }}
        width={600}
        okButtonProps={{ 
          htmlType: 'button',
          loading: processingPayment,
          disabled: processingPayment
        }}
        okText={processingPayment ? 'Processing...' : 'OK'}
      >
        {selectedInvoice && (
          <Form
            form={paymentForm}
            layout="vertical"
            onFinish={handleProcessPayment}
          >
            <Alert
              message={`Processing payment for ${selectedInvoice.invoice_number}`}
              description={`Total amount: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selectedInvoice.total_amount)}`}
              type="info"
              style={{ marginBottom: 16 }}
            />
            <Form.Item
              name="amount"
              label="Payment Amount"
              rules={[{ required: true, message: 'Please enter payment amount' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                precision={2}
                formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value!.replace(/\$\s?|(,*)/g, '') as unknown as 0}
              />
            </Form.Item>
            <Form.Item
              name="payment_date"
              label="Payment Date"
              rules={[{ required: true, message: 'Please select payment date' }]}
            >
              <DatePicker style={{ width: '100%' }} format="MM/DD/YYYY" />
            </Form.Item>
            <Form.Item
              name="payment_method"
              label="Payment Method"
              rules={[{ required: true, message: 'Please select payment method' }]}
            >
              <Select placeholder="Select payment method">
                <Option value="ACH">ACH Transfer</Option>
                <Option value="Wire">Wire Transfer</Option>
                <Option value="Check">Check</Option>
                <Option value="Credit Card">Credit Card</Option>
                <Option value="Other">Other</Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="payment_reference"
              label="Payment Reference"
            >
              <Input placeholder="Check number, transaction ID, etc." />
            </Form.Item>
          </Form>
        )}
      </Modal>

      {/* Approval Modal */}
      <Modal
        title="Approve Invoice"
        open={approvalModalVisible}
        onCancel={() => {
          setApprovalModalVisible(false);
          approvalForm.resetFields();
          setSelectedInvoice(null);
        }}
        onOk={async () => {
          try {
            // Notes field is optional, so we can submit without validation
            const values = await approvalForm.validateFields();
            await handleApproveInvoice(values);
            // If successful, the function will close the modal and reset the form
          } catch (error: any) {
            // If it's a validation error (errorFields), Ant Design shows it automatically
            if (error?.errorFields) {
              return Promise.reject(error);
            }
            // For other errors, they're already shown by handleApproveInvoice
            return Promise.reject(error);
          }
        }}
        width={600}
        okButtonProps={{ 
          htmlType: 'button',
          loading: approvingInvoice,
          disabled: approvingInvoice
        }}
        okText={approvingInvoice ? 'Approving...' : 'OK'}
      >
        {selectedInvoice && (
          <Form
            form={approvalForm}
            layout="vertical"
            onFinish={handleApproveInvoice}
          >
            <Alert
              message={`Approving invoice ${selectedInvoice.invoice_number}`}
              description={`Vendor: ${selectedInvoice.vendor_name} | Amount: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selectedInvoice.total_amount)}`}
              type="warning"
              style={{ marginBottom: 16 }}
            />
            <Form.Item
              name="notes"
              label="Approval Notes (Optional)"
            >
              <Input.TextArea rows={4} placeholder="Add any notes about this approval..." />
            </Form.Item>
          </Form>
        )}
      </Modal>

      <style>{`
        .overdue-row {
          background-color: #fff1f0 !important;
        }
        .paid-row {
          background-color: #f6ffed !important;
        }
      `}</style>
    </div>
  );
};

