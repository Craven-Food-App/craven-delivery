import React, { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import {
  Container,
  Card,
  Tabs,
  Table,
  Button,
  Modal,
  TextInput,
  Select,
  Textarea,
  Badge,
  Group,
  Text,
  Stack,
  Title,
  ActionIcon,
  Switch,
  Divider,
  Alert,
  Grid,
  Paper,
  ScrollArea,
  Tooltip,
  Menu,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconEdit,
  IconTrash,
  IconPlus,
  IconCopy,
  IconEye,
  IconDeviceFloppy,
  IconFileText,
  IconMail,
  IconCheck,
  IconX,
  IconDownload,
  IconSettings,
  IconDots,
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import dayjs from 'dayjs';
import { seedTemplatesFromUI } from '@/utils/seedTemplatesFromCode';
import { seedEmailTemplatesFromUI } from '@/utils/seedEmailTemplatesFromCode';
import { clearAllDocumentTemplates, verifyRequiredTemplates } from '@/utils/clearDocumentTemplates';
import { fixTemplatePlaceholdersFromUI } from '@/utils/fixTemplatePlaceholders';
import { seedFortune500TemplatesFromUI } from '@/utils/seedFortune500Templates';
import { VisualTemplateEditor } from './VisualTemplateEditor';
import { SignatureFieldEditor } from './SignatureFieldEditor';

interface EmailTemplate {
  id: string;
  name: string;
  template_key: string;
  category: string;
  subject: string;
  html_content: string;
  variables: string[];
  is_active: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
}

interface DocumentTemplate {
  id: string;
  template_key: string;
  name: string;
  category: string;
  html_content: string;
  placeholders: string[];
  is_active: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
}

interface TemplateUsage {
  id: string;
  template_type: 'email' | 'document';
  template_id: string;
  usage_context: string;
  is_default: boolean;
}

const EMAIL_USAGE_CONTEXTS = [
  { value: 'executive_document_email', label: 'Executive Document Email' },
  { value: 'welcome_executive', label: 'Welcome Executive' },
  { value: 'appointment_notification', label: 'Appointment Notification' },
  { value: 'document_reminder', label: 'Document Reminder' },
];

const DOCUMENT_USAGE_CONTEXTS = [
  { value: 'employment_agreement', label: 'Employment Agreement' },
  { value: 'board_resolution', label: 'Board Resolution' },
  { value: 'pre_incorporation_consent', label: 'Pre-Incorporation Consent' },
  { value: 'founders_agreement', label: "Founders' Agreement" },
  { value: 'shareholders_agreement', label: "Shareholders' Agreement" },
  { value: 'stock_issuance', label: 'Stock Issuance' },
  { value: 'confidentiality_ip', label: 'Confidentiality & IP' },
  { value: 'deferred_comp_addendum', label: 'Deferred Compensation' },
  { value: 'offer_letter', label: 'Offer Letter' },
  { value: 'bylaws_officers_excerpt', label: 'Bylaws Excerpt' },
  { value: 'irs_83b', label: 'IRS Form 83(b)' },
];

const EMAIL_CATEGORIES = ['executive', 'employee', 'customer', 'driver', 'general'];
const DOCUMENT_CATEGORIES = ['executive', 'employee', 'legal', 'financial', 'governance', 'general'];

export const TemplateManager: React.FC = () => {
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [documentTemplates, setDocumentTemplates] = useState<DocumentTemplate[]>([]);
  const [templateUsage, setTemplateUsage] = useState<TemplateUsage[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('email');

  // Modal states
  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [documentModalVisible, setDocumentModalVisible] = useState(false);
  const [usageModalVisible, setUsageModalVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [signatureEditorTemplate, setSignatureEditorTemplate] = useState<DocumentTemplate | null>(null);

  // Form states
  const [editingEmailTemplate, setEditingEmailTemplate] = useState<EmailTemplate | null>(null);
  const [editingDocumentTemplate, setEditingDocumentTemplate] = useState<DocumentTemplate | null>(null);
  const [previewContent, setPreviewContent] = useState<string>('');

  // Email form
  const [emailForm, setEmailForm] = useState({
    name: '',
    template_key: '',
    category: 'executive',
    subject: '',
    html_content: '',
    variables: [] as string[],
    is_active: true,
    description: '',
  });

  // Document form
  const [documentForm, setDocumentForm] = useState({
    template_key: '',
    name: '',
    category: 'executive',
    html_content: '',
    placeholders: [] as string[],
    is_active: true,
    description: '',
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const [emailData, docData, usageData] = await Promise.all([
        supabase.from('email_templates').select('*').order('created_at', { ascending: false }),
        supabase.from('document_templates').select('*').order('created_at', { ascending: false }),
        supabase.from('template_usage').select('*'),
      ]);

      if (emailData.data) {
        setEmailTemplates(emailData.data.map(t => ({
          ...t,
          variables: (Array.isArray(t.variables) ? t.variables : []).map(v => String(v))
        })));
      }
      if (docData.data) {
        setDocumentTemplates(docData.data.map(t => ({
          ...t,
          placeholders: (Array.isArray(t.placeholders) ? t.placeholders : []).map(p => String(p))
        })));
      }
      if (usageData.data) {
        setTemplateUsage(usageData.data.map(t => ({
          ...t,
          template_type: (t.template_type === 'email' || t.template_type === 'document') 
            ? t.template_type 
            : 'document'
        })));
      }
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to fetch templates',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEmailTemplate = () => {
    setEditingEmailTemplate(null);
    setEmailForm({
      name: '',
      template_key: '',
      category: 'executive',
      subject: '',
      html_content: '',
      variables: [],
      is_active: true,
      description: '',
    });
    setEmailModalVisible(true);
  };

  const handleCreateDocumentTemplate = () => {
    setEditingDocumentTemplate(null);
    setDocumentForm({
      template_key: '',
      name: '',
      category: 'executive',
      html_content: '',
      placeholders: [],
      is_active: true,
      description: '',
    });
    setDocumentModalVisible(true);
  };

  const handleEditEmailTemplate = (template: EmailTemplate) => {
    setEditingEmailTemplate(template);
    setEmailForm({
      name: template.name,
      template_key: template.template_key,
      category: template.category,
      subject: template.subject,
      html_content: template.html_content,
      variables: template.variables || [],
      is_active: template.is_active,
      description: template.description || '',
    });
    setEmailModalVisible(true);
  };

  const handleEditDocumentTemplate = (template: DocumentTemplate) => {
    setEditingDocumentTemplate(template);
    setDocumentForm({
      template_key: template.template_key,
      name: template.name,
      category: template.category,
      html_content: template.html_content,
      placeholders: Array.isArray(template.placeholders) ? template.placeholders : [],
      is_active: template.is_active,
      description: template.description || '',
    });
    setDocumentModalVisible(true);
  };

  const handleSaveEmailTemplate = async () => {
    if (!emailForm.name || !emailForm.template_key || !emailForm.subject || !emailForm.html_content) {
      notifications.show({
        title: 'Validation Error',
        message: 'Please fill in all required fields',
        color: 'red',
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const templateData = {
        ...emailForm,
        variables: emailForm.variables,
      };

      if (editingEmailTemplate) {
        const { error } = await supabase
          .from('email_templates')
          .update(templateData)
          .eq('id', editingEmailTemplate.id);

        if (error) throw error;
        notifications.show({
          title: 'Success',
          message: 'Email template updated successfully',
          color: 'green',
        });
      } else {
        const { error } = await supabase.from('email_templates').insert({
          ...templateData,
          created_by: user.id,
        });

        if (error) throw error;
        notifications.show({
          title: 'Success',
          message: 'Email template created successfully',
          color: 'green',
        });
      }

      setEmailModalVisible(false);
      await fetchTemplates();
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to save email template',
        color: 'red',
      });
    }
  };

  const handleSaveDocumentTemplate = async () => {
    if (!documentForm.name || !documentForm.template_key || !documentForm.html_content) {
      notifications.show({
        title: 'Validation Error',
        message: 'Please fill in all required fields',
        color: 'red',
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const templateData = {
        ...documentForm,
        placeholders: documentForm.placeholders,
      };

      if (editingDocumentTemplate) {
        const { error } = await supabase
          .from('document_templates')
          .update(templateData)
          .eq('id', editingDocumentTemplate.id);

        if (error) throw error;
        notifications.show({
          title: 'Success',
          message: 'Document template updated successfully',
          color: 'green',
        });
      } else {
        const { error } = await supabase.from('document_templates').insert({
          ...templateData,
          created_by: user.id,
        });

        if (error) throw error;
        notifications.show({
          title: 'Success',
          message: 'Document template created successfully',
          color: 'green',
        });
      }

      setDocumentModalVisible(false);
      await fetchTemplates();
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to save document template',
        color: 'red',
      });
    }
  };

  const handleDeleteEmailTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this email template?')) return;

    try {
      const { error } = await supabase.from('email_templates').delete().eq('id', id);
      if (error) throw error;

      notifications.show({
        title: 'Success',
        message: 'Email template deleted successfully',
        color: 'green',
      });
      await fetchTemplates();
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to delete email template',
        color: 'red',
      });
    }
  };

  const handleDeleteDocumentTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document template?')) return;

    try {
      const { error } = await supabase.from('document_templates').delete().eq('id', id);
      if (error) throw error;

      notifications.show({
        title: 'Success',
        message: 'Document template deleted successfully',
        color: 'green',
      });
      await fetchTemplates();
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to delete document template',
        color: 'red',
      });
    }
  };

  const handlePreview = (content: string, templateKey: string) => {
    setPreviewContent(content);
    setPreviewVisible(true);
  };

  const handleManageUsage = () => {
    setUsageModalVisible(true);
  };

  // Extract variables from HTML content
  const extractVariables = (html: string): string[] => {
    const matches = html.match(/\{\{(\w+)\}\}/g);
    if (!matches) return [];
    return [...new Set(matches.map((m) => m.replace(/[{}]/g, '')))];
  };

  // Update variables when HTML content changes
  useEffect(() => {
    if (emailForm.html_content) {
      const vars = extractVariables(emailForm.html_content);
      setEmailForm({ ...emailForm, variables: vars });
    }
  }, [emailForm.html_content]);

  useEffect(() => {
    if (documentForm.html_content) {
      const vars = extractVariables(documentForm.html_content);
      setDocumentForm({ ...documentForm, placeholders: vars });
    }
  }, [documentForm.html_content]);

  const emailRows = emailTemplates.map((template) => (
    <Table.Tr key={template.id}>
      <Table.Td>
        <Text fw={500}>{template.name}</Text>
        {template.description && (
          <Text size="xs" c="dimmed">
            {template.description}
          </Text>
        )}
      </Table.Td>
      <Table.Td>
        <Badge variant="light" color="blue">
          {template.template_key}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Badge variant="light">{template.category}</Badge>
      </Table.Td>
      <Table.Td>
        <Text size="sm" lineClamp={1}>
          {template.subject}
        </Text>
      </Table.Td>
      <Table.Td>
        <Group gap={4}>
          {template.variables?.slice(0, 3).map((v) => (
            <Badge key={v} size="xs" variant="outline">
              {`{{${v}}}`}
            </Badge>
          ))}
          {template.variables && template.variables.length > 3 && (
            <Text size="xs" c="dimmed">
              +{template.variables.length - 3} more
            </Text>
          )}
        </Group>
      </Table.Td>
      <Table.Td>
        <Badge color={template.is_active ? 'green' : 'gray'} variant="light">
          {template.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Text size="sm" c="dimmed">
          {dayjs(template.updated_at).format('MMM D, YYYY')}
        </Text>
      </Table.Td>
      <Table.Td>
        <Group gap="xs">
          <Tooltip label="Preview">
            <ActionIcon variant="subtle" color="blue" onClick={() => handlePreview(template.html_content, template.template_key)}>
              <IconEye size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Edit">
            <ActionIcon variant="subtle" color="orange" onClick={() => handleEditEmailTemplate(template)}>
              <IconEdit size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Delete">
            <ActionIcon variant="subtle" color="red" onClick={() => handleDeleteEmailTemplate(template.id)}>
              <IconTrash size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  const documentRows = documentTemplates.map((template) => (
    <Table.Tr key={template.id}>
      <Table.Td>
        <Text fw={500}>{template.name}</Text>
        {template.description && (
          <Text size="xs" c="dimmed">
            {template.description}
          </Text>
        )}
      </Table.Td>
      <Table.Td>
        <Badge variant="light" color="blue">
          {template.template_key}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Badge variant="light">{template.category}</Badge>
      </Table.Td>
      <Table.Td>
        <Group gap={4}>
          {template.placeholders?.slice(0, 3).map((p) => (
            <Badge key={p} size="xs" variant="outline">
              {`{{${p}}}`}
            </Badge>
          ))}
          {template.placeholders && template.placeholders.length > 3 && (
            <Text size="xs" c="dimmed">
              +{template.placeholders.length - 3} more
            </Text>
          )}
        </Group>
      </Table.Td>
      <Table.Td>
        <Badge color={template.is_active ? 'green' : 'gray'} variant="light">
          {template.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Text size="sm" c="dimmed">
          {dayjs(template.updated_at).format('MMM D, YYYY')}
        </Text>
      </Table.Td>
      <Table.Td>
        <Group gap="xs">
          <Tooltip label="Preview">
            <ActionIcon variant="subtle" color="blue" onClick={() => handlePreview(template.html_content, template.template_key)}>
              <IconEye size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Edit">
            <ActionIcon variant="subtle" color="orange" onClick={() => handleEditDocumentTemplate(template)}>
              <IconEdit size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Signature Fields">
            <ActionIcon variant="subtle" color="violet" onClick={() => setSignatureEditorTemplate(template)}>
              <IconSettings size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Delete">
            <ActionIcon variant="subtle" color="red" onClick={() => handleDeleteDocumentTemplate(template.id)}>
              <IconTrash size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Group justify="space-between" align="flex-start">
          <div>
            <Title order={1} c="dark" mb="xs">
              Template Manager
            </Title>
            <Text c="dimmed" size="lg">
              Manage email and document HTML templates
            </Text>
          </div>
          <Group>
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <Button leftSection={<IconDownload size={16} />} variant="light">
                  Import Templates
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item
                  leftSection={<IconFileText size={16} />}
                  onClick={async () => {
                    if (!confirm('Import document templates from code? Existing templates will be skipped.')) return;
                    const result = await seedTemplatesFromUI(false);
                    if (result.success) {
                      notifications.show({
                        title: 'Success',
                        message: result.message,
                        color: 'green',
                      });
                      await fetchTemplates();
                    } else {
                      notifications.show({
                        title: 'Error',
                        message: result.message,
                        color: 'red',
                      });
                    }
                  }}
                >
                  Import Document Templates
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconMail size={16} />}
                  onClick={async () => {
                    if (!confirm('Import email templates from code? Existing templates will be skipped.')) return;
                    const result = await seedEmailTemplatesFromUI(false);
                    if (result.success) {
                      notifications.show({
                        title: 'Success',
                        message: result.message,
                        color: 'green',
                      });
                      await fetchTemplates();
                    } else {
                      notifications.show({
                        title: 'Error',
                        message: result.message,
                        color: 'red',
                      });
                    }
                  }}
                >
                  Import Email Templates
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  leftSection={<IconFileText size={16} />}
                  onClick={async () => {
                    if (!confirm('Import Fortune 500 executive appointment templates? These will be rendered from server-side Handlebars templates.')) return;
                    const result = await seedFortune500TemplatesFromUI();
                    if (result.success) {
                      notifications.show({
                        title: 'Success',
                        message: result.message,
                        color: 'green',
                      });
                      await fetchTemplates();
                    } else {
                      notifications.show({
                        title: 'Error',
                        message: result.message,
                        color: 'red',
                      });
                    }
                  }}
                >
                  Import Fortune 500 Templates
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  leftSection={<IconDownload size={16} />}
                  color="red"
                  onClick={async () => {
                    if (!confirm('Overwrite ALL templates? This cannot be undone.')) return;
                    const [docResult, emailResult] = await Promise.all([
                      seedTemplatesFromUI(true),
                      seedEmailTemplatesFromUI(true),
                    ]);
                    if (docResult.success && emailResult.success) {
                      notifications.show({
                        title: 'Success',
                        message: 'All templates overwritten',
                        color: 'green',
                      });
                      await fetchTemplates();
                    } else {
                      notifications.show({
                        title: 'Error',
                        message: 'Some errors occurred during overwrite',
                        color: 'red',
                      });
                    }
                  }}
                >
                  Overwrite All Templates
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>

        {/* Tabs */}
        <Tabs value={activeTab} onChange={(value) => setActiveTab(value || 'email')}>
          <Tabs.List>
            <Tabs.Tab value="email" leftSection={<IconMail size={16} />}>
              Email Templates ({emailTemplates.length})
            </Tabs.Tab>
            <Tabs.Tab value="document" leftSection={<IconFileText size={16} />}>
              Document Templates ({documentTemplates.length})
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="email" pt="lg">
            <Card>
              <Group justify="space-between" mb="md">
                <Title order={3}>Email Templates</Title>
                <Button leftSection={<IconPlus size={16} />} onClick={handleCreateEmailTemplate}>
                  Create Email Template
                </Button>
              </Group>

              <ScrollArea>
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Name</Table.Th>
                      <Table.Th>Template Key</Table.Th>
                      <Table.Th>Category</Table.Th>
                      <Table.Th>Subject</Table.Th>
                      <Table.Th>Variables</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th>Updated</Table.Th>
                      <Table.Th>Actions</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {loading ? (
                      <Table.Tr>
                        <Table.Td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>
                          <Text c="dimmed">Loading...</Text>
                        </Table.Td>
                      </Table.Tr>
                    ) : emailRows.length === 0 ? (
                      <Table.Tr>
                        <Table.Td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>
                          <Text c="dimmed">No email templates found</Text>
                        </Table.Td>
                      </Table.Tr>
                    ) : (
                      emailRows
                    )}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            </Card>
          </Tabs.Panel>

          <Tabs.Panel value="document" pt="lg">
            <Card>
              <Group justify="space-between" mb="md">
                <Title order={3}>Document Templates</Title>
                <Group>
                  <Button
                    variant="light"
                    leftSection={<IconCheck size={16} />}
                    onClick={async () => {
                      if (!confirm('Fix placeholders in all document templates?')) return;
                      await fixTemplatePlaceholdersFromUI();
                      await fetchTemplates();
                    }}
                  >
                    Fix Placeholders
                  </Button>
                  <Button leftSection={<IconPlus size={16} />} onClick={handleCreateDocumentTemplate}>
                    Create Document Template
                  </Button>
                </Group>
              </Group>

              <ScrollArea>
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Name</Table.Th>
                      <Table.Th>Template Key</Table.Th>
                      <Table.Th>Category</Table.Th>
                      <Table.Th>Placeholders</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th>Updated</Table.Th>
                      <Table.Th>Actions</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {loading ? (
                      <Table.Tr>
                        <Table.Td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                          <Text c="dimmed">Loading...</Text>
                        </Table.Td>
                      </Table.Tr>
                    ) : documentRows.length === 0 ? (
                      <Table.Tr>
                        <Table.Td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                          <Text c="dimmed">No document templates found</Text>
                        </Table.Td>
                      </Table.Tr>
                    ) : (
                      documentRows
                    )}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            </Card>
          </Tabs.Panel>
        </Tabs>

        {/* Email Template Modal */}
        <Modal
          opened={emailModalVisible}
          onClose={() => setEmailModalVisible(false)}
          title={editingEmailTemplate ? 'Edit Email Template' : 'Create Email Template'}
          size="xl"
        >
          <Stack gap="md">
            <TextInput
              label="Template Name"
              placeholder="e.g., Executive Document Email"
              required
              value={emailForm.name}
              onChange={(e) => setEmailForm({ ...emailForm, name: e.target.value })}
            />

            <TextInput
              label="Template Key"
              placeholder="e.g., executive_document_email"
              required
              value={emailForm.template_key}
              onChange={(e) => setEmailForm({ ...emailForm, template_key: e.target.value })}
              disabled={!!editingEmailTemplate}
              description="Unique identifier (cannot be changed after creation)"
            />

            <Grid>
              <Grid.Col span={6}>
                <Select
                  label="Category"
                  data={EMAIL_CATEGORIES.map((cat) => ({ value: cat, label: cat.charAt(0).toUpperCase() + cat.slice(1) }))}
                  value={emailForm.category}
                  onChange={(value) => setEmailForm({ ...emailForm, category: value || 'executive' })}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <Switch
                  label="Active"
                  checked={emailForm.is_active}
                  onChange={(e) => setEmailForm({ ...emailForm, is_active: e.currentTarget.checked })}
                  mt="xl"
                />
              </Grid.Col>
            </Grid>

            <TextInput
              label="Subject"
              placeholder="Email subject line (use {{variables}} for dynamic content)"
              required
              value={emailForm.subject}
              onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
            />

            <div>
              <Group justify="space-between" mb="xs">
                <Text size="sm" fw={500}>
                  HTML Content
                </Text>
                {emailForm.variables.length > 0 && (
                  <Group gap={4}>
                    <Text size="xs" c="dimmed">
                      Variables:
                    </Text>
                    {emailForm.variables.map((v) => (
                      <Badge key={v} size="xs" variant="outline">
                        {`{{${v}}}`}
                      </Badge>
                    ))}
                  </Group>
                )}
              </Group>
              <Textarea
                placeholder="HTML email content..."
                required
                minRows={8}
                value={emailForm.html_content}
                onChange={(e) => setEmailForm({ ...emailForm, html_content: e.target.value })}
              />
            </div>

            <Textarea
              label="Description"
              placeholder="Optional description"
              value={emailForm.description}
              onChange={(e) => setEmailForm({ ...emailForm, description: e.target.value })}
              minRows={2}
            />

            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={() => setEmailModalVisible(false)}>
                Cancel
              </Button>
              <Button variant="light" leftSection={<IconEye size={16} />} onClick={() => handlePreview(emailForm.html_content, emailForm.template_key)}>
                Preview
              </Button>
              <Button leftSection={<IconDeviceFloppy size={16} />} onClick={handleSaveEmailTemplate}>
                Save
              </Button>
            </Group>
          </Stack>
        </Modal>

        {/* Document Template Modal */}
        <Modal
          opened={documentModalVisible}
          onClose={() => setDocumentModalVisible(false)}
          title={editingDocumentTemplate ? 'Edit Document Template' : 'Create Document Template'}
          size="xl"
        >
          <Stack gap="md">
            <TextInput
              label="Template Name"
              placeholder="e.g., Executive Appointment Letter"
              required
              value={documentForm.name}
              onChange={(e) => setDocumentForm({ ...documentForm, name: e.target.value })}
            />

            <TextInput
              label="Template Key"
              placeholder="e.g., offer_letter"
              required
              value={documentForm.template_key}
              onChange={(e) => setDocumentForm({ ...documentForm, template_key: e.target.value })}
              disabled={!!editingDocumentTemplate}
              description="Unique identifier (cannot be changed after creation)"
            />

            <Grid>
              <Grid.Col span={6}>
                <Select
                  label="Category"
                  data={DOCUMENT_CATEGORIES.map((cat) => ({ value: cat, label: cat.charAt(0).toUpperCase() + cat.slice(1) }))}
                  value={documentForm.category}
                  onChange={(value) => setDocumentForm({ ...documentForm, category: value || 'executive' })}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <Switch
                  label="Active"
                  checked={documentForm.is_active}
                  onChange={(e) => setDocumentForm({ ...documentForm, is_active: e.currentTarget.checked })}
                  mt="xl"
                />
              </Grid.Col>
            </Grid>

            <div>
              <Group justify="space-between" mb="xs">
                <Text size="sm" fw={500}>
                  HTML Content
                </Text>
                {documentForm.placeholders.length > 0 && (
                  <Group gap={4}>
                    <Text size="xs" c="dimmed">
                      Placeholders:
                    </Text>
                    {documentForm.placeholders.map((p) => (
                      <Badge key={p} size="xs" variant="outline">
                        {`{{${p}}}`}
                      </Badge>
                    ))}
                  </Group>
                )}
              </Group>
              <Textarea
                placeholder="HTML document content..."
                required
                minRows={12}
                value={documentForm.html_content}
                onChange={(e) => setDocumentForm({ ...documentForm, html_content: e.target.value })}
              />
            </div>

            <Textarea
              label="Description"
              placeholder="Optional description"
              value={documentForm.description}
              onChange={(e) => setDocumentForm({ ...documentForm, description: e.target.value })}
              minRows={2}
            />

            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={() => setDocumentModalVisible(false)}>
                Cancel
              </Button>
              <Button variant="light" leftSection={<IconEye size={16} />} onClick={() => handlePreview(documentForm.html_content, documentForm.template_key)}>
                Preview
              </Button>
              <Button leftSection={<IconDeviceFloppy size={16} />} onClick={handleSaveDocumentTemplate}>
                Save
              </Button>
            </Group>
          </Stack>
        </Modal>

        {/* Preview Modal */}
        <Modal opened={previewVisible} onClose={() => setPreviewVisible(false)} title="Template Preview" size="xl">
          <Paper p="md" withBorder>
            <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(previewContent) }} />
          </Paper>
        </Modal>

        {/* Signature Field Editor Modal */}
        {signatureEditorTemplate && (
          <Modal
            opened={!!signatureEditorTemplate}
            onClose={() => setSignatureEditorTemplate(null)}
            title="Signature Field Editor"
            size="xl"
          >
            <SignatureFieldEditor
              templateId={signatureEditorTemplate.id}
              templateName={signatureEditorTemplate.name}
              htmlContent={signatureEditorTemplate.html_content}
              visible={true}
              onClose={(refresh) => {
                if (refresh) fetchTemplates();
                setSignatureEditorTemplate(null);
              }}
            />
          </Modal>
        )}
      </Stack>
    </Container>
  );
};

