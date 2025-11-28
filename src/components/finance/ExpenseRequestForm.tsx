import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  TextInput,
  Select,
  Textarea,
  NumberInput,
  FileButton,
  Stack,
  Group,
  Text,
  Alert,
  Badge,
  Divider,
  Grid,
  Paper,
  Loader,
  Center,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { supabase } from '@/integrations/supabase/client';
import { IconUpload, IconCheck, IconAlertCircle, IconCurrencyDollar } from '@tabler/icons-react';
import dayjs from 'dayjs';

interface ExpenseCategory {
  id: string;
  name: string;
  code: string;
  requires_receipt: boolean;
  requires_approval: boolean;
  approval_threshold: number;
}

interface ExpenseRequestFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialData?: any;
}

export const ExpenseRequestForm: React.FC<ExpenseRequestFormProps> = ({
  onSuccess,
  onCancel,
  initialData,
}) => {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [receiptFiles, setReceiptFiles] = useState<File[]>([]);
  const [uploadingReceipts, setUploadingReceipts] = useState(false);

  const [formData, setFormData] = useState({
    expense_category_id: '',
    amount: '',
    description: '',
    business_purpose: '',
    justification: '',
    expense_date: new Date(),
    due_date: null as Date | null,
    payment_method: 'reimbursement',
    vendor_name: '',
    priority: 'normal',
    department_id: '',
  });

  useEffect(() => {
    fetchCategories();
    fetchDepartments();
    if (initialData) {
      setFormData({
        ...initialData,
        expense_date: initialData.expense_date ? new Date(initialData.expense_date) : new Date(),
        due_date: initialData.due_date ? new Date(initialData.due_date) : null,
      });
    }
  }, [initialData]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        // Check if table doesn't exist (code 42P01)
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
      setCategories(data || []);
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to load expense categories',
        color: 'red',
      });
    }
  };

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setDepartments(data || []);
    } catch (error: any) {
      console.error('Error fetching departments:', error);
    }
  };

  const uploadReceipts = async (): Promise<string[]> => {
    if (receiptFiles.length === 0) return [];

    setUploadingReceipts(true);
    const uploadedUrls: string[] = [];

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      for (const file of receiptFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `expense-receipts/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      }
    } catch (error: any) {
      throw new Error(`Failed to upload receipts: ${error.message}`);
    } finally {
      setUploadingReceipts(false);
    }

    return uploadedUrls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get employee ID if exists
      const { data: employee } = await supabase
        .from('employees')
        .select('id, department_id')
        .eq('user_id', user.id)
        .single();

      // Upload receipts
      const receiptUrls = await uploadReceipts();

      // Get user profile for name
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('email')
        .eq('id', user.id)
        .single();

      const requesterName = user.email || 'Unknown';

      // Determine status based on approval requirements
      const selectedCategory = categories.find(c => c.id === formData.expense_category_id);
      const requiresApproval = selectedCategory?.requires_approval ?? true;
      const amount = parseFloat(formData.amount);
      const needsApproval = requiresApproval && amount >= (selectedCategory?.approval_threshold || 0);

      const status = needsApproval ? 'submitted' : 'draft';

      // Create expense request
      const { data, error } = await supabase
        .from('expense_requests')
        .insert({
          requester_employee_id: employee?.id,
          department_id: formData.department_id || employee?.department_id,
          expense_category_id: formData.expense_category_id,
          amount: amount,
          description: formData.description,
          business_purpose: formData.business_purpose,
          justification: formData.justification,
          expense_date: formData.expense_date.toISOString().split('T')[0],
          due_date: formData.due_date?.toISOString().split('T')[0],
          status: status,
          priority: formData.priority,
          payment_method: formData.payment_method,
          vendor_name: formData.vendor_name,
          receipt_urls: receiptUrls,
        } as any)
        .select()
        .single();

      if (error) throw error;

      // Log approval action
      if (status === 'submitted') {
        await supabase.from('expense_approval_log').insert({
          expense_request_id: data.id,
          action: 'submitted',
          actor_id: user.id,
          actor_name: requesterName,
          previous_status: 'draft',
          new_status: 'submitted',
        });
      }

      notifications.show({
        title: 'Success',
        message: `Expense request ${status === 'submitted' ? 'submitted for approval' : 'saved as draft'}`,
        color: 'green',
        icon: <IconCheck size={16} />,
      });

      if (onSuccess) onSuccess();
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to create expense request',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedCategory = categories.find(c => c.id === formData.expense_category_id);
  const amount = parseFloat(formData.amount) || 0;
  const requiresApproval = selectedCategory?.requires_approval ?? true;
  const needsApproval = requiresApproval && amount >= (selectedCategory?.approval_threshold || 0);

  return (
    <Card p="xl" radius="md" withBorder>
      <form onSubmit={handleSubmit}>
        <Stack gap="lg">
          <div>
            <Text fw={700} size="xl" mb="xs">New Expense Request</Text>
            <Text c="dimmed" size="sm">
              Fill out the form below to submit an expense for approval
            </Text>
          </div>

          <Divider />

          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Select
                label="Expense Category"
                placeholder="Select category"
                required
                data={categories.map(cat => ({
                  value: cat.id,
                  label: `${cat.name} (${cat.code})`,
                }))}
                value={formData.expense_category_id}
                onChange={(value) => setFormData({ ...formData, expense_category_id: value || '' })}
              />
              {selectedCategory && (
                <Text size="xs" c="dimmed" mt={4}>
                  {selectedCategory.requires_receipt && '✓ Receipt required'}
                  {selectedCategory.approval_threshold > 0 && ` • Approval threshold: $${selectedCategory.approval_threshold}`}
                </Text>
              )}
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 6 }}>
              <NumberInput
                label="Amount"
                placeholder="0.00"
                required
                prefix="$"
                decimalScale={2}
                fixedDecimalScale
                value={formData.amount}
                onChange={(value) => setFormData({ ...formData, amount: value.toString() })}
                leftSection={<IconCurrencyDollar size={16} />}
              />
            </Grid.Col>

            <Grid.Col span={12}>
              <Textarea
                label="Description"
                placeholder="Brief description of the expense"
                required
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid.Col>

            <Grid.Col span={12}>
              <Textarea
                label="Business Purpose"
                placeholder="Explain how this expense relates to business operations"
                required
                rows={3}
                value={formData.business_purpose}
                onChange={(e) => setFormData({ ...formData, business_purpose: e.target.value })}
              />
            </Grid.Col>

            <Grid.Col span={12}>
              <Textarea
                label="Justification (Optional)"
                placeholder="Additional justification if needed"
                rows={2}
                value={formData.justification}
                onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 6 }}>
              <TextInput
                label="Expense Date"
                type="date"
                required
                value={dayjs(formData.expense_date).format('YYYY-MM-DD')}
                onChange={(e) => e.target.value && setFormData({ ...formData, expense_date: new Date(e.target.value) })}
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 6 }}>
              <TextInput
                label="Due Date (Optional)"
                type="date"
                value={formData.due_date ? dayjs(formData.due_date).format('YYYY-MM-DD') : ''}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value ? new Date(e.target.value) : null })}
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 6 }}>
              <Select
                label="Department"
                placeholder="Select department"
                data={departments.map(dept => ({
                  value: dept.id,
                  label: dept.name,
                }))}
                value={formData.department_id}
                onChange={(value) => setFormData({ ...formData, department_id: value || '' })}
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 6 }}>
              <Select
                label="Priority"
                data={[
                  { value: 'low', label: 'Low' },
                  { value: 'normal', label: 'Normal' },
                  { value: 'high', label: 'High' },
                  { value: 'urgent', label: 'Urgent' },
                ]}
                value={formData.priority}
                onChange={(value) => setFormData({ ...formData, priority: value || 'normal' })}
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 6 }}>
              <Select
                label="Payment Method"
                data={[
                  { value: 'reimbursement', label: 'Reimbursement' },
                  { value: 'company_card', label: 'Company Card' },
                  { value: 'direct_pay', label: 'Direct Payment' },
                  { value: 'wire_transfer', label: 'Wire Transfer' },
                ]}
                value={formData.payment_method}
                onChange={(value) => setFormData({ ...formData, payment_method: value || 'reimbursement' })}
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 6 }}>
              <TextInput
                label="Vendor Name (Optional)"
                placeholder="Vendor or merchant name"
                value={formData.vendor_name}
                onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
              />
            </Grid.Col>

            <Grid.Col span={12}>
              <div>
                <Text size="sm" fw={500} mb="xs">
                  Receipts {selectedCategory?.requires_receipt && <Badge color="red" size="xs">Required</Badge>}
                </Text>
                <FileButton
                  onChange={(files) => {
                    if (files) {
                      const fileArray = Array.isArray(files) ? files : [files];
                      setReceiptFiles([...receiptFiles, ...fileArray]);
                    }
                  }}
                  accept="image/*,application/pdf"
                  multiple
                >
                  {(props) => (
                    <Button
                      {...props}
                      leftSection={<IconUpload size={16} />}
                      variant="light"
                      disabled={uploadingReceipts}
                    >
                      Upload Receipts
                    </Button>
                  )}
                </FileButton>
                {receiptFiles.length > 0 && (
                  <Paper p="xs" mt="xs" withBorder>
                    <Text size="sm" c="dimmed">
                      {receiptFiles.length} file(s) selected
                    </Text>
                  </Paper>
                )}
              </div>
            </Grid.Col>
          </Grid>

          {needsApproval && (
            <Alert icon={<IconAlertCircle size={16} />} color="orange" title="Approval Required">
              This expense requires approval as it exceeds the threshold of ${selectedCategory?.approval_threshold}.
            </Alert>
          )}

          <Group justify="flex-end" mt="md">
            {onCancel && (
              <Button variant="subtle" onClick={onCancel} disabled={loading}>
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              loading={loading || uploadingReceipts}
              disabled={!formData.expense_category_id || !formData.amount || !formData.description}
            >
              {needsApproval ? 'Submit for Approval' : 'Save as Draft'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Card>
  );
};

