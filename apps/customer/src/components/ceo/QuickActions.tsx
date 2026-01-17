// @ts-nocheck
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Row, Col, Button, message, Modal, Typography, Space, Input, Form, DatePicker, Select, InputNumber } from 'antd';
import {
  UserAddOutlined,
  DollarOutlined,
  RocketOutlined,
  BellOutlined,
  PauseCircleOutlined,
  ThunderboltOutlined,
  FileTextOutlined,
  TeamOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { MeetingScheduler } from './MeetingScheduler';
import { ReportsViewer } from './ReportsViewer';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Title, Paragraph } = Typography;

interface QuickActionsProps {
  onNavigate: (tab: string) => void;
}

interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: { enabled?: boolean; [key: string]: any };
  description: string;
  is_critical: boolean;
}

interface PendingApproval {
  id: string;
  request_type: string;
  requester_name: string;
  amount: number;
  description: string;
  priority: string;
}

const priorityWeight: Record<string, number> = {
  critical: 1,
  urgent: 2,
  high: 3,
  normal: 4,
  low: 5,
};

export const QuickActions: React.FC<QuickActionsProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const [meetingModalVisible, setMeetingModalVisible] = useState(false);
  const [reportsModalVisible, setReportsModalVisible] = useState(false);
  const [ordersSetting, setOrdersSetting] = useState<SystemSetting | null>(null);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [approvalModalVisible, setApprovalModalVisible] = useState(false);
  const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [initiativeModalVisible, setInitiativeModalVisible] = useState(false);
  const [initiativeSubmitting, setInitiativeSubmitting] = useState(false);
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertTarget, setAlertTarget] = useState<'company' | 'leadership' | 'board'>('company');
  const [initiativeForm] = Form.useForm();

  const logAction = async (action: string, description: string) => {
    try {
      await supabase.rpc('log_ceo_action', {
        p_action_type: action,
        p_action_category: 'system',
        p_target_type: 'quick_action',
        p_target_id: null,
        p_target_name: action,
        p_description: description,
        p_severity: 'normal'
      });
    } catch (error) {
      console.error('Error logging action:', error);
    }
  };

  const fetchOrdersSetting = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from<SystemSetting>('ceo_system_settings')
        .select('*')
        .eq('setting_key', 'orders_paused')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      setOrdersSetting(data?.[0] || null);
    } catch (error) {
      console.error('Error loading orders status', error);
    }
  }, []);

  useEffect(() => {
    fetchOrdersSetting();
  }, [fetchOrdersSetting]);

  const ordersPaused = ordersSetting?.setting_value?.enabled ?? false;

  const toggleOrdersPaused = async () => {
    if (!ordersSetting) {
      message.error('Orders control is not configured.');
      return;
    }
    setOrdersLoading(true);
    try {
      const nextEnabled = !ordersPaused;
      const settingValue = {
        ...ordersSetting.setting_value,
        enabled: nextEnabled,
        reason: 'Toggled via CEO Quick Actions',
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('ceo_system_settings')
        .update({
          setting_value: settingValue,
          last_changed_at: new Date().toISOString(),
        })
        .eq('id', ordersSetting.id);

      if (error) throw error;

      await logAction(nextEnabled ? 'pause_orders' : 'resume_orders', `${nextEnabled ? 'Paused' : 'Resumed'} incoming orders`);
      message.success(nextEnabled ? 'Orders are now paused.' : 'Orders resumed.');
      setOrdersSetting((prev) => (prev ? { ...prev, setting_value: settingValue } : prev));
    } catch (error: any) {
      console.error('Failed toggling orders', error);
      message.error(error?.message || 'Unable to toggle orders');
    } finally {
      setOrdersLoading(false);
    }
  };

  const openPersonnelHireFlow = async () => {
    await logAction('open_hire_flow', 'Opened rapid hire workflow');
    onNavigate('personnel');
    window.dispatchEvent(new CustomEvent('ceo-open-hire-modal'));
  };

  const openMeetingScheduler = async () => {
    await logAction('schedule_meeting', 'Opened executive meeting scheduler');
    setMeetingModalVisible(true);
  };

  const openReports = async () => {
    await logAction('view_reports', 'Accessed CEO reports viewer');
    setReportsModalVisible(true);
  };

  const openStrategicInitiativeModal = async () => {
    await logAction('launch_initiative', 'Preparing new strategic initiative');
    initiativeForm.resetFields();
    setInitiativeModalVisible(true);
  };

  const openEmergencyCommunications = async () => {
    await logAction('compose_alert', 'Preparing broadcast alert');
    setAlertMessage('');
    setAlertTarget('company');
    setAlertModalVisible(true);
  };

  const openFinancialApproval = async () => {
    setApprovalLoading(true);
    try {
      const { data, error } = await supabase
        .from<PendingApproval>('ceo_financial_approvals')
        .select('id, request_type, requester_name, amount, description, priority')
        .eq('status', 'pending')
        .order('priority', { ascending: true })
        .order('requested_date', { ascending: true })
        .limit(5);

      if (error) throw error;

      if (!data || data.length === 0) {
        message.success('All approvals are up to date.');
        return;
      }

      const sorted = [...data].sort(
        (a, b) =>
          (priorityWeight[a.priority] || 999) - (priorityWeight[b.priority] || 999)
      );

      setPendingApproval(sorted[0]);
      setApprovalNotes('');
      setApprovalModalVisible(true);
      await logAction('review_fast_track', 'Reviewing urgent financial approval');
    } catch (error) {
      console.error('Error loading approvals', error);
      message.error('Failed to load pending approvals');
    } finally {
      setApprovalLoading(false);
    }
  };

  const approvePendingRequest = async (status: 'approved' | 'denied') => {
    if (!pendingApproval) return;
    setApprovalLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('ceo_financial_approvals')
        .update({
          status,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          review_notes: approvalNotes,
        })
        .eq('id', pendingApproval.id);

      if (error) throw error;

      await logAction(
        status === 'approved' ? 'approved_financial_request_quick' : 'denied_financial_request_quick',
        `${status === 'approved' ? 'Approved' : 'Denied'} ${pendingApproval.request_type} for $${pendingApproval.amount.toLocaleString()}`
      );

      message.success(status === 'approved' ? 'Approval granted.' : 'Request denied.');
      setApprovalModalVisible(false);
      setPendingApproval(null);
      setApprovalNotes('');
    } catch (error) {
      console.error('Failed to update approval', error);
      message.error('Unable to update approval. Open the full approvals tab.');
    } finally {
      setApprovalLoading(false);
    }
  };

  const submitQuickInitiative = async (values: any) => {
    setInitiativeSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('ceo_objectives')
        .insert([
          {
            title: values.title,
            description: values.description,
            objective_type: values.objective_type,
            priority: values.priority,
            target_value: values.target_value || 0,
            current_value: values.current_value || 0,
            start_date: dayjs(values.start_date).format('YYYY-MM-DD'),
            target_date: dayjs(values.target_date).format('YYYY-MM-DD'),
            owner_id: user?.id,
          },
        ]);

      if (error) throw error;

      await logAction('created_quick_objective', `Created quick initiative: ${values.title}`);
      message.success('Initiative launched.');
      setInitiativeModalVisible(false);
      initiativeForm.resetFields();
      onNavigate('strategic');
    } catch (error) {
      console.error('Error creating initiative', error);
      message.error('Unable to create initiative.');
    } finally {
      setInitiativeSubmitting(false);
    }
  };

  const dispatchAlert = async () => {
    if (!alertMessage.trim()) {
      message.warning('Provide a short message.');
      return;
    }
    try {
      await logAction('queued_alert', `Prepared ${alertTarget} alert: ${alertMessage.slice(0, 80)}`);
      message.success('Alert logged for distribution. Review in Emergency Controls.');
      setAlertModalVisible(false);
      setAlertMessage('');
      onNavigate('emergency');
    } catch (error) {
      console.error('Alert log failed', error);
      message.error('Unable to queue alert.');
    }
  };

  const actions = useMemo(
    () => [
      {
        title: 'Start Hire',
        description: 'Open the hiring flow and send offer packet.',
        icon: <UserAddOutlined className="text-3xl" />,
        color: 'from-blue-500 to-blue-600',
        action: openPersonnelHireFlow,
      },
      {
        title: 'Approve Next Request',
        description: 'Review the highest priority financial approval.',
        icon: <DollarOutlined className="text-3xl" />,
        color: 'from-green-500 to-green-600',
        action: openFinancialApproval,
        loading: approvalLoading,
      },
      {
        title: 'View Reports',
        description: 'Open KPI and financial snapshot exports.',
        icon: <FileTextOutlined className="text-3xl" />,
        color: 'from-purple-500 to-purple-600',
        action: openReports,
      },
      {
        title: 'Send Alert',
        description: 'Draft an emergency or leadership alert.',
        icon: <BellOutlined className="text-3xl" />,
        color: 'from-red-500 to-red-600',
        action: openEmergencyCommunications,
      },
      {
        title: ordersPaused ? 'Resume Orders' : 'Pause Orders',
        description: ordersPaused ? 'Resume order intake for all regions.' : 'Pause order intake across the platform.',
        icon: <PauseCircleOutlined className="text-3xl" />,
        color: ordersPaused ? 'from-lime-500 to-lime-600' : 'from-orange-500 to-orange-600',
        action: toggleOrdersPaused,
        loading: ordersLoading,
      },
      {
        title: 'Executive Metrics',
        description: 'Jump to the real-time metrics dashboard.',
        icon: <BarChartOutlined className="text-3xl" />,
        color: 'from-cyan-500 to-cyan-600',
        action: () => {
          logAction('view_metrics', 'Jumped to CEO overview metrics');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        },
      },
      {
        title: 'Launch Initiative',
        description: 'Create a new strategic objective.',
        icon: <RocketOutlined className="text-3xl" />,
        color: 'from-indigo-500 to-indigo-600',
        action: openStrategicInitiativeModal,
      },
      {
        title: 'Schedule Meeting',
        description: 'Book an executive team meeting.',
        icon: <TeamOutlined className="text-3xl" />,
        color: 'from-pink-500 to-pink-600',
        action: openMeetingScheduler,
      },
    ],
    [approvalLoading, logAction, openEmergencyCommunications, openFinancialApproval, openMeetingScheduler, openPersonnelHireFlow, openReports, openStrategicInitiativeModal, ordersLoading, ordersPaused, toggleOrdersPaused],
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Command Actions</h2>
        <p className="text-slate-600">
          Execute the most common CEO workflows without leaving this view.
        </p>
      </div>

      <div className="flex flex-nowrap gap-1">
        {actions.map((action, index) => (
          <Card
            key={index}
            className={`cursor-pointer hover:shadow-xl transition-all duration-300 bg-gradient-to-br ${action.color} border-0 flex-shrink-0`}
            style={{ width: 'calc((100% - 7px) / 8)', padding: '8px 4px' }}
            onClick={action.action}
          >
            <div className="text-center text-white">
              <div style={{ fontSize: '20px', marginBottom: '6px' }}>{action.icon}</div>
              <h3 className="text-sm font-semibold leading-tight mb-1">{action.title}</h3>
              <p className="text-xs leading-tight opacity-90 line-clamp-2">{action.description}</p>
              {action.loading && <div className="text-xs uppercase mt-1">Working…</div>}
            </div>
          </Card>
        ))}
      </div>

      {/* Modals */}
      <MeetingScheduler visible={meetingModalVisible} onClose={() => setMeetingModalVisible(false)} />
      <ReportsViewer visible={reportsModalVisible} onClose={() => setReportsModalVisible(false)} />

      <Modal
        title="Fast Track Approval"
        open={approvalModalVisible}
        onCancel={() => {
          setApprovalModalVisible(false);
          setPendingApproval(null);
          setApprovalNotes('');
        }}
        footer={null}
        width={520}
      >
        {pendingApproval ? (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <Title level={5} style={{ marginBottom: 4 }}>
                {pendingApproval.description}
              </Title>
              <Paragraph style={{ marginBottom: 8 }}>
                <strong>Requester:</strong> {pendingApproval.requester_name}
              </Paragraph>
              <Paragraph style={{ marginBottom: 8 }}>
                <strong>Type:</strong> {pendingApproval.request_type.toUpperCase()} &nbsp;|&nbsp;
                <strong>Priority:</strong> {pendingApproval.priority.toUpperCase()}
              </Paragraph>
              <Paragraph style={{ marginBottom: 0, color: '#047857' }}>
                <strong>Amount:</strong> ${pendingApproval.amount.toLocaleString()}
              </Paragraph>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Decision notes</label>
              <TextArea
                rows={4}
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="Capture the reason for your decision…"
              />
            </div>

            <Space className="w-full justify-between" wrap>
              <Button onClick={() => onNavigate('financial')}>Open full approvals</Button>
              <Space>
                <Button danger onClick={() => approvePendingRequest('denied')} loading={approvalLoading}>
                  Deny
                </Button>
                <Button type="primary" onClick={() => approvePendingRequest('approved')} loading={approvalLoading}>
                  Approve
                </Button>
              </Space>
            </Space>
          </div>
        ) : (
          <Paragraph>No pending approvals to review.</Paragraph>
        )}
      </Modal>

      <Modal
        title="Launch Strategic Initiative"
        open={initiativeModalVisible}
        onCancel={() => {
          setInitiativeModalVisible(false);
          initiativeForm.resetFields();
        }}
        footer={null}
        width={520}
      >
        <Form layout="vertical" form={initiativeForm} onFinish={submitQuickInitiative} initialValues={{
          objective_type: 'company',
          priority: 'high',
          start_date: dayjs(),
          target_date: dayjs().add(90, 'day'),
        }}>
          <Form.Item name="title" label="Initiative title" rules={[{ required: true }]}>
            <Input placeholder="e.g. Launch new catering vertical" />
          </Form.Item>
          <Form.Item name="description" label="Description" rules={[{ required: true }]}>
            <TextArea rows={3} placeholder="Outline the objective and expected impact." />
          </Form.Item>
          <Form.Item name="objective_type" label="Type" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="company">Company</Select.Option>
              <Select.Option value="department">Department</Select.Option>
              <Select.Option value="team">Team</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="priority" label="Priority" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="critical">Critical</Select.Option>
              <Select.Option value="high">High</Select.Option>
              <Select.Option value="normal">Normal</Select.Option>
              <Select.Option value="low">Low</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="target_value" label="Target metric">
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item name="current_value" label="Current metric">
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item label="Timeline">
            <Space direction="horizontal" size="large">
              <Form.Item name="start_date" noStyle rules={[{ required: true }]}>
                <DatePicker />
              </Form.Item>
              <Form.Item name="target_date" noStyle rules={[{ required: true }]}>
                <DatePicker />
              </Form.Item>
            </Space>
          </Form.Item>
          <Space className="w-full justify-end">
            <Button onClick={() => setInitiativeModalVisible(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={initiativeSubmitting}>
              Launch
            </Button>
          </Space>
        </Form>
      </Modal>

      <Modal
        title="Draft Alert"
        open={alertModalVisible}
        onCancel={() => setAlertModalVisible(false)}
        footer={null}
        width={500}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <label className="block text-sm font-medium mb-2">Audience</label>
            <Select value={alertTarget} onChange={(value) => setAlertTarget(value)} style={{ width: '100%' }}>
              <Select.Option value="company">Entire company</Select.Option>
              <Select.Option value="leadership">Leadership team</Select.Option>
              <Select.Option value="board">Board of directors</Select.Option>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Message</label>
            <TextArea
              rows={4}
              value={alertMessage}
              onChange={(e) => setAlertMessage(e.target.value)}
              placeholder="Provide the alert text to share with the selected audience."
            />
          </div>
          <Space className="w-full justify-end">
            <Button onClick={() => setAlertModalVisible(false)}>Cancel</Button>
            <Button type="primary" onClick={dispatchAlert}>
              Queue Alert
            </Button>
          </Space>
        </Space>
      </Modal>
    </div>
  );
};
