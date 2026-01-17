import React, { useState, useEffect } from 'react';
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
  IconCalendar,
  IconCurrencyDollar,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { isInvoiceOverdue } from '@/utils/finance';

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
  department: { name: string };
  expense_category: { name: string };
  line_items: any[];
  invoice_file_url: string;
  created_at: string;
}

export const InvoiceManagement: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>('pending');
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    vendor_name: '',
    vendor_email: '',
    vendor_address: '',
    invoice_date: new Date(),
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    amount: '',
    tax_amount: '',
    department_id: '',
    expense_category_id: '',
    line_items: [] as any[],
    notes: '',
  });

  useEffect(() => {
    fetchInvoices();
    fetchDepartments();
    fetchCategories();
  }, [activeTab]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('invoices')
        .select(`
          *,
          department:departments(name),
          expense_category:expense_categories(name)
        `)
        .order('invoice_date', { ascending: false });

      if (activeTab !== 'all') {
        query = query.eq('status', activeTab);
      }

      const { data, error } = await query;

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
      setInvoices((data || []).map((inv: any) => ({
        ...inv,
        line_items: Array.isArray(inv.line_items) ? inv.line_items : []
      })) as Invoice[]);
    } catch (error: any) {
      console.error('Error fetching invoices:', error);
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to load invoices',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    const { data } = await supabase.from('departments').select('id, name').order('name');
    setDepartments(data || []);
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      
      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          return; // Table doesn't exist yet
        }
        console.error('Error fetching categories:', error);
        return;
      }
      setCategories(data || []);
    } catch (error: any) {
      console.error('Error fetching categories:', error);
    }
  };

  const uploadInvoiceFile = async (): Promise<string | null> => {
    if (!invoiceFile) return null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileExt = invoiceFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `invoices/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, invoiceFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      throw new Error(`Failed to upload invoice: ${error.message}`);
    }
  };

  const generateInvoiceNumber = async (): Promise<string> => {
    const year = new Date().getFullYear();
    const { count } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .like('invoice_number', `INV-${year}-%`);

    const seqNum = (count || 0) + 1;
    return `INV-${year}-${seqNum.toString().padStart(6, '0')}`;
  };

  const handleSubmit = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const invoiceFileUrl = await uploadInvoiceFile();
      const invoiceNumber = await generateInvoiceNumber();

      const invoiceData = {
        invoice_number: invoiceNumber,
        vendor_name: formData.vendor_name,
        vendor_email: formData.vendor_email,
        vendor_address: formData.vendor_address,
        invoice_date: formData.invoice_date.toISOString().split('T')[0],
        due_date: formData.due_date.toISOString().split('T')[0],
        amount: parseFloat(formData.amount),
        tax_amount: parseFloat(formData.tax_amount || '0'),
        department_id: formData.department_id || null,
        expense_category_id: formData.expense_category_id || null,
        line_items: formData.line_items.length > 0 ? formData.line_items : [
          {
            description: 'Invoice line item',
            quantity: 1,
            unit_price: parseFloat(formData.amount),
            amount: parseFloat(formData.amount),
          },
        ],
        invoice_file_url: invoiceFileUrl,
        notes: formData.notes,
        status: 'pending',
      };

      const { error } = await supabase.from('invoices').insert(invoiceData);

      if (error) throw error;

      notifications.show({
        title: 'Success',
        message: 'Invoice created successfully',
        color: 'green',
      });

      setModalOpen(false);
      resetForm();
      fetchInvoices();
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to create invoice',
        color: 'red',
      });
    }
  };

  const handleApprove = async (invoice: Invoice) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('invoices')
        .update({
          status: 'approved',
          approver_id: user.id,
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', invoice.id);

      if (error) throw error;

      notifications.show({
        title: 'Approved',
        message: `Invoice ${invoice.invoice_number} has been approved`,
        color: 'green',
      });

      fetchInvoices();
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to approve invoice',
        color: 'red',
      });
    }
  };

  const handleMarkPaid = async (invoice: Invoice) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('invoices')
        .update({
          status: 'paid',
          payment_date: new Date().toISOString().split('T')[0],
          paid_by: user.id,
        })
        .eq('id', invoice.id);

      if (error) throw error;

      notifications.show({
        title: 'Marked as Paid',
        message: `Invoice ${invoice.invoice_number} has been marked as paid`,
        color: 'green',
      });

      fetchInvoices();
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to update invoice',
        color: 'red',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      vendor_name: '',
      vendor_email: '',
      vendor_address: '',
      invoice_date: new Date(),
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      amount: '',
      tax_amount: '',
      department_id: '',
      expense_category_id: '',
      line_items: [],
      notes: '',
    });
    setInvoiceFile(null);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'orange',
      approved: 'blue',
      paid: 'green',
      disputed: 'red',
      cancelled: 'gray',
    };
    return colors[status] || 'gray';
  };

  const pendingCount = invoices.filter(i => i.status === 'pending').length;
  const pendingAmount = invoices
    .filter(i => i.status === 'pending')
    .reduce((sum, i) => sum + i.total_amount, 0);

  return (
    <Stack gap="lg">
      <Card p="lg" radius="md" withBorder>
        <Group justify="space-between" mb="md">
          <div>
            <Text fw={700} size="xl">Invoice Management</Text>
            <Text c="dimmed" size="sm">Manage accounts payable and vendor invoices</Text>
          </div>
          <Group>
            <Paper p="md" withBorder>
              <Stack gap={4}>
                <Text size="xs" c="dimmed">Pending Invoices</Text>
                <Text fw={700} size="xl" c="orange">{pendingCount}</Text>
                <Text size="xs" c="dimmed">${pendingAmount.toLocaleString()}</Text>
              </Stack>
            </Paper>
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => {
                resetForm();
                setModalOpen(true);
              }}
            >
              New Invoice
            </Button>
          </Group>
        </Group>

        <Tabs value={activeTab} onChange={(value) => setActiveTab(value || 'pending')}>
          <Tabs.List>
            <Tabs.Tab value="pending">Pending ({pendingCount})</Tabs.Tab>
            <Tabs.Tab value="approved">Approved</Tabs.Tab>
            <Tabs.Tab value="paid">Paid</Tabs.Tab>
            <Tabs.Tab value="all">All</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value={activeTab} pt="md">
            {loading ? (
              <Center h={200}>
                <Loader />
              </Center>
            ) : invoices.length === 0 ? (
              <Alert color="blue">No invoices found</Alert>
            ) : (
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Invoice #</Table.Th>
                    <Table.Th>Vendor</Table.Th>
                    <Table.Th>Date</Table.Th>
                    <Table.Th>Due Date</Table.Th>
                    <Table.Th>Amount</Table.Th>
                    <Table.Th>Department</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {invoices.map(invoice => (
                    <Table.Tr
                      key={invoice.id}
                      style={{
                        backgroundColor: isInvoiceOverdue(invoice.due_date, invoice.status) ? '#fff5f5' : undefined,
                      }}
                    >
                      <Table.Td>
                        <Text fw={500}>{invoice.invoice_number}</Text>
                        {isInvoiceOverdue(invoice.due_date, invoice.status) && (
                          <Badge color="red" size="xs" mt={4}>OVERDUE</Badge>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <div>
                          <Text size="sm">{invoice.vendor_name}</Text>
                          {invoice.vendor_email && (
                            <Text size="xs" c="dimmed">{invoice.vendor_email}</Text>
                          )}
                        </div>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{dayjs(invoice.invoice_date).format('MMM D, YYYY')}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text
                          size="sm"
                          c={isInvoiceOverdue(invoice.due_date, invoice.status) ? 'red' : 'dimmed'}
                        >
                          {dayjs(invoice.due_date).format('MMM D, YYYY')}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text fw={600} c="green">
                          ${invoice.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{invoice.department?.name || 'N/A'}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={getStatusColor(invoice.status)}>
                          {invoice.status.toUpperCase()}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <Tooltip label="View Details">
                            <ActionIcon
                              variant="light"
                              onClick={() => {
                                setSelectedInvoice(invoice);
                                setViewModalOpen(true);
                              }}
                            >
                              <IconEye size={16} />
                            </ActionIcon>
                          </Tooltip>
                          {invoice.status === 'pending' && (
                            <Tooltip label="Approve">
                              <ActionIcon
                                variant="light"
                                color="green"
                                onClick={() => handleApprove(invoice)}
                              >
                                <IconCheck size={16} />
                              </ActionIcon>
                            </Tooltip>
                          )}
                          {invoice.status === 'approved' && (
                            <Tooltip label="Mark as Paid">
                              <ActionIcon
                                variant="light"
                                color="blue"
                                onClick={() => handleMarkPaid(invoice)}
                              >
                                <IconCurrencyDollar size={16} />
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
          </Tabs.Panel>
        </Tabs>
      </Card>

      {/* Create Invoice Modal */}
      <Modal
        opened={modalOpen}
        onClose={() => {
          setModalOpen(false);
          resetForm();
        }}
        title="Create New Invoice"
        size="lg"
      >
        <Stack gap="md">
          <Grid>
            <Grid.Col span={12}>
              <TextInput
                label="Vendor Name"
                required
                value={formData.vendor_name}
                onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <TextInput
                label="Vendor Email"
                type="email"
                value={formData.vendor_email}
                onChange={(e) => setFormData({ ...formData, vendor_email: e.target.value })}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <TextInput
                label="Vendor Address"
                value={formData.vendor_address}
                onChange={(e) => setFormData({ ...formData, vendor_address: e.target.value })}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <TextInput
                label="Invoice Date"
                type="date"
                required
                value={dayjs(formData.invoice_date).format('YYYY-MM-DD')}
                onChange={(e) => e.target.value && setFormData({ ...formData, invoice_date: new Date(e.target.value) })}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <TextInput
                label="Due Date"
                type="date"
                required
                value={dayjs(formData.due_date).format('YYYY-MM-DD')}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value ? new Date(e.target.value) : new Date() })}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <Select
                label="Department"
                data={departments.map(d => ({ value: d.id, label: d.name }))}
                value={formData.department_id}
                onChange={(value) => setFormData({ ...formData, department_id: value || '' })}
                clearable
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <Select
                label="Category"
                data={categories.map(c => ({ value: c.id, label: c.name }))}
                value={formData.expense_category_id}
                onChange={(value) => setFormData({ ...formData, expense_category_id: value || '' })}
                clearable
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <NumberInput
                label="Amount"
                required
                prefix="$"
                decimalScale={2}
                fixedDecimalScale
                value={formData.amount}
                onChange={(value) => setFormData({ ...formData, amount: value?.toString() || '' })}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <NumberInput
                label="Tax Amount"
                prefix="$"
                decimalScale={2}
                fixedDecimalScale
                value={formData.tax_amount}
                onChange={(value) => setFormData({ ...formData, tax_amount: value?.toString() || '0' })}
              />
            </Grid.Col>
            <Grid.Col span={12}>
              <Textarea
                label="Notes"
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </Grid.Col>
            <Grid.Col span={12}>
              <div>
                <Text size="sm" fw={500} mb="xs">Invoice File</Text>
                <FileButton
                  onChange={setInvoiceFile}
                  accept="application/pdf,image/*"
                >
                  {(props) => (
                    <Button
                      {...props}
                      leftSection={<IconUpload size={16} />}
                      variant="light"
                    >
                      {invoiceFile ? invoiceFile.name : 'Upload Invoice'}
                    </Button>
                  )}
                </FileButton>
              </div>
            </Grid.Col>
          </Grid>

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={() => {
              setModalOpen(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.vendor_name || !formData.amount}>
              Create Invoice
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* View Invoice Modal */}
      <Modal
        opened={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        title={`Invoice: ${selectedInvoice?.invoice_number}`}
        size="lg"
      >
        {selectedInvoice && (
          <Stack gap="md">
            <Grid>
              <Grid.Col span={6}>
                <Paper p="sm" withBorder>
                  <Text size="xs" c="dimmed">Total Amount</Text>
                  <Text fw={700} size="xl" c="green">
                    ${selectedInvoice.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </Text>
                </Paper>
              </Grid.Col>
              <Grid.Col span={6}>
                <Paper p="sm" withBorder>
                  <Text size="xs" c="dimmed">Status</Text>
                  <Badge color={getStatusColor(selectedInvoice.status)} size="lg" mt={4}>
                    {selectedInvoice.status.toUpperCase()}
                  </Badge>
                </Paper>
              </Grid.Col>
            </Grid>

            <Divider />

            <div>
              <Text size="sm" fw={500} mb={4}>Vendor</Text>
              <Text>{selectedInvoice.vendor_name}</Text>
              {selectedInvoice.vendor_email && (
                <Text size="sm" c="dimmed">{selectedInvoice.vendor_email}</Text>
              )}
            </div>

            <Grid>
              <Grid.Col span={6}>
                <Text size="sm" fw={500} mb={4}>Invoice Date</Text>
                <Text>{dayjs(selectedInvoice.invoice_date).format('MMM D, YYYY')}</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="sm" fw={500} mb={4}>Due Date</Text>
                <Text c={isInvoiceOverdue(selectedInvoice.due_date, selectedInvoice.status) ? 'red' : undefined}>
                  {dayjs(selectedInvoice.due_date).format('MMM D, YYYY')}
                </Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="sm" fw={500} mb={4}>Department</Text>
                <Text>{selectedInvoice.department?.name || 'N/A'}</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="sm" fw={500} mb={4}>Category</Text>
                <Text>{selectedInvoice.expense_category?.name || 'N/A'}</Text>
              </Grid.Col>
            </Grid>

            {selectedInvoice.line_items && selectedInvoice.line_items.length > 0 && (
              <div>
                <Text size="sm" fw={500} mb={4}>Line Items</Text>
                <Table>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Description</Table.Th>
                      <Table.Th>Qty</Table.Th>
                      <Table.Th>Unit Price</Table.Th>
                      <Table.Th>Amount</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {selectedInvoice.line_items.map((item: any, idx: number) => (
                      <Table.Tr key={idx}>
                        <Table.Td>{item.description}</Table.Td>
                        <Table.Td>{item.quantity}</Table.Td>
                        <Table.Td>${item.unit_price?.toLocaleString()}</Table.Td>
                        <Table.Td>${item.amount?.toLocaleString()}</Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </div>
            )}

            {selectedInvoice.invoice_file_url && (
              <div>
                <Text size="sm" fw={500} mb={4}>Invoice File</Text>
                <Button
                  component="a"
                  href={selectedInvoice.invoice_file_url}
                  target="_blank"
                  leftSection={<IconFileText size={16} />}
                  variant="light"
                >
                  View Invoice
                </Button>
              </div>
            )}

            {selectedInvoice.status === 'pending' && (
              <>
                <Divider />
                <Group justify="flex-end">
                  <Button
                    variant="outline"
                    color="red"
                    leftSection={<IconX size={16} />}
                  >
                    Reject
                  </Button>
                  <Button
                    color="green"
                    leftSection={<IconCheck size={16} />}
                    onClick={() => {
                      handleApprove(selectedInvoice);
                      setViewModalOpen(false);
                    }}
                  >
                    Approve
                  </Button>
                </Group>
              </>
            )}

            {selectedInvoice.status === 'approved' && (
              <>
                <Divider />
                <Group justify="flex-end">
                  <Button
                    color="blue"
                    leftSection={<IconCurrencyDollar size={16} />}
                    onClick={() => {
                      handleMarkPaid(selectedInvoice);
                      setViewModalOpen(false);
                    }}
                  >
                    Mark as Paid
                  </Button>
                </Group>
              </>
            )}
          </Stack>
        )}
      </Modal>
    </Stack>
  );
};

