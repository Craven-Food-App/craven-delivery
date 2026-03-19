// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Button,
  Table,
  Modal,
  TextInput,
  NumberInput,
  Select,
  Textarea,
  Stack,
  Group,
  Text,
  Badge,
  Grid,
  Paper,
  Tabs,
  ActionIcon,
  Tooltip,
  FileButton,
  Loader,
  Center,
  Alert,
  Divider,
  Box,
  Progress,
  ThemeIcon,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { supabase } from '@/integrations/supabase/client';
import {
  IconPlus,
  IconEye,
  IconCheck,
  IconX,
  IconUpload,
  IconFileText,
  IconCurrencyDollar,
  IconSearch,
  IconAlertTriangle,
  IconFileInvoice,
  IconReceipt,
  IconCreditCard,
  IconTrash,
  IconEdit,
  IconFileTypePdf,
  IconDownload,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { isInvoiceOverdue, daysUntilDue } from '@/utils/finance';
import { parseInvoicePdf, type ParsedInvoice } from '@/utils/invoicePdfParser';

// ── Types ───────────────────────────────────────────────────────────

interface Invoice {
  id: string;
  invoice_number: string;
  vendor_name: string;
  vendor_email: string | null;
  vendor_address: string | null;
  invoice_date: string;
  due_date: string;
  amount: number;
  tax_amount: number | null;
  total_amount: number | null;
  status: string | null;
  department: { name: string } | null;
  expense_category: { name: string } | null;
  line_items: any[] | null;
  invoice_file_url: string | null;
  notes: string | null;
  payment_date: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  created_at: string | null;
}

// ── Component ───────────────────────────────────────────────────────

export const Invoices: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [departments, setDepartments] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // Create/Edit invoice
  const [modalOpen, setModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [parsingPdf, setParsingPdf] = useState(false);

  // Bulk upload
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkFiles, setBulkFiles] = useState<File[]>([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number; results: Array<{ file: string; status: 'success' | 'error'; message: string; invoice_id?: string }> }>({ current: 0, total: 0, results: [] });

  // Record Payment
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);

  // Preview
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    vendor_name: '',
    vendor_email: '',
    vendor_address: '',
    invoice_number: '',
    invoice_date: dayjs().format('YYYY-MM-DD'),
    due_date: dayjs().add(30, 'day').format('YYYY-MM-DD'),
    amount: '' as string | number,
    tax_amount: '' as string | number,
    department_id: '',
    expense_category_id: '',
    line_items: [] as any[],
    notes: '',
    status: 'draft',
  });

  // Payment form
  const [paymentData, setPaymentData] = useState({
    amount: '' as string | number,
    payment_date: dayjs().format('YYYY-MM-DD'),
    payment_method: 'bank_transfer',
    reference: '',
    notes: '',
  });

  // ── Fetch ──────────────────────────────────────────────────────

  useEffect(() => {
    fetchInvoices();
    fetchDepartments();
    fetchCategories();
  }, []);

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
        .order('invoice_date', { ascending: false });

      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          notifications.show({ title: 'Setup Required', message: 'Invoice tables not configured. Using empty state.', color: 'orange' });
          return;
        }
        throw error;
      }

      // Auto-flag overdue
      const now = dayjs();
      const processed = (data || []).map((inv: any) => {
        const effectiveStatus = inv.status !== 'paid' && dayjs(inv.due_date).isBefore(now, 'day')
          ? 'overdue'
          : inv.status || 'draft';
        return {
          ...inv,
          status: effectiveStatus,
          line_items: Array.isArray(inv.line_items) ? inv.line_items : [],
        };
      });

      setInvoices(processed as Invoice[]);
    } catch (error: any) {
      console.error('Error fetching invoices:', error);
      notifications.show({ title: 'Error', message: error.message || 'Failed to load invoices', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const { data } = await supabase.from('departments').select('id, name').order('name');
      setDepartments(data || []);
    } catch { /* graceful */ }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase.from('expense_categories').select('id, name').eq('is_active', true).order('name');
      if (!error) setCategories(data || []);
    } catch { /* graceful */ }
  };

  // ── Computed ───────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = invoices;
    if (activeTab !== 'all') list = list.filter(i => i.status === activeTab);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(i =>
        i.invoice_number?.toLowerCase().includes(q) ||
        i.vendor_name?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [invoices, activeTab, search]);

  const stats = useMemo(() => {
    const outstanding = invoices
      .filter(i => i.status !== 'paid')
      .reduce((s, i) => s + (i.total_amount || i.amount || 0), 0);
    const overdueCount = invoices.filter(i => i.status === 'overdue').length;
    const paidThisMonth = invoices
      .filter(i => i.status === 'paid' && dayjs(i.payment_date || i.created_at).isSame(dayjs(), 'month'))
      .reduce((s, i) => s + (i.total_amount || i.amount || 0), 0);
    return { outstanding, overdueCount, paidThisMonth };
  }, [invoices]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    invoices.forEach(i => { counts[i.status || 'draft'] = (counts[i.status || 'draft'] || 0) + 1; });
    return counts;
  }, [invoices]);

  // ── Helpers ────────────────────────────────────────────────────

  const getStatusColor = (s: string) => {
    const map: Record<string, string> = { draft: 'gray', sent: 'blue', pending: 'orange', approved: 'cyan', paid: 'green', overdue: 'red', disputed: 'yellow', cancelled: 'dark' };
    return map[s] || 'gray';
  };

  const generateInvoiceNumber = async () => {
    const year = new Date().getFullYear();
    const { count } = await supabase.from('invoices').select('*', { count: 'exact', head: true }).like('invoice_number', `INV-${year}-%`);
    return `INV-${year}-${((count || 0) + 1).toString().padStart(6, '0')}`;
  };

  const resetForm = () => {
    setFormData({
      vendor_name: '', vendor_email: '', vendor_address: '', invoice_number: '',
      invoice_date: dayjs().format('YYYY-MM-DD'), due_date: dayjs().add(30, 'day').format('YYYY-MM-DD'),
      amount: '', tax_amount: '', department_id: '', expense_category_id: '',
      line_items: [], notes: '', status: 'draft',
    });
    setInvoiceFile(null);
    setEditingInvoice(null);
  };

  // ── PDF Import ─────────────────────────────────────────────────

  const handlePdfImport = async (file: File | null) => {
    if (!file) return;
    setInvoiceFile(file);

    if (file.type === 'application/pdf') {
      setParsingPdf(true);
      try {
        const parsed: ParsedInvoice = await parseInvoicePdf(file);
        setFormData(prev => ({
          ...prev,
          vendor_name: parsed.vendor_name || prev.vendor_name,
          vendor_email: parsed.vendor_email || prev.vendor_email,
          vendor_address: parsed.vendor_address || prev.vendor_address,
          invoice_number: parsed.invoice_number || prev.invoice_number,
          invoice_date: parsed.invoice_date || prev.invoice_date,
          due_date: parsed.due_date || prev.due_date,
          amount: parsed.subtotal || parsed.total_amount || prev.amount,
          tax_amount: parsed.tax_amount || prev.tax_amount,
          line_items: parsed.line_items.length > 0 ? parsed.line_items : prev.line_items,
          notes: parsed.notes || prev.notes,
        }));
        notifications.show({ title: 'PDF Parsed', message: `Extracted data from "${file.name}". Please verify and edit as needed.`, color: 'teal' });
      } catch (err: any) {
        console.error('PDF parse error:', err);
        notifications.show({ title: 'Could not parse PDF', message: 'Auto-fill skipped. You can still enter data manually.', color: 'orange' });
      } finally {
        setParsingPdf(false);
      }
    }
    // Open the create modal if not already open
    if (!modalOpen) {
      setModalOpen(true);
    }
  };

  // ── AI Scan & Bulk Upload ──────────────────────────────────────

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // strip data:...;base64, prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleBulkUpload = async () => {
    if (bulkFiles.length === 0) return;
    setBulkProcessing(true);
    setBulkProgress({ current: 0, total: bulkFiles.length, results: [] });

    const results: typeof bulkProgress.results = [];

    for (let i = 0; i < bulkFiles.length; i++) {
      const file = bulkFiles[i];
      setBulkProgress(prev => ({ ...prev, current: i + 1 }));

      try {
        const base64 = await fileToBase64(file);
        const { data, error } = await supabase.functions.invoke('scan-invoice-pdf', {
          body: {
            file_base64: base64,
            file_name: file.name,
            content_type: file.type,
            auto_create: true,
          },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        const vendorName = data?.extracted?.vendor_name || 'Unknown';
        const totalAmt = data?.extracted?.total_amount || 0;
        results.push({
          file: file.name,
          status: 'success',
          message: `${vendorName} — $${Number(totalAmt).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
          invoice_id: data?.invoice_id,
        });
      } catch (err: any) {
        console.error(`Error processing ${file.name}:`, err);
        results.push({
          file: file.name,
          status: 'error',
          message: err.message || 'Scan failed',
        });
      }

      setBulkProgress(prev => ({ ...prev, results: [...results] }));
    }

    setBulkProcessing(false);
    const successCount = results.filter(r => r.status === 'success').length;
    notifications.show({
      title: 'Bulk Upload Complete',
      message: `${successCount} of ${bulkFiles.length} invoices scanned and created successfully.`,
      color: successCount === bulkFiles.length ? 'green' : 'orange',
      autoClose: 5000,
    });
    fetchInvoices();
  };

  const handleBulkFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setBulkFiles(prev => [...prev, ...files]);
  };

  const removeBulkFile = (index: number) => {
    setBulkFiles(prev => prev.filter((_, i) => i !== index));
  };

  // ── Upload File to Storage ─────────────────────────────────────

  const uploadInvoiceFile = async (): Promise<string | null> => {
    if (!invoiceFile) return null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const ext = invoiceFile.name.split('.').pop();
      const path = `invoices/${user.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from('documents').upload(path, invoiceFile);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path);
      return publicUrl;
    } catch (e: any) {
      throw new Error(`Upload failed: ${e.message}`);
    }
  };

  // ── CRUD ───────────────────────────────────────────────────────

  const handleSubmit = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileUrl = await uploadInvoiceFile();
      const invNumber = formData.invoice_number || await generateInvoiceNumber();
      const amt = typeof formData.amount === 'string' ? parseFloat(formData.amount) : formData.amount;
      const tax = typeof formData.tax_amount === 'string' ? parseFloat(formData.tax_amount || '0') : (formData.tax_amount || 0);

      const payload: any = {
        invoice_number: invNumber,
        vendor_name: formData.vendor_name,
        vendor_email: formData.vendor_email || null,
        vendor_address: formData.vendor_address || null,
        invoice_date: formData.invoice_date,
        due_date: formData.due_date,
        amount: amt,
        tax_amount: tax,
        total_amount: amt + tax,
        department_id: formData.department_id || null,
        expense_category_id: formData.expense_category_id || null,
        line_items: formData.line_items.length > 0 ? formData.line_items : [{ description: 'Line item', quantity: 1, unit_price: amt, amount: amt }],
        notes: formData.notes || null,
        status: formData.status || 'draft',
      };
      if (fileUrl) payload.invoice_file_url = fileUrl;

      if (editingInvoice) {
        const { error } = await supabase.from('invoices').update(payload).eq('id', editingInvoice.id);
        if (error) throw error;
        notifications.show({ title: 'Updated', message: `Invoice ${invNumber} updated`, color: 'green' });
      } else {
        const { error } = await supabase.from('invoices').insert(payload);
        if (error) throw error;
        notifications.show({ title: 'Created', message: `Invoice ${invNumber} created`, color: 'green' });
      }

      setModalOpen(false);
      resetForm();
      fetchInvoices();
    } catch (e: any) {
      notifications.show({ title: 'Error', message: e.message || 'Failed to save invoice', color: 'red' });
    }
  };

  const handleStatusChange = async (invoice: Invoice, newStatus: string) => {
    try {
      const update: any = { status: newStatus };
      if (newStatus === 'paid') {
        const { data: { user } } = await supabase.auth.getUser();
        update.payment_date = dayjs().format('YYYY-MM-DD');
        update.paid_by = user?.id;
      }
      const { error } = await supabase.from('invoices').update(update).eq('id', invoice.id);
      if (error) throw error;
      notifications.show({ title: 'Status Updated', message: `${invoice.invoice_number} → ${newStatus}`, color: 'green' });
      fetchInvoices();
    } catch (e: any) {
      notifications.show({ title: 'Error', message: e.message, color: 'red' });
    }
  };

  const handleRecordPayment = async () => {
    if (!paymentInvoice) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const payAmt = typeof paymentData.amount === 'string' ? parseFloat(paymentData.amount) : paymentData.amount;
      const total = paymentInvoice.total_amount || paymentInvoice.amount || 0;
      const newStatus = payAmt >= total ? 'paid' : paymentInvoice.status;

      const { error } = await supabase.from('invoices').update({
        status: newStatus,
        payment_date: paymentData.payment_date,
        payment_method: paymentData.payment_method,
        payment_reference: paymentData.reference || null,
        paid_by: user?.id,
      }).eq('id', paymentInvoice.id);

      if (error) throw error;

      notifications.show({ title: 'Payment Recorded', message: `$${payAmt.toLocaleString()} recorded for ${paymentInvoice.invoice_number}`, color: 'green' });
      setPaymentModalOpen(false);
      setPaymentInvoice(null);
      setPaymentData({ amount: '', payment_date: dayjs().format('YYYY-MM-DD'), payment_method: 'bank_transfer', reference: '', notes: '' });
      fetchInvoices();
    } catch (e: any) {
      notifications.show({ title: 'Error', message: e.message, color: 'red' });
    }
  };

  const handleDelete = async (invoice: Invoice) => {
    if (!window.confirm(`Delete invoice ${invoice.invoice_number}?`)) return;
    try {
      const { error } = await supabase.from('invoices').delete().eq('id', invoice.id);
      if (error) throw error;
      notifications.show({ title: 'Deleted', message: `Invoice ${invoice.invoice_number} removed`, color: 'orange' });
      fetchInvoices();
    } catch (e: any) {
      notifications.show({ title: 'Error', message: e.message, color: 'red' });
    }
  };

  const handleRecordAsStripeFee = async (invoice: Invoice) => {
    try {
      // Create an expense_request for the Stripe fee
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('expense_requests').insert({
        amount: invoice.total_amount || invoice.amount,
        description: `Stripe processing fee – ${invoice.invoice_number}`,
        business_purpose: 'Payment processing fee',
        expense_date: dayjs().format('YYYY-MM-DD'),
        status: 'approved',
        priority: 'low',
        submitted_by: user.id,
      });

      await handleStatusChange(invoice, 'paid');
      notifications.show({ title: 'Stripe Fee Recorded', message: `Recorded as expense and marked paid`, color: 'green' });
    } catch (e: any) {
      notifications.show({ title: 'Error', message: e.message, color: 'red' });
    }
  };

  const openEdit = (inv: Invoice) => {
    setEditingInvoice(inv);
    setFormData({
      vendor_name: inv.vendor_name,
      vendor_email: inv.vendor_email || '',
      vendor_address: inv.vendor_address || '',
      invoice_number: inv.invoice_number,
      invoice_date: inv.invoice_date,
      due_date: inv.due_date,
      amount: inv.amount,
      tax_amount: inv.tax_amount || 0,
      department_id: '',
      expense_category_id: '',
      line_items: inv.line_items || [],
      notes: inv.notes || '',
      status: inv.status || 'draft',
    });
    setModalOpen(true);
  };

  // ── Line Items Editor ──────────────────────────────────────────

  const addLineItem = () => {
    setFormData(prev => ({
      ...prev,
      line_items: [...prev.line_items, { description: '', quantity: 1, unit_price: 0, amount: 0 }],
    }));
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    setFormData(prev => {
      const items = [...prev.line_items];
      items[index] = { ...items[index], [field]: value };
      if (field === 'quantity' || field === 'unit_price') {
        items[index].amount = (items[index].quantity || 0) * (items[index].unit_price || 0);
      }
      return { ...prev, line_items: items };
    });
  };

  const removeLineItem = (index: number) => {
    setFormData(prev => ({ ...prev, line_items: prev.line_items.filter((_, i) => i !== index) }));
  };

  // ── Render ─────────────────────────────────────────────────────

  return (
    <Stack gap="lg">
      {/* Summary Cards */}
      <Grid>
        <Grid.Col span={{ base: 12, sm: 4 }}>
          <Paper p="lg" withBorder radius="md" style={{ borderLeft: '4px solid var(--mantine-color-orange-6)' }}>
            <Group justify="space-between">
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Total Outstanding</Text>
                <Text fw={700} size="xl">${stats.outstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
              </div>
              <ThemeIcon size={48} radius="md" variant="light" color="orange">
                <IconFileInvoice size={24} />
              </ThemeIcon>
            </Group>
          </Paper>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 4 }}>
          <Paper p="lg" withBorder radius="md" style={{ borderLeft: '4px solid var(--mantine-color-red-6)' }}>
            <Group justify="space-between">
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Overdue</Text>
                <Text fw={700} size="xl" c="red">{stats.overdueCount}</Text>
              </div>
              <ThemeIcon size={48} radius="md" variant="light" color="red">
                <IconAlertTriangle size={24} />
              </ThemeIcon>
            </Group>
          </Paper>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 4 }}>
          <Paper p="lg" withBorder radius="md" style={{ borderLeft: '4px solid var(--mantine-color-green-6)' }}>
            <Group justify="space-between">
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Paid This Month</Text>
                <Text fw={700} size="xl" c="green">${stats.paidThisMonth.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
              </div>
              <ThemeIcon size={48} radius="md" variant="light" color="green">
                <IconCheck size={24} />
              </ThemeIcon>
            </Group>
          </Paper>
        </Grid.Col>
      </Grid>

      {/* Main Card */}
      <Card p="lg" radius="md" withBorder>
        <Group justify="space-between" mb="md">
          <div>
            <Text fw={700} size="xl">Invoices</Text>
            <Text c="dimmed" size="sm">Manage vendor invoices, record payments, and track statuses</Text>
          </div>
          <Group>
            <Button
              leftSection={<IconUpload size={16} />}
              variant="light"
              color="orange"
              onClick={() => { setBulkFiles([]); setBulkProgress({ current: 0, total: 0, results: [] }); setBulkModalOpen(true); }}
            >
              Bulk Upload & Scan
            </Button>
            <FileButton onChange={handlePdfImport} accept="application/pdf,image/*">
              {(props) => (
                <Button {...props} leftSection={<IconFileTypePdf size={16} />} variant="light" color="teal" loading={parsingPdf}>
                  Import PDF
                </Button>
              )}
            </FileButton>
            <Button leftSection={<IconPlus size={16} />} onClick={() => { resetForm(); setModalOpen(true); }}>
              New Invoice
            </Button>
          </Group>
        </Group>

        {/* Search */}
        <TextInput
          placeholder="Search by invoice # or vendor..."
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          mb="md"
        />

        {/* Tabs */}
        <Tabs value={activeTab} onChange={(v) => setActiveTab(v || 'all')}>
          <Tabs.List>
            <Tabs.Tab value="all">All ({invoices.length})</Tabs.Tab>
            <Tabs.Tab value="draft">Draft ({statusCounts.draft || 0})</Tabs.Tab>
            <Tabs.Tab value="sent">Sent ({statusCounts.sent || 0})</Tabs.Tab>
            <Tabs.Tab value="pending">Pending ({statusCounts.pending || 0})</Tabs.Tab>
            <Tabs.Tab value="overdue" c="red">Overdue ({statusCounts.overdue || 0})</Tabs.Tab>
            <Tabs.Tab value="paid">Paid ({statusCounts.paid || 0})</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value={activeTab} pt="md">
            {loading ? (
              <Center h={200}><Loader /></Center>
            ) : filtered.length === 0 ? (
              <Alert color="blue" icon={<IconFileInvoice size={16} />}>No invoices found</Alert>
            ) : (
              <Box style={{ overflowX: 'auto' }}>
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Invoice #</Table.Th>
                      <Table.Th>Vendor</Table.Th>
                      <Table.Th>Total</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th>Due Date</Table.Th>
                      <Table.Th>Actions</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {filtered.map(inv => {
                      const overdue = inv.status === 'overdue';
                      const total = inv.total_amount || inv.amount || 0;
                      return (
                        <Table.Tr key={inv.id} style={{ backgroundColor: overdue ? '#fff5f5' : undefined }}>
                          <Table.Td>
                            <Text fw={500} size="sm">{inv.invoice_number}</Text>
                            {overdue && <Badge color="red" size="xs" mt={2}>OVERDUE</Badge>}
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">{inv.vendor_name}</Text>
                            {inv.vendor_email && <Text size="xs" c="dimmed">{inv.vendor_email}</Text>}
                          </Table.Td>
                          <Table.Td>
                            <Text fw={600} size="sm">${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Select
                              size="xs"
                              value={inv.status}
                              data={[
                                { value: 'draft', label: 'Draft' },
                                { value: 'sent', label: 'Sent' },
                                { value: 'pending', label: 'Pending' },
                                { value: 'approved', label: 'Approved' },
                                { value: 'paid', label: 'Paid' },
                                { value: 'overdue', label: 'Overdue' },
                              ]}
                              onChange={(v) => v && handleStatusChange(inv, v)}
                              styles={{ input: { border: 'none', background: 'transparent', fontWeight: 600, color: `var(--mantine-color-${getStatusColor(inv.status || 'draft')}-6)` } }}
                              w={110}
                            />
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" c={overdue ? 'red' : 'dimmed'}>
                              {dayjs(inv.due_date).format('MMM D, YYYY')}
                            </Text>
                            {!overdue && inv.status !== 'paid' && (
                              <Text size="xs" c="dimmed">{daysUntilDue(inv.due_date)} days</Text>
                            )}
                          </Table.Td>
                          <Table.Td>
                            <Group gap={4}>
                              <Tooltip label="Preview">
                                <ActionIcon variant="light" size="sm" onClick={() => { setPreviewInvoice(inv); setPreviewModalOpen(true); }}>
                                  <IconEye size={14} />
                                </ActionIcon>
                              </Tooltip>
                              <Tooltip label="Edit">
                                <ActionIcon variant="light" color="blue" size="sm" onClick={() => openEdit(inv)}>
                                  <IconEdit size={14} />
                                </ActionIcon>
                              </Tooltip>
                              {inv.status !== 'paid' && (
                                <Tooltip label="Record Payment">
                                  <ActionIcon variant="light" color="green" size="sm" onClick={() => {
                                    setPaymentInvoice(inv);
                                    setPaymentData(prev => ({ ...prev, amount: total }));
                                    setPaymentModalOpen(true);
                                  }}>
                                    <IconCurrencyDollar size={14} />
                                  </ActionIcon>
                                </Tooltip>
                              )}
                              {inv.status !== 'paid' && total < 0 && (
                                <Tooltip label="Record as Stripe Fee">
                                  <ActionIcon variant="light" color="violet" size="sm" onClick={() => handleRecordAsStripeFee(inv)}>
                                    <IconCreditCard size={14} />
                                  </ActionIcon>
                                </Tooltip>
                              )}
                              <Tooltip label="Delete">
                                <ActionIcon variant="light" color="red" size="sm" onClick={() => handleDelete(inv)}>
                                  <IconTrash size={14} />
                                </ActionIcon>
                              </Tooltip>
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                      );
                    })}
                  </Table.Tbody>
                </Table>
              </Box>
            )}
          </Tabs.Panel>
        </Tabs>

        {/* Stripe Fee Bulk Action */}
        {invoices.some(i => i.status !== 'paid' && (i.total_amount || i.amount || 0) < 0) && (
          <Alert color="violet" mt="md" icon={<IconCreditCard size={16} />} title="Stripe Fee Detection">
            <Group justify="space-between">
              <Text size="sm">
                {invoices.filter(i => i.status !== 'paid' && (i.total_amount || i.amount || 0) < 0).length} invoice(s) have negative balances (likely Stripe fees).
              </Text>
              <Button size="xs" variant="light" color="violet" onClick={async () => {
                const feesInvoices = invoices.filter(i => i.status !== 'paid' && (i.total_amount || i.amount || 0) < 0);
                for (const inv of feesInvoices) await handleRecordAsStripeFee(inv);
              }}>
                Record All Stripe Fees
              </Button>
            </Group>
          </Alert>
        )}
      </Card>

      {/* ── Create/Edit Invoice Modal ────────────────────────── */}
      <Modal
        opened={modalOpen}
        onClose={() => { setModalOpen(false); resetForm(); }}
        title={editingInvoice ? `Edit Invoice ${editingInvoice.invoice_number}` : 'Create Invoice'}
        size="xl"
      >
        <Stack gap="md">
          {parsingPdf && (
            <Alert color="teal" icon={<Loader size={16} />}>
              Parsing PDF — extracting invoice data...
            </Alert>
          )}

          <Grid>
            <Grid.Col span={6}>
              <TextInput label="Vendor Name" required value={formData.vendor_name} onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })} />
            </Grid.Col>
            <Grid.Col span={6}>
              <TextInput label="Vendor Email" value={formData.vendor_email} onChange={(e) => setFormData({ ...formData, vendor_email: e.target.value })} />
            </Grid.Col>
            <Grid.Col span={12}>
              <TextInput label="Vendor Address" value={formData.vendor_address} onChange={(e) => setFormData({ ...formData, vendor_address: e.target.value })} />
            </Grid.Col>
            <Grid.Col span={4}>
              <TextInput label="Invoice Number" placeholder="Auto-generated if blank" value={formData.invoice_number} onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })} />
            </Grid.Col>
            <Grid.Col span={4}>
              <TextInput label="Invoice Date" type="date" required value={formData.invoice_date} onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })} />
            </Grid.Col>
            <Grid.Col span={4}>
              <TextInput label="Due Date" type="date" required value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} />
            </Grid.Col>
            <Grid.Col span={4}>
              <Select label="Status" data={[
                { value: 'draft', label: 'Draft' },
                { value: 'sent', label: 'Sent' },
                { value: 'pending', label: 'Pending' },
              ]} value={formData.status} onChange={(v) => setFormData({ ...formData, status: v || 'draft' })} />
            </Grid.Col>
            <Grid.Col span={4}>
              <Select label="Department" data={departments.map(d => ({ value: d.id, label: d.name }))} value={formData.department_id} onChange={(v) => setFormData({ ...formData, department_id: v || '' })} clearable />
            </Grid.Col>
            <Grid.Col span={4}>
              <Select label="Category" data={categories.map(c => ({ value: c.id, label: c.name }))} value={formData.expense_category_id} onChange={(v) => setFormData({ ...formData, expense_category_id: v || '' })} clearable />
            </Grid.Col>
          </Grid>

          <Divider label="Line Items" labelPosition="center" />

          {formData.line_items.map((item, idx) => (
            <Grid key={idx} align="flex-end">
              <Grid.Col span={5}>
                <TextInput size="xs" label={idx === 0 ? 'Description' : undefined} value={item.description} onChange={(e) => updateLineItem(idx, 'description', e.target.value)} />
              </Grid.Col>
              <Grid.Col span={2}>
                <NumberInput size="xs" label={idx === 0 ? 'Qty' : undefined} value={item.quantity} onChange={(v) => updateLineItem(idx, 'quantity', v)} min={0} />
              </Grid.Col>
              <Grid.Col span={2}>
                <NumberInput size="xs" label={idx === 0 ? 'Unit Price' : undefined} prefix="$" decimalScale={2} value={item.unit_price} onChange={(v) => updateLineItem(idx, 'unit_price', v)} />
              </Grid.Col>
              <Grid.Col span={2}>
                <Text size="sm" fw={600} mt={idx === 0 ? 24 : 0}>${(item.amount || 0).toFixed(2)}</Text>
              </Grid.Col>
              <Grid.Col span={1}>
                <ActionIcon variant="light" color="red" size="sm" onClick={() => removeLineItem(idx)}>
                  <IconX size={12} />
                </ActionIcon>
              </Grid.Col>
            </Grid>
          ))}
          <Button variant="light" size="xs" leftSection={<IconPlus size={14} />} onClick={addLineItem} w="fit-content">
            Add Line Item
          </Button>

          <Divider />

          <Grid>
            <Grid.Col span={6}>
              <NumberInput label="Subtotal" prefix="$" decimalScale={2} fixedDecimalScale value={formData.amount} onChange={(v) => setFormData({ ...formData, amount: v || '' })} required />
            </Grid.Col>
            <Grid.Col span={6}>
              <NumberInput label="Tax" prefix="$" decimalScale={2} fixedDecimalScale value={formData.tax_amount} onChange={(v) => setFormData({ ...formData, tax_amount: v || '' })} />
            </Grid.Col>
          </Grid>

          {formData.line_items.length > 0 && (
            <Paper p="sm" withBorder bg="gray.0">
              <Group justify="space-between">
                <Text size="sm" fw={600}>Line Items Total</Text>
                <Text size="sm" fw={700}>${formData.line_items.reduce((s: number, i: any) => s + (i.amount || 0), 0).toFixed(2)}</Text>
              </Group>
            </Paper>
          )}

          <Textarea label="Notes" rows={2} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />

          <div>
            <Text size="sm" fw={500} mb="xs">Attach Invoice File</Text>
            <FileButton onChange={handlePdfImport} accept="application/pdf,image/*">
              {(props) => (
                <Button {...props} leftSection={<IconUpload size={16} />} variant="light" size="sm">
                  {invoiceFile ? invoiceFile.name : 'Upload PDF / Image'}
                </Button>
              )}
            </FileButton>
          </div>

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={() => { setModalOpen(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!formData.vendor_name || !formData.amount}>
              {editingInvoice ? 'Update Invoice' : 'Create Invoice'}
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* ── Record Payment Modal ─────────────────────────────── */}
      <Modal
        opened={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title={`Record Payment – ${paymentInvoice?.invoice_number}`}
        size="md"
      >
        <Stack gap="md">
          {paymentInvoice && (
            <Paper p="md" withBorder bg="gray.0">
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Balance Due</Text>
                <Text fw={700} size="lg" c="orange">
                  ${(paymentInvoice.total_amount || paymentInvoice.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Text>
              </Group>
            </Paper>
          )}

          <NumberInput label="Payment Amount" prefix="$" decimalScale={2} fixedDecimalScale value={paymentData.amount} onChange={(v) => setPaymentData({ ...paymentData, amount: v || '' })} required />
          <TextInput label="Payment Date" type="date" value={paymentData.payment_date} onChange={(e) => setPaymentData({ ...paymentData, payment_date: e.target.value })} required />
          <Select label="Payment Method" data={[
            { value: 'cash', label: 'Cash' },
            { value: 'check', label: 'Check' },
            { value: 'credit_card', label: 'Credit Card' },
            { value: 'bank_transfer', label: 'Bank Transfer' },
            { value: 'stripe', label: 'Stripe' },
            { value: 'other', label: 'Other' },
          ]} value={paymentData.payment_method} onChange={(v) => setPaymentData({ ...paymentData, payment_method: v || 'bank_transfer' })} />
          <TextInput label="Reference / Check #" value={paymentData.reference} onChange={(e) => setPaymentData({ ...paymentData, reference: e.target.value })} />
          <Textarea label="Notes" rows={2} value={paymentData.notes} onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })} />

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={() => setPaymentModalOpen(false)}>Cancel</Button>
            <Button color="green" leftSection={<IconCurrencyDollar size={16} />} onClick={handleRecordPayment}>
              Record Payment
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* ── Invoice Preview Modal ────────────────────────────── */}
      <Modal
        opened={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        title="Invoice Preview"
        size="lg"
        fullScreen={false}
      >
        {previewInvoice && <InvoicePreviewInline invoice={previewInvoice} onClose={() => setPreviewModalOpen(false)} />}
      </Modal>
    </Stack>
  );
};

// ── Inline Invoice Preview ────────────────────────────────────────────

const InvoicePreviewInline: React.FC<{ invoice: Invoice; onClose: () => void }> = ({ invoice, onClose }) => {
  const total = invoice.total_amount || invoice.amount || 0;
  const lineItems = invoice.line_items || [];

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Invoice ${invoice.invoice_number}</title>
      <style>
        body { font-family: 'Segoe UI', sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
        .company { font-size: 24px; font-weight: bold; color: #1a1a2e; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
        .badge-paid { background: #d3f9d8; color: #2b8a3e; }
        .badge-overdue { background: #ffe3e3; color: #c92a2a; }
        .badge-draft { background: #e9ecef; color: #495057; }
        .badge-sent { background: #d0ebff; color: #1864ab; }
        .badge-pending { background: #fff3bf; color: #e67700; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background: #f8f9fa; text-align: left; padding: 10px; border-bottom: 2px solid #dee2e6; font-size: 13px; }
        td { padding: 10px; border-bottom: 1px solid #f1f3f5; font-size: 14px; }
        .totals { text-align: right; margin-top: 20px; }
        .totals div { margin: 4px 0; }
        .total-row { font-size: 18px; font-weight: bold; border-top: 2px solid #1a1a2e; padding-top: 8px; }
        .section { margin: 24px 0; }
        .section-title { font-size: 12px; text-transform: uppercase; color: #868e96; margin-bottom: 6px; font-weight: 600; }
        @media print { body { padding: 20px; } }
      </style></head><body>
        <div class="header">
          <div>
            <div class="company">Crave'n Delivery</div>
            <div style="color:#868e96;font-size:13px">Financial Operations</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:28px;font-weight:bold;color:#1a1a2e">INVOICE</div>
            <span class="badge badge-${invoice.status}">${(invoice.status || 'draft').toUpperCase()}</span>
          </div>
        </div>
        <div class="section">
          <div class="section-title">Bill To</div>
          <div style="font-weight:600">${invoice.vendor_name}</div>
          ${invoice.vendor_email ? `<div style="color:#868e96">${invoice.vendor_email}</div>` : ''}
          ${invoice.vendor_address ? `<div style="color:#868e96">${invoice.vendor_address}</div>` : ''}
        </div>
        <div style="display:flex;gap:60px">
          <div class="section"><div class="section-title">Invoice #</div><div>${invoice.invoice_number}</div></div>
          <div class="section"><div class="section-title">Invoice Date</div><div>${dayjs(invoice.invoice_date).format('MMM D, YYYY')}</div></div>
          <div class="section"><div class="section-title">Due Date</div><div>${dayjs(invoice.due_date).format('MMM D, YYYY')}</div></div>
          <div class="section"><div class="section-title">Balance Due</div><div style="font-weight:bold;color:#e67700">$${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div></div>
        </div>
        ${lineItems.length > 0 ? `
          <table>
            <thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th style="text-align:right">Amount</th></tr></thead>
            <tbody>${lineItems.map((item: any) => `<tr><td>${item.description || ''}</td><td>${item.quantity || 1}</td><td>$${(item.unit_price || 0).toFixed(2)}</td><td style="text-align:right">$${(item.amount || 0).toFixed(2)}</td></tr>`).join('')}</tbody>
          </table>
        ` : ''}
        <div class="totals">
          <div>Subtotal: $${(invoice.amount || 0).toFixed(2)}</div>
          ${invoice.tax_amount ? `<div>Tax: $${invoice.tax_amount.toFixed(2)}</div>` : ''}
          <div class="total-row">Total: $${total.toFixed(2)}</div>
          ${invoice.payment_date ? `<div style="color:#2b8a3e">Paid: ${dayjs(invoice.payment_date).format('MMM D, YYYY')} via ${invoice.payment_method || 'N/A'}</div>` : ''}
        </div>
        ${invoice.notes ? `<div class="section"><div class="section-title">Notes</div><div style="color:#495057">${invoice.notes}</div></div>` : ''}
      </body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <div>
          <Text fw={700} size="lg">Crave'n Delivery</Text>
          <Text size="xs" c="dimmed">Financial Operations</Text>
        </div>
        <div style={{ textAlign: 'right' }}>
          <Text fw={700} size="xl" c="dark">INVOICE</Text>
          <Badge color={invoice.status === 'paid' ? 'green' : invoice.status === 'overdue' ? 'red' : 'blue'} size="lg">
            {(invoice.status || 'draft').toUpperCase()}
          </Badge>
        </div>
      </Group>

      <Divider />

      <Grid>
        <Grid.Col span={6}>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Bill To</Text>
          <Text fw={600}>{invoice.vendor_name}</Text>
          {invoice.vendor_email && <Text size="sm" c="dimmed">{invoice.vendor_email}</Text>}
          {invoice.vendor_address && <Text size="sm" c="dimmed">{invoice.vendor_address}</Text>}
        </Grid.Col>
        <Grid.Col span={6}>
          <Grid>
            <Grid.Col span={6}>
              <Text size="xs" c="dimmed">Invoice #</Text>
              <Text fw={500} size="sm">{invoice.invoice_number}</Text>
            </Grid.Col>
            <Grid.Col span={6}>
              <Text size="xs" c="dimmed">Date</Text>
              <Text size="sm">{dayjs(invoice.invoice_date).format('MMM D, YYYY')}</Text>
            </Grid.Col>
            <Grid.Col span={6}>
              <Text size="xs" c="dimmed">Due Date</Text>
              <Text size="sm" c={invoice.status === 'overdue' ? 'red' : undefined}>{dayjs(invoice.due_date).format('MMM D, YYYY')}</Text>
            </Grid.Col>
            <Grid.Col span={6}>
              <Text size="xs" c="dimmed">Balance Due</Text>
              <Text fw={700} c="orange">${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
            </Grid.Col>
          </Grid>
        </Grid.Col>
      </Grid>

      {lineItems.length > 0 && (
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Description</Table.Th>
              <Table.Th>Qty</Table.Th>
              <Table.Th>Unit Price</Table.Th>
              <Table.Th style={{ textAlign: 'right' }}>Amount</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {lineItems.map((item: any, i: number) => (
              <Table.Tr key={i}>
                <Table.Td>{item.description}</Table.Td>
                <Table.Td>{item.quantity || 1}</Table.Td>
                <Table.Td>${(item.unit_price || 0).toFixed(2)}</Table.Td>
                <Table.Td style={{ textAlign: 'right' }}>${(item.amount || 0).toFixed(2)}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      <Paper p="md" withBorder bg="gray.0">
        <Stack gap={4} align="flex-end">
          <Group gap="xl">
            <Text size="sm" c="dimmed">Subtotal</Text>
            <Text size="sm" fw={500}>${(invoice.amount || 0).toFixed(2)}</Text>
          </Group>
          {invoice.tax_amount ? (
            <Group gap="xl">
              <Text size="sm" c="dimmed">Tax</Text>
              <Text size="sm">${invoice.tax_amount.toFixed(2)}</Text>
            </Group>
          ) : null}
          <Divider w="200" />
          <Group gap="xl">
            <Text fw={700}>Total</Text>
            <Text fw={700} size="lg">${total.toFixed(2)}</Text>
          </Group>
          {invoice.payment_date && (
            <Group gap="xl">
              <Text size="sm" c="green">Paid {dayjs(invoice.payment_date).format('MMM D, YYYY')}</Text>
              <Text size="sm" c="green">via {invoice.payment_method || 'N/A'}</Text>
            </Group>
          )}
        </Stack>
      </Paper>

      {invoice.notes && (
        <div>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Notes</Text>
          <Text size="sm">{invoice.notes}</Text>
        </div>
      )}

      {invoice.invoice_file_url && (
        <Button component="a" href={invoice.invoice_file_url} target="_blank" leftSection={<IconDownload size={16} />} variant="light" size="sm">
          Download Original
        </Button>
      )}

      <Group justify="flex-end">
        <Button variant="subtle" onClick={onClose}>Close</Button>
        <Button leftSection={<IconReceipt size={16} />} onClick={handlePrint}>
          Print / Save PDF
        </Button>
      </Group>
    </Stack>
  );
};

export default Invoices;

