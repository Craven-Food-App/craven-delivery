import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
  Switch,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  SaveOutlined,
  CheckCircleOutlined,
  PushpinOutlined,
} from '@ant-design/icons';
import { supabase } from '@/integrations/supabase/client';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Text } = Typography;

interface IBOETemplate {
  id: string;
  template_key: string;
  name: string;
  category: string;
  html_content: string;
  description?: string | null;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface TemplateFormValues {
  template_key: string;
  name: string;
  category: string;
  html_content: string;
  description?: string;
  is_active: boolean;
  is_default: boolean;
}

export const IBOETemplateManager: React.FC = () => {
  const [templates, setTemplates] = useState<IBOETemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<IBOETemplate | null>(null);
  const [form] = Form.useForm<TemplateFormValues>();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('iboe_templates')
        .select('*')
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      console.error('Failed to load IBOE templates:', error);
      message.error('Unable to load IBOE templates.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingTemplate(null);
    form.setFieldsValue({
      template_key: '',
      name: '',
      category: 'iboe',
      html_content: '<!-- IBOE HTML goes here -->',
      description: '',
      is_active: true,
      is_default: templates.length === 0,
    });
    setModalVisible(true);
  };

  const handleEdit = (template: IBOETemplate) => {
    setEditingTemplate(template);
    form.setFieldsValue({
      template_key: template.template_key,
      name: template.name,
      category: template.category,
      html_content: template.html_content,
      description: template.description || '',
      is_active: template.is_active,
      is_default: template.is_default,
    });
    setModalVisible(true);
  };

  const handleDelete = (template: IBOETemplate) => {
    Modal.confirm({
      title: `Delete IBOE Template "${template.name}"?`,
      content: 'This action cannot be undone.',
      okType: 'danger',
      onOk: async () => {
        try {
          const { error } = await supabase.from('iboe_templates').delete().eq('id', template.id);
          if (error) throw error;
          message.success('Template deleted.');
          await fetchTemplates();
        } catch (error: any) {
          console.error('Failed to delete template:', error);
          message.error(error.message || 'Failed to delete template.');
        }
      },
    });
  };

  const resetDefaultTemplate = async () => {
    const { error } = await supabase.from('iboe_templates').update({ is_default: false }).eq('is_default', true);
    if (error) throw error;
  };

  const handleSetDefault = async (template: IBOETemplate) => {
    try {
      await resetDefaultTemplate();
      const { error } = await supabase
        .from('iboe_templates')
        .update({ is_default: true, is_active: true })
        .eq('id', template.id);
      if (error) throw error;
      message.success(`"${template.name}" set as default IBOE template.`);
      await fetchTemplates();
    } catch (error: any) {
      console.error('Failed to set default IBOE template:', error);
      message.error(error.message || 'Failed to set default template.');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (values.is_default) {
        await resetDefaultTemplate();
      }

      if (editingTemplate) {
        const { error } = await supabase
          .from('iboe_templates')
          .update({
            template_key: values.template_key,
            name: values.name,
            category: values.category,
            html_content: values.html_content,
            description: values.description,
            is_active: values.is_active,
            is_default: values.is_default,
          })
          .eq('id', editingTemplate.id);
        if (error) throw error;
        message.success('Template updated successfully.');
      } else {
        const { error } = await supabase.from('iboe_templates').insert({
          template_key: values.template_key,
          name: values.name,
          category: values.category,
          html_content: values.html_content,
          description: values.description,
          is_active: values.is_active,
          is_default: values.is_default,
          created_by: user.id,
        });
        if (error) throw error;
        message.success('Template created successfully.');
      }

      setModalVisible(false);
      await fetchTemplates();
    } catch (error: any) {
      if (error?.message) {
        message.error(error.message);
      } else {
        message.error('Please fix validation errors.');
      }
    }
  };

  const previewTemplate = (html: string) => {
    setPreviewContent(html);
    setPreviewVisible(true);
  };

  const columns = useMemo(
    () => [
      {
        title: 'Name',
        dataIndex: 'name',
        key: 'name',
        render: (_: any, record: IBOETemplate) => (
          <Space>
            <Text strong>{record.name}</Text>
            {record.is_default && <Tag color="blue" icon={<CheckCircleOutlined />}>Default</Tag>}
            {!record.is_active && <Tag color="red">Inactive</Tag>}
          </Space>
        ),
      },
      {
        title: 'Template Key',
        dataIndex: 'template_key',
        key: 'template_key',
        render: (value: string) => <Text code>{value}</Text>,
      },
      {
        title: 'Updated',
        dataIndex: 'updated_at',
        key: 'updated_at',
        render: (value: string) => dayjs(value).format('MMM D, YYYY HH:mm'),
      },
      {
        title: 'Actions',
        key: 'actions',
        render: (_: any, record: IBOETemplate) => (
          <Space>
            <Tooltip title="Preview">
              <Button icon={<EyeOutlined />} onClick={() => previewTemplate(record.html_content)} />
            </Tooltip>
            <Tooltip title="Edit">
              <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} />
            </Tooltip>
            <Tooltip title="Set Default">
              <Button
                icon={<PushpinOutlined />}
                type={record.is_default ? 'primary' : 'default'}
                onClick={() => handleSetDefault(record)}
              />
            </Tooltip>
            <Tooltip title="Delete">
              <Button danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)} />
            </Tooltip>
          </Space>
        ),
      },
    ],
    [templates],
  );

  return (
    <Card title="IBOE Template Manager" bordered={false} className="shadow-lg">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Alert
          showIcon
          type="info"
          message="International Bill of Exchange Templates"
          description="Create reusable layouts for IBOEs. Mark one template as default so the composer pulls it automatically."
        />

        <Space wrap>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            New IBOE Template
          </Button>
          <Button icon={<SaveOutlined />} onClick={fetchTemplates}>
            Refresh
          </Button>
          <Badge count={templates.filter((t) => t.is_active).length} overflowCount={99} showZero>
            <span className="text-slate-600">Active templates</span>
          </Badge>
        </Space>

        <Table<IBOETemplate>
          rowKey="id"
          loading={loading}
          dataSource={templates}
          columns={columns}
          pagination={{ pageSize: 8 }}
        />
      </Space>

      <Modal
        title={editingTemplate ? `Edit Template – ${editingTemplate.name}` : 'Create IBOE Template'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        width={800}
        okText="Save"
        onOk={handleModalOk}
      >
        <Form<TemplateFormValues> form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Template Name"
            rules={[{ required: true, message: 'Template name is required' }]}
          >
            <Input placeholder="Cross-Border Standard IBOE" />
          </Form.Item>

          <Form.Item
            name="template_key"
            label="Template Key"
            rules={[
              { required: true, message: 'Template key is required' },
              { pattern: /^[a-z0-9-_]+$/, message: 'Use lowercase letters, numbers, hyphen, or underscore.' },
            ]}
          >
            <Input placeholder="iboe-standard" />
          </Form.Item>

          <Form.Item name="category" label="Category">
            <Input placeholder="iboe" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <TextArea rows={2} placeholder="Internal notes about usage or terms." />
          </Form.Item>

          <Form.Item
            name="html_content"
            label="HTML Content"
            rules={[{ required: true, message: 'HTML content is required' }]}
          >
            <TextArea rows={12} spellCheck={false} />
          </Form.Item>

          <Space size="large">
            <Form.Item name="is_active" label="Active" valuePropName="checked">
              <Switch
                checkedChildren="Active"
                unCheckedChildren="Inactive"
              />
            </Form.Item>

            <Form.Item name="is_default" label="Default" valuePropName="checked">
              <Switch
                checkedChildren="Default"
                unCheckedChildren="Secondary"
              />
            </Form.Item>
          </Space>
        </Form>
      </Modal>

      <Modal
        title="Preview IBOE Template"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        width={900}
        footer={null}
      >
        <div className="border rounded-md p-4" dangerouslySetInnerHTML={{ __html: previewContent }} />
      </Modal>
    </Card>
  );
};

export default IBOETemplateManager;

