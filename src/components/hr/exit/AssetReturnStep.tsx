// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  Card, Table, Button, Tag, Space, Input, message,
  Modal, Form, Select, Typography, Alert, Checkbox
} from 'antd';
import { FileTextOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { supabase } from '@/integrations/supabase/client';
import { getDefaultAssetChecklist } from '@/utils/exitWorkflowUtils';
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

interface AssetReturn {
  id: string;
  asset_type: string;
  asset_description: string;
  asset_serial_number?: string;
  returned: boolean;
  returned_at?: string;
  returned_by?: string;
  condition_notes?: string;
}

export const AssetReturnStep: React.FC<Props> = ({
  workflowId,
  employeeId,
  onUpdate
}) => {
  const [assets, setAssets] = useState<AssetReturn[]>([]);
  const [loading, setLoading] = useState(false);
  const [employee, setEmployee] = useState<any>(null);
  const [isReturnModalVisible, setIsReturnModalVisible] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetReturn | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchEmployee();
    fetchAssets();
  }, [employeeId, workflowId]);

  const fetchEmployee = async () => {
    const { data } = await supabase
      .from('employees')
      .select('position')
      .eq('id', employeeId)
      .single();
    
    if (data) setEmployee(data);
  };

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('exit_asset_returns')
        .select('*')
        .eq('workflow_id', workflowId)
        .order('created_at');

      if (error) throw error;

      // If no assets exist, create default ones
      if (!data || data.length === 0) {
        const isExecutive = employee ? isCLevelPosition(employee.position) : false;
        const defaultAssets = getDefaultAssetChecklist(isExecutive);
        
        const assetsToCreate = defaultAssets.map(asset => ({
          workflow_id: workflowId,
          asset_type: asset.type,
          asset_description: asset.description,
          returned: false,
        }));

        const { data: created, error: createError } = await supabase
          .from('exit_asset_returns')
          .insert(assetsToCreate)
          .select();

        if (createError) throw createError;
        setAssets(created || []);
      } else {
        setAssets(data);
      }
    } catch (error: any) {
      message.error('Failed to fetch assets');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkReturned = async (asset: AssetReturn) => {
    setSelectedAsset(asset);
    form.setFieldsValue({
      condition_notes: asset.condition_notes || '',
    });
    setIsReturnModalVisible(true);
  };

  const handleReturnSubmit = async (values: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('exit_asset_returns')
        .update({
          returned: true,
          returned_at: new Date().toISOString(),
          returned_by: user.id,
          condition_notes: values.condition_notes,
        })
        .eq('id', selectedAsset?.id);

      if (error) throw error;

      // Check if all assets are returned
      const { data: allAssets } = await supabase
        .from('exit_asset_returns')
        .select('returned')
        .eq('workflow_id', workflowId);

      const allReturned = allAssets?.every(a => a.returned);
      if (allReturned) {
        await supabase
          .from('exit_workflow_steps')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            completed_by: user.id,
          })
          .eq('workflow_id', workflowId)
          .eq('step_name', 'collect_assets');

        await supabase
          .from('exit_workflows')
          .update({ 
            status: 'assets_returned',
            assets_returned_at: new Date().toISOString(),
            assets_returned_by: user.id,
          })
          .eq('id', workflowId);
      }

      message.success('Asset return recorded successfully');
      setIsReturnModalVisible(false);
      form.resetFields();
      fetchAssets();
      onUpdate();
    } catch (error: any) {
      message.error(error.message || 'Failed to record asset return');
      console.error(error);
    }
  };

  const handleAddAsset = async () => {
    Modal.confirm({
      title: 'Add Custom Asset',
      content: 'Would you like to add a custom asset to the checklist?',
      onOk: async () => {
        try {
          const { error } = await supabase
            .from('exit_asset_returns')
            .insert({
              workflow_id: workflowId,
              asset_type: 'other',
              asset_description: 'Custom Asset',
              returned: false,
            });

          if (error) throw error;
          message.success('Asset added');
          fetchAssets();
        } catch (error: any) {
          message.error('Failed to add asset');
        }
      },
    });
  };

  const columns = [
    {
      title: 'Asset Type',
      dataIndex: 'asset_type',
      key: 'asset_type',
      render: (type: string) => (
        <Space>
          <FileTextOutlined />
          <Text strong>{type.replace('_', ' ').toUpperCase()}</Text>
        </Space>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'asset_description',
      key: 'asset_description',
    },
    {
      title: 'Serial Number',
      dataIndex: 'asset_serial_number',
      key: 'asset_serial_number',
      render: (serial: string) => serial || '-',
    },
    {
      title: 'Status',
      key: 'returned',
      render: (_: any, record: AssetReturn) => (
        record.returned ? (
          <Tag color="green" icon={<CheckCircleOutlined />}>Returned</Tag>
        ) : (
          <Tag color="orange" icon={<CloseCircleOutlined />}>Pending</Tag>
        )
      ),
    },
    {
      title: 'Returned At',
      dataIndex: 'returned_at',
      key: 'returned_at',
      render: (date: string) => date ? dayjs(date).format('MMM DD, YYYY h:mm A') : '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: AssetReturn) => (
        !record.returned ? (
          <Button
            size="small"
            type="primary"
            onClick={() => handleMarkReturned(record)}
          >
            Mark Returned
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
        message="Asset Return"
        description="Track the return of company assets. Mark each asset as returned when received."
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Card
        title="Asset Checklist"
        extra={
          <Button onClick={handleAddAsset}>
            Add Custom Asset
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={assets}
          loading={loading}
          rowKey="id"
          pagination={false}
        />
      </Card>

      <Modal
        title={`Mark Asset Returned - ${selectedAsset?.asset_description}`}
        open={isReturnModalVisible}
        onCancel={() => {
          setIsReturnModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        okText="Mark Returned"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleReturnSubmit}
        >
          <Form.Item
            name="condition_notes"
            label="Condition Notes"
          >
            <TextArea rows={3} placeholder="Note the condition of the asset (e.g., 'Good condition', 'Screen cracked', etc.)" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};


















































