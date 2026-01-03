// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  Card, Table, Button, Tag, Space, Checkbox, Input, message,
  Modal, Form, Select, Typography, Alert
} from 'antd';
import { KeyOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { supabase } from '@/integrations/supabase/client';
import { getDefaultAccessSystems } from '@/utils/exitWorkflowUtils';
import { isCLevelPosition } from '@/utils/roleUtils';
import dayjs from 'dayjs';

const { Text, Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface Props {
  workflowId: string;
  employeeId: string;
  onUpdate: () => void;
}

interface AccessRevocation {
  id: string;
  system_name: string;
  access_type: string;
  revoked: boolean;
  revoked_at?: string;
  revoked_by?: string;
  email_forward_to?: string;
  notes?: string;
}

export const AccessRevocationStep: React.FC<Props> = ({
  workflowId,
  employeeId,
  onUpdate
}) => {
  const [accessSystems, setAccessSystems] = useState<AccessRevocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [employee, setEmployee] = useState<any>(null);
  const [isRevokeModalVisible, setIsRevokeModalVisible] = useState(false);
  const [selectedSystem, setSelectedSystem] = useState<AccessRevocation | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchEmployee();
    fetchAccessSystems();
  }, [employeeId, workflowId]);

  const fetchEmployee = async () => {
    const { data } = await supabase
      .from('employees')
      .select('position')
      .eq('id', employeeId)
      .single();
    
    if (data) setEmployee(data);
  };

  const fetchAccessSystems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('exit_access_revocations')
        .select('*')
        .eq('workflow_id', workflowId)
        .order('created_at');

      if (error) throw error;

      // If no systems exist, create default ones
      if (!data || data.length === 0) {
        const isExecutive = employee ? isCLevelPosition(employee.position) : false;
        const defaultSystems = getDefaultAccessSystems(isExecutive);
        
        const systemsToCreate = defaultSystems.map(sys => ({
          workflow_id: workflowId,
          system_name: sys.system,
          access_type: sys.access_type,
          revoked: false,
        }));

        const { data: created, error: createError } = await supabase
          .from('exit_access_revocations')
          .insert(systemsToCreate)
          .select();

        if (createError) throw createError;
        setAccessSystems(created || []);
      } else {
        setAccessSystems(data);
      }
    } catch (error: any) {
      message.error('Failed to fetch access systems');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeAccess = async (system: AccessRevocation) => {
    setSelectedSystem(system);
    form.setFieldsValue({
      email_forward_to: system.email_forward_to || '',
      notes: system.notes || '',
    });
    setIsRevokeModalVisible(true);
  };

  const handleRevokeSubmit = async (values: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('exit_access_revocations')
        .update({
          revoked: true,
          revoked_at: new Date().toISOString(),
          revoked_by: user.id,
          email_forward_to: values.email_forward_to,
          notes: values.notes,
        })
        .eq('id', selectedSystem?.id);

      if (error) throw error;

      // Update workflow step status
      await supabase
        .from('exit_workflow_steps')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: user.id,
        })
        .eq('workflow_id', workflowId)
        .eq('step_name', 'revoke_access');

      // Check if all systems are revoked
      const { data: allSystems } = await supabase
        .from('exit_access_revocations')
        .select('revoked')
        .eq('workflow_id', workflowId);

      const allRevoked = allSystems?.every(s => s.revoked);
      if (allRevoked) {
        await supabase
          .from('exit_workflows')
          .update({ 
            status: 'access_revoked',
            access_revoked_at: new Date().toISOString(),
            access_revoked_by: user.id,
          })
          .eq('id', workflowId);
      }

      message.success('Access revoked successfully');
      setIsRevokeModalVisible(false);
      form.resetFields();
      fetchAccessSystems();
      onUpdate();
    } catch (error: any) {
      message.error(error.message || 'Failed to revoke access');
      console.error(error);
    }
  };

  const columns = [
    {
      title: 'System',
      dataIndex: 'system_name',
      key: 'system_name',
      render: (name: string) => (
        <Space>
          <KeyOutlined />
          <Text strong>{name.replace('_', ' ').toUpperCase()}</Text>
        </Space>
      ),
    },
    {
      title: 'Access Type',
      dataIndex: 'access_type',
      key: 'access_type',
      render: (type: string) => <Tag>{type.toUpperCase()}</Tag>,
    },
    {
      title: 'Status',
      key: 'revoked',
      render: (_: any, record: AccessRevocation) => (
        record.revoked ? (
          <Tag color="green" icon={<CheckCircleOutlined />}>Revoked</Tag>
        ) : (
          <Tag color="orange" icon={<CloseCircleOutlined />}>Pending</Tag>
        )
      ),
    },
    {
      title: 'Revoked At',
      dataIndex: 'revoked_at',
      key: 'revoked_at',
      render: (date: string) => date ? dayjs(date).format('MMM DD, YYYY h:mm A') : '-',
    },
    {
      title: 'Email Forward To',
      dataIndex: 'email_forward_to',
      key: 'email_forward_to',
      render: (email: string) => email || '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: AccessRevocation) => (
        !record.revoked ? (
          <Button
            size="small"
            type="primary"
            onClick={() => handleRevokeAccess(record)}
          >
            Revoke Access
          </Button>
        ) : (
          <Text type="secondary">Completed</Text>
        )
      ),
    },
  ];

  return (
    <div>
      <Alert
        message="Access Revocation"
        description="Revoke system access for the employee. Email accounts can be forwarded to a designated recipient for 30 days before being disabled."
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Card>
        <Table
          columns={columns}
          dataSource={accessSystems}
          loading={loading}
          rowKey="id"
          pagination={false}
        />
      </Card>

      <Modal
        title={`Revoke Access - ${selectedSystem?.system_name.toUpperCase()}`}
        open={isRevokeModalVisible}
        onCancel={() => {
          setIsRevokeModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        okText="Revoke Access"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleRevokeSubmit}
        >
          {selectedSystem?.system_name === 'email' && (
            <Form.Item
              name="email_forward_to"
              label="Forward Email To"
              rules={[{ type: 'email', message: 'Please enter a valid email' }]}
            >
              <Input placeholder="manager@company.com" />
            </Form.Item>
          )}

          <Form.Item
            name="notes"
            label="Notes"
          >
            <TextArea rows={3} placeholder="Add any notes about this access revocation..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};










