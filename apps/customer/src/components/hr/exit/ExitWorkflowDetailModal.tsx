// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  Modal, Steps, Card, Descriptions, Tag, Button, Space,
  Alert, Timeline, Typography, Divider, message, Tabs
} from 'antd';
import {
  CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined,
  DollarOutlined, KeyOutlined, FileTextOutlined, UserOutlined
} from '@ant-design/icons';
import { supabase } from '@/integrations/supabase/client';
import { AccessRevocationStep } from './AccessRevocationStep';
import { AssetReturnStep } from './AssetReturnStep';
import { FinalSettlementStep } from './FinalSettlementStep';
import { logExitWorkflowAction, createBoardResolutionForRemoval } from '@/utils/exitWorkflowUtils';
import { sendTerminationNotice } from '@/utils/exitWorkflowNotifications';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

interface ExitWorkflow {
  id: string;
  employee_id: string;
  workflow_type: string;
  termination_type?: string;
  status: string;
  effective_date: string;
  termination_reason?: string;
  board_resolution_id?: string;
  employee?: any;
  board_resolution?: any;
}

interface WorkflowStep {
  id: string;
  step_name: string;
  step_number: number;
  status: string;
  completed_at?: string;
  completed_by?: string;
  notes?: string;
}

interface Props {
  workflow: ExitWorkflow;
  visible: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export const ExitWorkflowDetailModal: React.FC<Props> = ({
  workflow,
  visible,
  onClose,
  onUpdate
}) => {
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [sendingNotice, setSendingNotice] = useState(false);
  const [completingWorkflow, setCompletingWorkflow] = useState(false);
  const [creatingResolution, setCreatingResolution] = useState(false);
  const [refreshingStatus, setRefreshingStatus] = useState(false);
  const [workflowData, setWorkflowData] = useState<ExitWorkflow>(workflow);

  useEffect(() => {
    if (visible && workflow.id) {
      fetchWorkflowSteps();
      setWorkflowData(workflow);
    }
  }, [visible, workflow.id, workflow.status]);

  const fetchWorkflowSteps = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('exit_workflow_steps')
        .select('*')
        .eq('workflow_id', workflow.id)
        .order('step_number');

      if (error) throw error;
      setSteps(data || []);
    } catch (error: any) {
      message.error('Failed to fetch workflow steps');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteWorkflow = async () => {
    setCompletingWorkflow(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Mark complete_workflow step as completed
      await supabase
        .from('exit_workflow_steps')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: user.id,
          notes: 'Exit workflow completed',
        })
        .eq('workflow_id', workflowData.id)
        .eq('step_name', 'complete_workflow');

      // Update workflow status to completed
      const { error: updateError } = await supabase
        .from('exit_workflows')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', workflowData.id);

      if (updateError) throw updateError;

      // Update employee status to terminated
      await supabase
        .from('employees')
        .update({
          employment_status: 'terminated',
          termination_date: workflowData.effective_date,
        })
        .eq('id', workflowData.employee_id);

      // Log the completion
      await logExitWorkflowAction(
        'Exit Workflow Completed',
        workflowData.id,
        workflowData.employee_id,
        `${workflowData.employee?.first_name} ${workflowData.employee?.last_name}`,
        workflowData.employee?.position || '',
        'final_settlement',
        'completed',
        {
          completed_at: new Date().toISOString(),
        }
      );

      message.success('Exit workflow completed successfully');
      setWorkflowData({ ...workflowData, status: 'completed' });
      fetchWorkflowSteps();
      onUpdate();
    } catch (error: any) {
      console.error('Error completing workflow:', error);
      message.error(error.message || 'Failed to complete workflow');
    } finally {
      setCompletingWorkflow(false);
    }
  };

  const handleRefreshResolutionStatus = async () => {
    if (!workflowData.board_resolution_id) {
      message.warning('No board resolution ID found');
      return;
    }

    setRefreshingStatus(true);
    try {
      // Get the resolution number - try from workflow's board_resolution object first
      let resolutionNumber = workflowData.board_resolution?.resolution_number;
      
      if (!resolutionNumber) {
        // Try to fetch it from board_resolutions
        const { data: brData, error: brError } = await supabase
          .from('board_resolutions')
          .select('resolution_number')
          .eq('id', workflowData.board_resolution_id)
          .single();
        
        if (brError || !brData) {
          message.error('Could not find resolution number');
          return;
        }
        resolutionNumber = brData.resolution_number;
      }

      // Check governance_board_resolutions status
      const { data: govRes, error: govError } = await supabase
        .from('governance_board_resolutions')
        .select('status, resolution_number')
        .eq('resolution_number', resolutionNumber)
        .maybeSingle();

      if (govError && govError.code !== 'PGRST116') {
        throw govError;
      }

      // If governance resolution is ADOPTED, sync to board_resolutions
      if (govRes && govRes.status === 'ADOPTED') {
        const { error: updateError } = await supabase
          .from('board_resolutions')
          .update({
            status: 'approved',
            updated_at: new Date().toISOString(),
          })
          .eq('resolution_number', resolutionNumber)
          .eq('status', 'pending'); // Only update if still pending

        if (updateError) throw updateError;

        message.success('Resolution status synced successfully. The workflow should update automatically.');
        
        // Refresh workflow data
        setTimeout(() => {
          onUpdate();
          fetchWorkflowSteps();
        }, 1000);
      } else {
        message.info('Governance resolution is not yet ADOPTED. Current status: ' + (govRes?.status || 'not found'));
      }
    } catch (error: any) {
      console.error('Error refreshing resolution status:', error);
      message.error(error.message || 'Failed to refresh resolution status');
    } finally {
      setRefreshingStatus(false);
    }
  };

  const handleSendNotice = async () => {
    setSendingNotice(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Send termination notice
      await sendTerminationNotice(
        workflowData.id,
        workflowData.employee?.email || '',
        `${workflowData.employee?.first_name} ${workflowData.employee?.last_name}`,
        workflowData.effective_date,
        (workflowData.termination_type || 'without_cause') as 'for_cause' | 'without_cause' | 'resignation',
        workflowData.termination_reason || undefined
      );

      // Update workflow status
      const { error: updateError } = await supabase
        .from('exit_workflows')
        .update({
          status: 'notice_sent',
          notice_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        })
        .eq('id', workflowData.id);

      if (updateError) throw updateError;

      // Mark send_notice step as completed
      await supabase
        .from('exit_workflow_steps')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: user.id,
          notes: 'Termination notice sent via email',
        })
        .eq('workflow_id', workflowData.id)
        .eq('step_name', 'send_notice');

      // Log the action
      await logExitWorkflowAction(
        'Termination Notice Sent',
        workflowData.id,
        workflowData.employee_id,
        `${workflowData.employee?.first_name} ${workflowData.employee?.last_name}`,
        workflowData.employee?.position || '',
        'board_approved',
        'notice_sent',
        {
          notice_date: new Date().toISOString().split('T')[0],
        }
      );

      message.success('Termination notice sent successfully');
      setWorkflowData({ ...workflowData, status: 'notice_sent' });
      fetchWorkflowSteps();
      onUpdate();
    } catch (error: any) {
      console.error('Error sending notice:', error);
      message.error(error.message || 'Failed to send termination notice');
    } finally {
      setSendingNotice(false);
    }
  };

  const getStepStatus = (stepName: string) => {
    const step = steps.find(s => s.step_name === stepName);
    if (!step) return 'wait';
    
    switch (step.status) {
      case 'completed':
        return 'finish';
      case 'in_progress':
        return 'process';
      case 'failed':
        return 'error';
      default:
        return 'wait';
    }
  };

  const getStepIcon = (stepName: string) => {
    const status = getStepStatus(stepName);
    switch (status) {
      case 'finish':
        return <CheckCircleOutlined />;
      case 'process':
        return <ClockCircleOutlined />;
      case 'error':
        return <CloseCircleOutlined />;
      default:
        return null;
    }
  };

  const workflowSteps = [
    workflow.workflow_type === 'executive_removal' && {
      title: 'Board Approval',
      key: 'board_approval',
      icon: getStepIcon('board_approval'),
      status: getStepStatus('board_approval'),
    },
    {
      title: 'Send Notice',
      key: 'send_notice',
      icon: getStepIcon('send_notice'),
      status: getStepStatus('send_notice'),
    },
    {
      title: 'Revoke Access',
      key: 'revoke_access',
      icon: getStepIcon('revoke_access'),
      status: getStepStatus('revoke_access'),
    },
    {
      title: 'Collect Assets',
      key: 'collect_assets',
      icon: getStepIcon('collect_assets'),
      status: getStepStatus('collect_assets'),
    },
    {
      title: 'Final Settlement',
      key: 'final_settlement',
      icon: getStepIcon('calculate_settlement'),
      status: getStepStatus('calculate_settlement'),
    },
    {
      title: 'Complete',
      key: 'complete',
      icon: getStepIcon('complete_workflow'),
      status: getStepStatus('complete_workflow'),
    },
  ].filter(Boolean);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      initiated: 'blue',
      board_approval_pending: 'orange',
      board_approved: 'green',
      board_rejected: 'red',
      notice_sent: 'cyan',
      access_revoked: 'purple',
      assets_returned: 'geekblue',
      final_settlement: 'gold',
      completed: 'green',
      cancelled: 'default',
    };
    return colors[status] || 'default';
  };

  return (
    <Modal
      title={
        <div>
          <Title level={4} style={{ margin: 0 }}>
            Exit Workflow Details
          </Title>
          <Text type="secondary">
            {workflow.employee?.first_name} {workflow.employee?.last_name}
          </Text>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={1000}
      style={{ top: 20 }}
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="Overview" key="overview">
          <Card style={{ marginBottom: 16 }}>
            <Descriptions column={2} bordered>
              <Descriptions.Item label="Employee">
                {workflow.employee?.first_name} {workflow.employee?.last_name}
              </Descriptions.Item>
              <Descriptions.Item label="Position">
                {workflow.employee?.position}
              </Descriptions.Item>
              <Descriptions.Item label="Workflow Type">
                <Tag>{workflow.workflow_type.replace('_', ' ').toUpperCase()}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Termination Type">
                {workflow.termination_type ? (
                  <Tag color={workflow.termination_type === 'for_cause' ? 'red' : 'orange'}>
                    {workflow.termination_type.replace('_', ' ').toUpperCase()}
                  </Tag>
                ) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={getStatusColor(workflow.status)}>
                  {workflow.status.replace('_', ' ').toUpperCase()}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Effective Date">
                {dayjs(workflow.effective_date).format('MMMM DD, YYYY')}
              </Descriptions.Item>
              {workflow.board_resolution && (
                <>
                  <Descriptions.Item label="Board Resolution">
                    <Tag color={workflow.board_resolution.status === 'ADOPTED' ? 'green' : 'orange'}>
                      {workflow.board_resolution.resolution_number}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Resolution Status">
                    <Tag>{workflow.board_resolution.status}</Tag>
                  </Descriptions.Item>
                </>
              )}
              <Descriptions.Item label="Termination Reason" span={2}>
                {workflow.termination_reason || '-'}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {workflow.status === 'board_approval_pending' && (
            <Alert
              message="Board Approval Required"
              description={
                <div>
                  <p>This executive removal requires Board approval before proceeding.</p>
                  {workflow.board_resolution_id ? (
                    <div style={{ marginTop: 8 }}>
                      <Space>
                        <Button 
                          type="link" 
                          size="small"
                          onClick={() => {
                            window.open(`/company/governance-admin?tab=resolutions&resolution=${workflow.board_resolution_id}`, '_blank');
                          }}
                        >
                          View Board Resolution & Vote →
                        </Button>
                        <Button 
                          type="default" 
                          size="small"
                          icon={<ClockCircleOutlined />}
                          onClick={handleRefreshResolutionStatus}
                          loading={refreshingStatus}
                        >
                          Refresh Status
                        </Button>
                      </Space>
                    </div>
                  ) : (
                    <div style={{ marginTop: 12 }}>
                      <p style={{ marginBottom: 8, color: '#ff4d4f', fontWeight: 'bold' }}>
                        ⚠️ CRITICAL: Board resolution not created!
                      </p>
                      <Button 
                        type="primary"
                        danger
                        size="middle"
                        onClick={handleCreateBoardResolution}
                        loading={creatingResolution}
                        style={{ marginTop: 8 }}
                      >
                        Create Board Resolution Now
                      </Button>
                    </div>
                  )}
                </div>
              }
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          {workflow.status === 'board_approved' && (
            <Alert
              message="Board Approved - Ready to Proceed"
              description="The Board has approved this executive removal. You can now proceed with sending notice and completing the remaining steps."
              type="success"
              showIcon
              style={{ marginBottom: 16 }}
              action={
                <Button 
                  type="primary"
                  size="small"
                  onClick={handleSendNotice}
                  loading={sendingNotice}
                >
                  Send Termination Notice
                </Button>
              }
            />
          )}

          {workflow.status === 'board_rejected' && (
            <Alert
              message="Board Rejected"
              description="The Board has rejected this executive removal. The workflow has been cancelled."
              type="error"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          <Card title="Workflow Progress">
            <Steps
              items={workflowSteps}
              current={steps.filter(s => s.status === 'completed').length}
            />
          </Card>

          {workflowData.status === 'final_settlement' && (
            <Card style={{ marginTop: 16 }}>
              <Alert
                message="Ready to Complete"
                description="All steps have been completed. You can now finalize the exit workflow."
                type="success"
                showIcon
                style={{ marginBottom: 16 }}
              />
              <Button
                type="primary"
                size="large"
                icon={<CheckCircleOutlined />}
                onClick={handleCompleteWorkflow}
                loading={completingWorkflow}
                block
              >
                Complete Exit Workflow
              </Button>
            </Card>
          )}
        </TabPane>

        <TabPane tab="Access Revocation" key="access">
          <AccessRevocationStep
            workflowId={workflow.id}
            employeeId={workflow.employee_id}
            onUpdate={fetchWorkflowSteps}
          />
        </TabPane>

        <TabPane tab="Asset Return" key="assets">
          <AssetReturnStep
            workflowId={workflow.id}
            employeeId={workflow.employee_id}
            onUpdate={fetchWorkflowSteps}
          />
        </TabPane>

        <TabPane tab="Final Settlement" key="settlement">
          <FinalSettlementStep
            workflowId={workflow.id}
            employeeId={workflow.employee_id}
            effectiveDate={workflow.effective_date}
            terminationType={workflow.termination_type}
            onUpdate={fetchWorkflowSteps}
          />
        </TabPane>

        <TabPane tab="Timeline" key="timeline">
          <Card>
            <Timeline>
              <Timeline.Item color="blue">
                <Text strong>Workflow Initiated</Text>
                <br />
                <Text type="secondary">
                  {dayjs(workflow.created_at).format('MMMM DD, YYYY [at] h:mm A')}
                </Text>
              </Timeline.Item>
              {steps.map(step => (
                <Timeline.Item
                  key={step.id}
                  color={step.status === 'completed' ? 'green' : step.status === 'failed' ? 'red' : 'gray'}
                >
                  <Text strong>{step.step_name.replace('_', ' ').toUpperCase()}</Text>
                  {step.completed_at && (
                    <>
                      <br />
                      <Text type="secondary">
                        Completed: {dayjs(step.completed_at).format('MMMM DD, YYYY [at] h:mm A')}
                      </Text>
                    </>
                  )}
                  {step.notes && (
                    <>
                      <br />
                      <Text type="secondary">{step.notes}</Text>
                    </>
                  )}
                </Timeline.Item>
              ))}
            </Timeline>
          </Card>
        </TabPane>
      </Tabs>
    </Modal>
  );
};

