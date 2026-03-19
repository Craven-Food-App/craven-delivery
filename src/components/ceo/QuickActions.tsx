// @ts-nocheck
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Form, Input, DatePicker, Select, InputNumber, Space, Button, Typography, message } from 'antd';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { MeetingScheduler } from './MeetingScheduler';
import { ReportsViewer } from './ReportsViewer';
import dayjs from 'dayjs';
import {
  IconUserPlus, IconCurrencyDollar, IconFileText, IconBell, IconPlayerPause, IconPlayerPlay,
  IconChartBar, IconRocket, IconCalendarEvent, IconArrowRight, IconCheck, IconX,
} from '@tabler/icons-react';

const { TextArea } = Input;
const { Title, Paragraph } = Typography;

interface QuickActionsProps {
  onNavigate: (tab: string) => void;
}

interface PendingApproval {
  id: string;
  request_type: string;
  requester_name: string;
  amount: number;
  description: string;
  priority: string;
}

const priorityWeight: Record<string, number> = { critical: 1, urgent: 2, high: 3, normal: 4, low: 5 };

export const QuickActions: React.FC<QuickActionsProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const [meetingModalVisible, setMeetingModalVisible] = useState(false);
  const [reportsModalVisible, setReportsModalVisible] = useState(false);
  const [ordersSetting, setOrdersSetting] = useState<any>(null);
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

  // Recent activity for the dashboard
  const [recentApprovals, setRecentApprovals] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  const logAction = useCallback(async (action: string, description: string) => {
    try {
      await supabase.rpc('log_ceo_action', {
        p_action_type: action, p_action_category: 'system', p_target_type: 'quick_action',
        p_target_id: null, p_target_name: action, p_description: description, p_severity: 'normal',
      });
    } catch (e) { console.error('log error:', e); }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const [settingRes, approvalsRes, ordersRes] = await Promise.all([
        supabase.from('ceo_system_settings').select('*').eq('setting_key', 'orders_paused').order('created_at', { ascending: false }).limit(1),
        supabase.from('ceo_financial_approvals').select('id, request_type, requester_name, amount, priority, status, requested_date').order('requested_date', { ascending: false }).limit(5),
        supabase.from('orders').select('id, total_amount, status, created_at').order('created_at', { ascending: false }).limit(5),
      ]);
      if (settingRes.data?.[0]) setOrdersSetting(settingRes.data[0]);
      setRecentApprovals(approvalsRes.data || []);
      setRecentOrders(ordersRes.data || []);
    };
    fetchData();
  }, []);

  const ordersPaused = ordersSetting?.setting_value?.enabled ?? false;

  const toggleOrdersPaused = async () => {
    if (!ordersSetting) { message.error('Orders control not configured.'); return; }
    setOrdersLoading(true);
    try {
      const next = !ordersPaused;
      const sv = { ...ordersSetting.setting_value, enabled: next, reason: 'CEO Quick Actions', updated_at: new Date().toISOString() };
      const { error } = await supabase.from('ceo_system_settings').update({ setting_value: sv, last_changed_at: new Date().toISOString() }).eq('id', ordersSetting.id);
      if (error) throw error;
      await logAction(next ? 'pause_orders' : 'resume_orders', `${next ? 'Paused' : 'Resumed'} orders`);
      message.success(next ? 'Orders paused.' : 'Orders resumed.');
      setOrdersSetting(prev => prev ? { ...prev, setting_value: sv } : prev);
    } catch (e: any) { message.error(e?.message || 'Failed'); }
    finally { setOrdersLoading(false); }
  };

  const openFinancialApproval = async () => {
    setApprovalLoading(true);
    try {
      const { data, error } = await supabase.from('ceo_financial_approvals').select('id, request_type, requester_name, amount, description, priority').eq('status', 'pending').order('priority').order('requested_date').limit(5);
      if (error) throw error;
      if (!data?.length) { message.success('All approvals up to date.'); return; }
      const sorted = [...data].sort((a, b) => (priorityWeight[a.priority] || 999) - (priorityWeight[b.priority] || 999));
      setPendingApproval(sorted[0]);
      setApprovalNotes('');
      setApprovalModalVisible(true);
      await logAction('review_fast_track', 'Reviewing urgent approval');
    } catch (e) { message.error('Failed to load approvals'); }
    finally { setApprovalLoading(false); }
  };

  const approvePendingRequest = async (status: 'approved' | 'denied') => {
    if (!pendingApproval) return;
    setApprovalLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('ceo_financial_approvals').update({ status, reviewed_by: user?.id, reviewed_at: new Date().toISOString(), review_notes: approvalNotes }).eq('id', pendingApproval.id);
      if (error) throw error;
      await logAction(status === 'approved' ? 'approved_quick' : 'denied_quick', `${status} ${pendingApproval.request_type} $${pendingApproval.amount.toLocaleString()}`);
      message.success(status === 'approved' ? 'Approved.' : 'Denied.');
      setApprovalModalVisible(false);
      setPendingApproval(null);
    } catch (e) { message.error('Update failed.'); }
    finally { setApprovalLoading(false); }
  };

  const submitQuickInitiative = async (values: any) => {
    setInitiativeSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('ceo_objectives').insert([{
        title: values.title, description: values.description, objective_type: values.objective_type,
        priority: values.priority, target_value: values.target_value || 0, current_value: values.current_value || 0,
        start_date: dayjs(values.start_date).format('YYYY-MM-DD'), target_date: dayjs(values.target_date).format('YYYY-MM-DD'),
        owner_id: user?.id,
      }]);
      if (error) throw error;
      await logAction('created_objective', `Created: ${values.title}`);
      message.success('Initiative launched.');
      setInitiativeModalVisible(false);
      initiativeForm.resetFields();
      onNavigate('strategic');
    } catch (e) { message.error('Failed to create initiative.'); }
    finally { setInitiativeSubmitting(false); }
  };

  const dispatchAlert = async () => {
    if (!alertMessage.trim()) { message.warning('Provide a message.'); return; }
    try {
      await logAction('queued_alert', `${alertTarget} alert: ${alertMessage.slice(0, 80)}`);
      message.success('Alert queued for distribution.');
      setAlertModalVisible(false);
      setAlertMessage('');
      onNavigate('emergency');
    } catch (e) { message.error('Failed.'); }
  };

  const actions = useMemo(() => [
    { label: 'Start Hire', desc: 'Open hiring flow', icon: IconUserPlus, accent: '#3b82f6', action: () => { logAction('open_hire_flow', 'Opened hire workflow'); onNavigate('personnel'); window.dispatchEvent(new CustomEvent('ceo-open-hire-modal')); } },
    { label: 'Fast Approve', desc: 'Next priority spend', icon: IconCurrencyDollar, accent: '#059669', action: openFinancialApproval, loading: approvalLoading },
    { label: 'View Reports', desc: 'KPI & financial exports', icon: IconFileText, accent: '#8b5cf6', action: () => { logAction('view_reports', 'Reports'); setReportsModalVisible(true); } },
    { label: 'Send Alert', desc: 'Emergency broadcast', icon: IconBell, accent: '#dc2626', action: () => { logAction('compose_alert', 'Alert'); setAlertMessage(''); setAlertTarget('company'); setAlertModalVisible(true); } },
    { label: ordersPaused ? 'Resume Orders' : 'Pause Orders', desc: ordersPaused ? 'Resume intake' : 'Halt all orders', icon: ordersPaused ? IconPlayerPlay : IconPlayerPause, accent: ordersPaused ? '#059669' : '#f59e0b', action: toggleOrdersPaused, loading: ordersLoading },
    { label: 'Launch Initiative', desc: 'New strategic objective', icon: IconRocket, accent: '#6366f1', action: () => { logAction('launch_initiative', 'New initiative'); initiativeForm.resetFields(); setInitiativeModalVisible(true); } },
    { label: 'Schedule Meeting', desc: 'Executive meeting', icon: IconCalendarEvent, accent: '#ec4899', action: () => { logAction('schedule_meeting', 'Meeting'); setMeetingModalVisible(true); } },
    { label: 'Metrics', desc: 'Scroll to top', icon: IconChartBar, accent: '#06b6d4', action: () => { logAction('view_metrics', 'Metrics'); window.scrollTo({ top: 0, behavior: 'smooth' }); } },
  ], [approvalLoading, ordersLoading, ordersPaused]);

  const fmtCurrency = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v || 0);
  const statusColor = (s: string) => {
    if (['approved', 'completed', 'delivered'].includes(s)) return '#059669';
    if (['pending', 'processing', 'preparing'].includes(s)) return '#f59e0b';
    if (['denied', 'cancelled', 'failed'].includes(s)) return '#dc2626';
    return '#6b7280';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Section Header */}
      <div style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: 8 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>Command Center</h2>
        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>Execute CEO workflows instantly.</p>
      </div>

      {/* Quick Actions Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
        {actions.map((a, i) => {
          const Icon = a.icon;
          return (
            <button
              key={i}
              onClick={a.action}
              disabled={a.loading}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6,
                padding: '12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff',
                cursor: a.loading ? 'wait' : 'pointer', transition: 'all 0.15s', textAlign: 'left',
                opacity: a.loading ? 0.6 : 1, position: 'relative', overflow: 'hidden',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = a.accent; e.currentTarget.style.boxShadow = `0 2px 8px ${a.accent}15`; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{ width: 28, height: 28, borderRadius: 6, background: `${a.accent}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={15} color={a.accent} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>{a.label}</div>
                <div style={{ fontSize: 10, color: '#9ca3af', lineHeight: 1.3, marginTop: 1 }}>{a.desc}</div>
              </div>
              {a.loading && <div style={{ fontSize: 9, color: a.accent, fontWeight: 600, textTransform: 'uppercase' }}>Working…</div>}
            </button>
          );
        })}
      </div>

      {/* Activity Panels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12 }}>
        {/* Recent Approvals */}
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Recent Approvals</span>
            <button onClick={() => onNavigate('financial')} style={{ fontSize: 11, color: '#ff5f1f', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }}>
              View All <IconArrowRight size={11} />
            </button>
          </div>
          <div>
            {recentApprovals.length === 0 ? (
              <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: '#9ca3af' }}>No recent approvals</div>
            ) : recentApprovals.map((a, i) => (
              <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderBottom: i < recentApprovals.length - 1 ? '1px solid #f9fafb' : 'none' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.requester_name}
                  </div>
                  <div style={{ fontSize: 10, color: '#9ca3af' }}>{a.request_type}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: '#111827' }}>{fmtCurrency(a.amount)}</div>
                  <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: statusColor(a.status), letterSpacing: '0.03em' }}>{a.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Orders */}
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Latest Orders</span>
          </div>
          <div>
            {recentOrders.length === 0 ? (
              <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: '#9ca3af' }}>No recent orders</div>
            ) : recentOrders.map((o, i) => (
              <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderBottom: i < recentOrders.length - 1 ? '1px solid #f9fafb' : 'none' }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#374151', fontFamily: 'monospace' }}>#{o.id.slice(0, 8)}</div>
                  <div style={{ fontSize: 10, color: '#9ca3af' }}>{new Date(o.created_at).toLocaleDateString()}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: '#111827' }}>{fmtCurrency(o.total_amount)}</div>
                  <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: statusColor(o.status), letterSpacing: '0.03em' }}>{o.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modals — preserved functionality */}
      <MeetingScheduler visible={meetingModalVisible} onClose={() => setMeetingModalVisible(false)} />
      <ReportsViewer visible={reportsModalVisible} onClose={() => setReportsModalVisible(false)} />

      <Modal title="Fast Track Approval" open={approvalModalVisible} onCancel={() => { setApprovalModalVisible(false); setPendingApproval(null); }} footer={null} width={480}>
        {pendingApproval ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: '#f9fafb', borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 4 }}>{pendingApproval.description}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>
                <strong>From:</strong> {pendingApproval.requester_name} · <strong>Type:</strong> {pendingApproval.request_type.toUpperCase()} · <strong>Priority:</strong> {pendingApproval.priority.toUpperCase()}
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#059669', marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>
                ${pendingApproval.amount.toLocaleString()}
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Decision Notes</label>
              <TextArea rows={3} value={approvalNotes} onChange={e => setApprovalNotes(e.target.value)} placeholder="Reason for decision…" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button size="small" onClick={() => onNavigate('financial')}>Full Approvals →</Button>
              <Space>
                <Button danger size="small" onClick={() => approvePendingRequest('denied')} loading={approvalLoading} icon={<IconX size={13} />}>Deny</Button>
                <Button type="primary" size="small" onClick={() => approvePendingRequest('approved')} loading={approvalLoading} icon={<IconCheck size={13} />}>Approve</Button>
              </Space>
            </div>
          </div>
        ) : <p style={{ color: '#9ca3af', textAlign: 'center' }}>No pending approvals.</p>}
      </Modal>

      <Modal title="Launch Strategic Initiative" open={initiativeModalVisible} onCancel={() => { setInitiativeModalVisible(false); initiativeForm.resetFields(); }} footer={null} width={480}>
        <Form layout="vertical" form={initiativeForm} onFinish={submitQuickInitiative} initialValues={{ objective_type: 'company', priority: 'high', start_date: dayjs(), target_date: dayjs().add(90, 'day') }} size="small">
          <Form.Item name="title" label="Title" rules={[{ required: true }]}><Input placeholder="e.g. Launch catering vertical" /></Form.Item>
          <Form.Item name="description" label="Description" rules={[{ required: true }]}><TextArea rows={2} placeholder="Objective and impact." /></Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Form.Item name="objective_type" label="Type" rules={[{ required: true }]}>
              <Select options={[{ value: 'company', label: 'Company' }, { value: 'department', label: 'Department' }, { value: 'team', label: 'Team' }]} />
            </Form.Item>
            <Form.Item name="priority" label="Priority" rules={[{ required: true }]}>
              <Select options={[{ value: 'critical', label: 'Critical' }, { value: 'high', label: 'High' }, { value: 'normal', label: 'Normal' }, { value: 'low', label: 'Low' }]} />
            </Form.Item>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Form.Item name="target_value" label="Target"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
            <Form.Item name="current_value" label="Current"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Form.Item name="start_date" label="Start" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="target_date" label="Target" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setInitiativeModalVisible(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={initiativeSubmitting}>Launch</Button>
          </div>
        </Form>
      </Modal>

      <Modal title="Draft Alert" open={alertModalVisible} onCancel={() => setAlertModalVisible(false)} footer={null} width={440}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Audience</label>
            <Select value={alertTarget} onChange={v => setAlertTarget(v)} style={{ width: '100%' }} size="small"
              options={[{ value: 'company', label: 'Entire Company' }, { value: 'leadership', label: 'Leadership Team' }, { value: 'board', label: 'Board of Directors' }]} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Message</label>
            <TextArea rows={3} value={alertMessage} onChange={e => setAlertMessage(e.target.value)} placeholder="Alert text…" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button size="small" onClick={() => setAlertModalVisible(false)}>Cancel</Button>
            <Button type="primary" size="small" onClick={dispatchAlert}>Queue Alert</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
