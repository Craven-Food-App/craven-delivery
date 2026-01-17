// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, Progress, Tag, Button, Modal, Form, Input, InputNumber, DatePicker, Select, message } from 'antd';
import { RocketOutlined, PlusOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { supabase } from '@/integrations/supabase/client';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;

interface Objective {
  id: string;
  title: string;
  description: string;
  objective_type: string;
  target_value: number;
  current_value: number;
  progress_percentage: number;
  status: string;
  priority: string;
  start_date: string;
  target_date: string;
}

export const StrategicPlanning: React.FC = () => {
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchObjectives();
  }, []);

  const fetchObjectives = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ceo_objectives')
        .select('*')
        .order('priority', { ascending: true })
        .order('target_date', { ascending: true });

      if (error) throw error;
      setObjectives(data || []);
    } catch (error) {
      console.error('Error fetching objectives:', error);
      message.error('Failed to load objectives');
    } finally {
      setLoading(false);
    }
  };

  const createObjective = async (values: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('ceo_objectives')
        .insert([
          {
            title: values.title,
            description: values.description,
            objective_type: values.objective_type,
            target_value: values.target_value,
            current_value: values.current_value || 0,
            priority: values.priority,
            start_date: dayjs(values.start_date).format('YYYY-MM-DD'),
            target_date: dayjs(values.target_date).format('YYYY-MM-DD'),
            owner_id: user?.id,
          }
        ]);

      if (error) throw error;

      await supabase.rpc('log_ceo_action', {
        p_action_type: 'created_objective',
        p_action_category: 'strategic',
        p_target_type: 'objective',
        p_target_id: null,
        p_target_name: values.title,
        p_description: `Created new strategic objective: ${values.title}`,
        p_severity: 'high'
      });

      message.success('Objective created successfully');
      setModalVisible(false);
      form.resetFields();
      fetchObjectives();
    } catch (error: any) {
      console.error('Error creating objective:', error);
      message.error(error.message || 'Failed to create objective');
    }
  };

  const updateProgress = async (objective: Objective, newValue: number) => {
    try {
      const { error } = await supabase
        .from('ceo_objectives')
        .update({ current_value: newValue })
        .eq('id', objective.id);

      if (error) throw error;

      message.success('Progress updated');
      fetchObjectives();
    } catch (error: any) {
      message.error('Failed to update progress');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'not-started': 'default',
      'in-progress': 'blue',
      'at-risk': 'orange',
      'completed': 'green',
      'cancelled': 'red',
    };
    return colors[status] || 'default';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'default',
      normal: 'blue',
      high: 'orange',
      critical: 'red',
    };
    return colors[priority] || 'default';
  };

  const avgProgress = objectives.length > 0
    ? Math.round(objectives.reduce((sum, obj) => sum + (obj.progress_percentage || 0), 0) / objectives.length)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Strategic Planning</h2>
          <p className="text-slate-600">Company objectives and key results (OKRs)</p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          onClick={() => setModalVisible(true)}
        >
          New Objective
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{objectives.length}</div>
            <div className="text-sm text-slate-600">Total Objectives</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {objectives.filter(o => o.status === 'completed').length}
            </div>
            <div className="text-sm text-slate-600">Completed</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <Progress
              type="circle"
              percent={avgProgress}
              size={60}
              strokeColor={avgProgress > 70 ? '#52c41a' : avgProgress > 40 ? '#faad14' : '#ff4d4f'}
            />
            <div className="text-sm text-slate-600 mt-2">Avg Progress</div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {objectives.map((objective) => (
          <Card
            key={objective.id}
            className="hover:shadow-lg transition-shadow"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">{objective.title}</h3>
                  <p className="text-sm text-slate-600">{objective.description}</p>
                </div>
                <Tag color={getPriorityColor(objective.priority)}>
                  {objective.priority.toUpperCase()}
                </Tag>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>{objective.current_value?.toLocaleString() || 0} / {objective.target_value?.toLocaleString()}</span>
                  <span className="font-semibold">{objective.progress_percentage || 0}%</span>
                </div>
                <Progress
                  percent={objective.progress_percentage || 0}
                  showInfo={false}
                  strokeColor={
                    objective.progress_percentage >= 100 ? '#52c41a' :
                    objective.progress_percentage >= 70 ? '#1890ff' :
                    objective.progress_percentage >= 40 ? '#faad14' : '#ff4d4f'
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag color={getStatusColor(objective.status)}>
                    {objective.status.toUpperCase().replace('-', ' ')}
                  </Tag>
                  <span className="text-xs text-slate-500">
                    Due: {dayjs(objective.target_date).format('MMM D, YYYY')}
                  </span>
                </div>
                {objective.status !== 'completed' && (
                  <Button
                    size="small"
                    type="link"
                    onClick={() => {
                      const newValue = prompt(`Update progress for "${objective.title}".\nCurrent: ${objective.current_value}\nTarget: ${objective.target_value}`);
                      if (newValue !== null) {
                        updateProgress(objective, parseFloat(newValue) || 0);
                      }
                    }}
                  >
                    Update
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        title="Create New Objective"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form layout="vertical" form={form} onFinish={createObjective}>
          <Form.Item
            label="Objective Title"
            name="title"
            rules={[{ required: true, message: 'Required' }]}
          >
            <Input placeholder="e.g., Increase Revenue by 25%" />
          </Form.Item>

          <Form.Item label="Description" name="description">
            <TextArea rows={3} placeholder="Describe the objective..." />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              label="Type"
              name="objective_type"
              rules={[{ required: true }]}
              initialValue="company"
            >
              <Select>
                <Option value="company">Company</Option>
                <Option value="department">Department</Option>
                <Option value="team">Team</Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="Priority"
              name="priority"
              rules={[{ required: true }]}
              initialValue="normal"
            >
              <Select>
                <Option value="low">Low</Option>
                <Option value="normal">Normal</Option>
                <Option value="high">High</Option>
                <Option value="critical">Critical</Option>
              </Select>
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              label="Target Value"
              name="target_value"
              rules={[{ required: true }]}
            >
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>

            <Form.Item label="Current Value" name="current_value" initialValue={0}>
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              label="Start Date"
              name="start_date"
              initialValue={dayjs()}
              rules={[{ required: true }]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              label="Target Date"
              name="target_date"
              rules={[{ required: true }]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <Form.Item>
            <div className="flex gap-3">
              <Button onClick={() => {
                setModalVisible(false);
                form.resetFields();
              }} className="flex-1">
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" icon={<RocketOutlined />} className="flex-1">
                Create Objective
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
