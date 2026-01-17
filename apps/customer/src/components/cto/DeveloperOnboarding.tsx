import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Space, Badge, Tag, Typography, message, Checkbox, Progress, Steps } from 'antd';
import { PlusOutlined, CheckCircleOutlined, UserOutlined, RocketOutlined, FileTextOutlined, CodeOutlined } from '@ant-design/icons';
import { supabase } from '@/integrations/supabase/client';
import { useDeveloperOnboarding } from '@/hooks/useTechSupport';
import type { DeveloperOnboarding as DeveloperOnboardingType } from '@/types/tech-support';

const { TextArea } = Input;
const { Title, Text } = Typography;
const { Step } = Steps;

export default function DeveloperOnboarding() {
  const [onboarding, setOnboarding] = useState<DeveloperOnboardingType[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingOnboarding, setEditingOnboarding] = useState<DeveloperOnboardingType | null>(null);
  const [form] = Form.useForm();
  const { onboarding: fetchedOnboarding, loading: onboardingLoading, refetch } = useDeveloperOnboarding();
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    setOnboarding(fetchedOnboarding);
    fetchUsers();
  }, [fetchedOnboarding]);

  const fetchUsers = async () => {
    try {
      // Fetch from exec_users table
      const { data: execUsers, error: execError } = await supabase
        .from('exec_users')
        .select('user_id, email')
        .limit(100);
      
      if (!execError && execUsers) {
        setUsers(execUsers.map((eu: any) => ({
          id: eu.user_id,
          email: eu.email || 'Unknown',
        })));
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleCreate = () => {
    setEditingOnboarding(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (onboardingItem: DeveloperOnboardingType) => {
    setEditingOnboarding(onboardingItem);
    form.setFieldsValue(onboardingItem);
    setModalVisible(true);
  };

  const handleSave = async (values: any) => {
    try {
      if (editingOnboarding) {
        const { error } = await supabase
          .from('developer_onboarding')
          .update({
            ...values,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingOnboarding.id);

        if (error) throw error;
        message.success('Onboarding updated successfully');
      } else {
        const { error } = await supabase.from('developer_onboarding').insert({
          ...values,
          onboarding_status: 'pending',
          started_at: new Date().toISOString(),
        });

        if (error) throw error;
        message.success('Onboarding created successfully');
      }
      setModalVisible(false);
      refetch();
    } catch (error: any) {
      message.error(error.message || 'Failed to save onboarding');
    }
  };

  const handleStatusChange = async (onboardingId: string, newStatus: string) => {
    try {
      const updateData: any = { onboarding_status: newStatus };
      if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('developer_onboarding')
        .update(updateData)
        .eq('id', onboardingId);

      if (error) throw error;
      message.success('Onboarding status updated');
      refetch();
    } catch (error: any) {
      message.error(error.message || 'Failed to update status');
    }
  };

  const handleCheckboxChange = async (onboardingId: string, field: string, value: boolean) => {
    try {
      const { error } = await supabase
        .from('developer_onboarding')
        .update({ [field]: value })
        .eq('id', onboardingId);

      if (error) throw error;
      refetch();
    } catch (error: any) {
      message.error(error.message || 'Failed to update');
    }
  };

  const calculateProgress = (item: DeveloperOnboardingType) => {
    const steps = [
      item.github_access_granted,
      item.supabase_access_granted,
      item.dev_environment_setup,
      item.documentation_reviewed,
      item.first_code_review_completed,
    ];
    const completed = steps.filter(Boolean).length;
    return (completed / steps.length) * 100;
  };

  const statusColors: Record<string, string> = {
    pending: 'default',
    in_progress: 'processing',
    completed: 'success',
    blocked: 'error',
  };

  const columns = [
    {
      title: 'Developer',
      dataIndex: ['developer', 'email'],
      key: 'developer',
      width: 200,
    },
    {
      title: 'Status',
      dataIndex: 'onboarding_status',
      key: 'onboarding_status',
      width: 120,
      render: (status: string) => <Badge status={statusColors[status] as any} text={status} />,
    },
    {
      title: 'Progress',
      key: 'progress',
      width: 150,
      render: (_: any, record: DeveloperOnboardingType) => (
        <Progress percent={calculateProgress(record)} size="small" />
      ),
    },
    {
      title: 'Mentor',
      dataIndex: ['mentor', 'email'],
      key: 'mentor',
      width: 150,
      render: (email: string) => email || <Text type="secondary">Not assigned</Text>,
    },
    {
      title: 'Started',
      dataIndex: 'started_at',
      key: 'started_at',
      width: 120,
      render: (date: string) => date ? new Date(date).toLocaleDateString() : '-',
    },
    {
      title: 'Completed',
      dataIndex: 'completed_at',
      key: 'completed_at',
      width: 120,
      render: (date: string) => date ? new Date(date).toLocaleDateString() : '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_: any, record: DeveloperOnboardingType) => (
        <Space>
          <Button size="small" onClick={() => handleEdit(record)}>
            Edit
          </Button>
          <Select
            size="small"
            style={{ width: 120 }}
            value={record.onboarding_status}
            onChange={(value) => handleStatusChange(record.id, value)}
          >
            <Select.Option value="pending">Pending</Select.Option>
            <Select.Option value="in_progress">In Progress</Select.Option>
            <Select.Option value="completed">Completed</Select.Option>
            <Select.Option value="blocked">Blocked</Select.Option>
          </Select>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <Title level={4} className="m-0">Developer Onboarding</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          Add Developer
        </Button>
      </div>

      <Table
        loading={onboardingLoading}
        dataSource={onboarding}
        rowKey="id"
        columns={columns}
        pagination={{ pageSize: 20 }}
        expandable={{
          expandedRowRender: (record) => (
            <Card size="small">
              <Steps
                current={calculateProgress(record) / 20}
                direction="vertical"
                size="small"
              >
                <Step
                  title="GitHub Access Granted"
                  status={record.github_access_granted ? 'finish' : 'wait'}
                  icon={<CodeOutlined />}
                />
                <Step
                  title="Supabase Access Granted"
                  status={record.supabase_access_granted ? 'finish' : 'wait'}
                  icon={<RocketOutlined />}
                />
                <Step
                  title="Dev Environment Setup"
                  status={record.dev_environment_setup ? 'finish' : 'wait'}
                  icon={<RocketOutlined />}
                />
                <Step
                  title="Documentation Reviewed"
                  status={record.documentation_reviewed ? 'finish' : 'wait'}
                  icon={<FileTextOutlined />}
                />
                <Step
                  title="First Code Review Completed"
                  status={record.first_code_review_completed ? 'finish' : 'wait'}
                  icon={<CheckCircleOutlined />}
                />
              </Steps>
              <div className="mt-4">
                <Space direction="vertical">
                  <Checkbox
                    checked={record.github_access_granted}
                    onChange={(e) => handleCheckboxChange(record.id, 'github_access_granted', e.target.checked)}
                  >
                    GitHub Access Granted
                  </Checkbox>
                  <Checkbox
                    checked={record.supabase_access_granted}
                    onChange={(e) => handleCheckboxChange(record.id, 'supabase_access_granted', e.target.checked)}
                  >
                    Supabase Access Granted
                  </Checkbox>
                  <Checkbox
                    checked={record.dev_environment_setup}
                    onChange={(e) => handleCheckboxChange(record.id, 'dev_environment_setup', e.target.checked)}
                  >
                    Dev Environment Setup
                  </Checkbox>
                  <Checkbox
                    checked={record.documentation_reviewed}
                    onChange={(e) => handleCheckboxChange(record.id, 'documentation_reviewed', e.target.checked)}
                  >
                    Documentation Reviewed
                  </Checkbox>
                  <Checkbox
                    checked={record.first_code_review_completed}
                    onChange={(e) => handleCheckboxChange(record.id, 'first_code_review_completed', e.target.checked)}
                  >
                    First Code Review Completed
                  </Checkbox>
                </Space>
                {record.onboarding_notes && (
                  <div className="mt-4">
                    <Text strong>Notes:</Text>
                    <div className="mt-2 p-2 bg-gray-50 rounded">
                      <Text>{record.onboarding_notes}</Text>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ),
        }}
      />

      {/* Create/Edit Modal */}
      <Modal
        title={editingOnboarding ? 'Edit Developer Onboarding' : 'Add Developer to Onboarding'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={600}
      >
        <Form form={form} onFinish={handleSave} layout="vertical">
          <Form.Item name="developer_id" label="Developer" rules={[{ required: true }]}>
            <Select placeholder="Select developer" showSearch>
              {users.map(user => (
                <Select.Option key={user.id} value={user.id}>
                  {user.email}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="assigned_mentor_id" label="Assigned Mentor">
            <Select placeholder="Select mentor" allowClear showSearch>
              {users.map(user => (
                <Select.Option key={user.id} value={user.id}>
                  {user.email}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="onboarding_notes" label="Notes">
            <TextArea rows={4} placeholder="Additional onboarding notes..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

