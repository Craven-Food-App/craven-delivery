// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Briefcase, Plus, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { 
  Card, 
  Table, 
  Tag, 
  Button, 
  Space, 
  Modal, 
  Form, 
  Input, 
  Select, 
  InputNumber, 
  Switch, 
  message,
  Popconfirm,
  Typography
} from 'antd';
import { supabase } from '@/integrations/supabase/client';

const { TextArea } = Input;
const { Option } = Select;
const { Text } = Typography;

interface Position {
  id: string;
  title: string;
  code: string;
  department_id?: string;
  department?: { name: string };
  description?: string;
  is_executive: boolean;
  is_active: boolean;
  salary_range_min?: number;
  salary_range_max?: number;
  requirements?: string;
  education_level?: string;
  reports_to_position_id?: string;
  created_at: string;
  updated_at: string;
}

interface Department {
  id: string;
  name: string;
}

const PositionManagement: React.FC = () => {
  const [positions, setPositions] = useState<Position[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchPositions();
    fetchDepartments();
  }, []);

  const fetchPositions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('positions')
        .select(`
          *,
          department:departments(id, name)
        `)
        .order('is_executive', { ascending: false })
        .order('title', { ascending: true });

      if (error) throw error;
      setPositions(data || []);
    } catch (error: any) {
      console.error('Error fetching positions:', error);
      message.error('Failed to load positions');
    } finally {
      setLoading(false);
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
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const handleAdd = () => {
    setEditingPosition(null);
    form.resetFields();
    form.setFieldsValue({
      is_executive: false,
      is_active: true,
    });
    setIsModalVisible(true);
  };

  const handleEdit = (position: Position) => {
    setEditingPosition(position);
    form.setFieldsValue({
      ...position,
      department_id: position.department_id || undefined,
    });
    setIsModalVisible(true);
  };

  const handleDelete = async (positionId: string) => {
    try {
      // Check if any employees are using this position
      const { data: employeesUsing, error: checkError } = await supabase
        .from('employees')
        .select('id')
        .eq('position_id', positionId)
        .limit(1);

      if (checkError) throw checkError;

      if (employeesUsing && employeesUsing.length > 0) {
        // Deactivate instead of delete
        const { error } = await supabase
          .from('positions')
          .update({ is_active: false })
          .eq('id', positionId);

        if (error) throw error;
        message.success('Position deactivated (employees are still using it)');
      } else {
        // Safe to delete
        const { error } = await supabase
          .from('positions')
          .delete()
          .eq('id', positionId);

        if (error) throw error;
        message.success('Position deleted successfully');
      }

      fetchPositions();
    } catch (error: any) {
      console.error('Error deleting position:', error);
      message.error('Failed to delete position: ' + error.message);
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      const positionData = {
        ...values,
        salary_range_min: values.salary_range_min || null,
        salary_range_max: values.salary_range_max || null,
        department_id: values.department_id || null,
        reports_to_position_id: values.reports_to_position_id || null,
      };

      if (editingPosition) {
        // Update
        const { error } = await supabase
          .from('positions')
          .update(positionData)
          .eq('id', editingPosition.id);

        if (error) throw error;
        message.success('Position updated successfully');
      } else {
        // Create
        const { error } = await supabase
          .from('positions')
          .insert([positionData]);

        if (error) throw error;
        message.success('Position created successfully');
      }

      setIsModalVisible(false);
      form.resetFields();
      fetchPositions();
    } catch (error: any) {
      console.error('Error saving position:', error);
      message.error('Failed to save position: ' + error.message);
    }
  };

  const handleToggleActive = async (position: Position) => {
    try {
      const { error } = await supabase
        .from('positions')
        .update({ is_active: !position.is_active })
        .eq('id', position.id);

      if (error) throw error;
      message.success(`Position ${!position.is_active ? 'activated' : 'deactivated'}`);
      fetchPositions();
    } catch (error: any) {
      console.error('Error toggling position status:', error);
      message.error('Failed to update position status');
    }
  };

  const columns = [
    {
      title: 'Position Title',
      key: 'title',
      render: (record: Position) => (
        <div>
          <div style={{ fontWeight: 600 }}>{record.title}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Code: {record.code}
          </Text>
        </div>
      ),
    },
    {
      title: 'Department',
      dataIndex: ['department', 'name'],
      key: 'department',
      render: (text: string) => text || <Text type="secondary">No Department</Text>,
    },
    {
      title: 'Type',
      key: 'type',
      render: (record: Position) => (
        <Tag color={record.is_executive ? 'orange' : 'blue'}>
          {record.is_executive ? 'Executive' : 'Standard'}
        </Tag>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (record: Position) => (
        <Tag color={record.is_active ? 'green' : 'red'}>
          {record.is_active ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Salary Range',
      key: 'salary_range',
      render: (record: Position) => {
        if (!record.salary_range_min && !record.salary_range_max) {
          return <Text type="secondary">Not Set</Text>;
        }
        const min = record.salary_range_min ? `$${record.salary_range_min.toLocaleString()}` : 'N/A';
        const max = record.salary_range_max ? `$${record.salary_range_max.toLocaleString()}` : 'N/A';
        return `${min} - ${max}`;
      },
    },
    {
      title: 'Action',
      key: 'action',
      align: 'right' as const,
      render: (record: Position) => (
        <Space>
          <Button
            type="link"
            icon={<Edit2 size={14} />}
            onClick={() => handleEdit(record)}
          >
            Edit
          </Button>
          <Button
            type="link"
            danger={record.is_active}
            icon={record.is_active ? <XCircle size={14} /> : <CheckCircle size={14} />}
            onClick={() => handleToggleActive(record)}
          >
            {record.is_active ? 'Deactivate' : 'Activate'}
          </Button>
          <Popconfirm
            title="Delete position?"
            description="This will only work if no employees are using this position. Otherwise, it will be deactivated."
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              type="link"
              danger
              icon={<Trash2 size={14} />}
            >
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card
        title={
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <span style={{ display: 'flex', alignItems: 'center', fontSize: '20px' }}>
              <Briefcase style={{ width: '24px', height: '24px', marginRight: '8px', color: '#ff7a45' }} />
              Position & Role Management
            </span>
            <Button
              type="primary"
              icon={<Plus style={{ width: '16px', height: '16px' }} />}
              onClick={handleAdd}
              style={{ background: '#ff7a45', borderColor: '#ff7a45' }}
            >
              Create Position
            </Button>
          </span>
        }
      >
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
          Define and manage employee positions and roles. Positions can be linked to departments and include salary ranges and requirements.
        </p>

        <Table
          columns={columns}
          dataSource={positions}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20 }}
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={editingPosition ? 'Edit Position' : 'Create New Position'}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            label="Position Title"
            name="title"
            rules={[{ required: true, message: 'Please enter position title' }]}
          >
            <Input placeholder="e.g., Marketing Manager" />
          </Form.Item>

          <Form.Item
            label="Code (Slug)"
            name="code"
            rules={[
              { required: true, message: 'Please enter position code' },
              { pattern: /^[a-z0-9-]+$/, message: 'Code must be lowercase letters, numbers, and hyphens only' }
            ]}
            tooltip="Unique identifier (e.g., marketing-manager). Used for email generation."
          >
            <Input placeholder="e.g., marketing-manager" />
          </Form.Item>

          <Form.Item
            label="Department"
            name="department_id"
          >
            <Select allowClear placeholder="Select department (optional)">
              {departments.map(dept => (
                <Option key={dept.id} value={dept.id}>{dept.name}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Description"
            name="description"
          >
            <TextArea rows={3} placeholder="Brief description of the position..." />
          </Form.Item>

          <Form.Item
            label="Requirements/Qualifications"
            name="requirements"
          >
            <TextArea rows={2} placeholder="Required skills, experience, etc..." />
          </Form.Item>

          <Form.Item
            label="Education Level"
            name="education_level"
          >
            <Select allowClear placeholder="Select education level (optional)">
              <Option value="None">None</Option>
              <Option value="High School">High School</Option>
              <Option value="Associate's">Associate's Degree</Option>
              <Option value="Bachelor's">Bachelor's Degree</Option>
              <Option value="Master's">Master's Degree</Option>
              <Option value="Doctorate">Doctorate</Option>
            </Select>
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item
              label="Min Salary (Annual)"
              name="salary_range_min"
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="Minimum"
                formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value!.replace(/\$\s?|(,*)/g, '')}
              />
            </Form.Item>

            <Form.Item
              label="Max Salary (Annual)"
              name="salary_range_max"
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="Maximum"
                formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value!.replace(/\$\s?|(,*)/g, '')}
              />
            </Form.Item>
          </div>

          <Form.Item
            label="Reports To Position"
            name="reports_to_position_id"
            tooltip="Select another position that this position reports to"
          >
            <Select allowClear placeholder="Select reporting position (optional)">
              {positions
                .filter(p => p.id !== editingPosition?.id && p.is_active)
                .map(pos => (
                  <Option key={pos.id} value={pos.id}>{pos.title}</Option>
                ))}
            </Select>
          </Form.Item>

          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              label="Executive Position"
              name="is_executive"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item
              label="Active"
              name="is_active"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </div>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" style={{ background: '#ff7a45', borderColor: '#ff7a45' }}>
                {editingPosition ? 'Update' : 'Create'} Position
              </Button>
              <Button onClick={() => {
                setIsModalVisible(false);
                form.resetFields();
              }}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default PositionManagement;

