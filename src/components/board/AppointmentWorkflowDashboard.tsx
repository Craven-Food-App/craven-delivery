import React, { useEffect, useState } from 'react';
import { Card, Tag, Progress, Alert, Timeline, Descriptions, Button, Space, Tooltip } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { supabase } from '@/integrations/supabase/client';
import { FORTUNE500_PACKET_LABELS, STATUS_MAP } from '@/utils/fortune500DocumentFlow';

interface WorkflowGate {
  id: string;
  gate_number: number;
  gate_name: string;
  stage_name: string;
  department_owner: string;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  completed_at: string | null;
  completed_by: string | null;
  rejection_reason: string | null;
}

interface Appointment {
  id: string;
  proposed_officer_name: string;
  proposed_officer_email: string | null;
  proposed_title: string;
  effective_date: string;
  status: string;
  created_at: string;
  gates: WorkflowGate[];
}

const STATUS_COLOR_MAP: Record<string, string> = {
  'draft': 'default',
  'selected': 'blue',
  'pending_comp_approval': 'blue',
  'ready_for_board_authorization': 'cyan',
  'authorized_to_offer': 'cyan',
  'pending_employment_agreement': 'purple',
  'pending_ip_confidentiality': 'purple',
  'pending_personal_governance': 'orange',
  'pending_fiduciary_binding': 'orange',
  'pending_conflict_clearance': 'orange',
  'pending_indemnification': 'gold',
  'pending_equity_authorization': 'lime',
  'shareholder_active': 'lime',
  'plan_active': 'lime',
  'equity_vesting_active': 'lime',
  'compensation_live': 'green',
  'fully_appointed_active': 'success',
  'rejected': 'error',
};

const GATE_STATUS_ICONS: Record<string, React.ReactNode> = {
  'completed': <CheckCircleOutlined style={{ color: '#52c41a' }} />,
  'in_progress': <ClockCircleOutlined style={{ color: '#1890ff' }} />,
  'pending': <ClockCircleOutlined style={{ color: '#d9d9d9' }} />,
  'rejected': <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
};

export const AppointmentWorkflowDashboard: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('executive_appointments')
        .select('id, proposed_officer_name, proposed_officer_email, proposed_title, effective_date, status, created_at')
        .order('created_at', { ascending: false });

      if (appointmentsError) throw appointmentsError;

      // Fetch gates for each appointment
      const appointmentsWithGates = await Promise.all(
        (appointmentsData || []).map(async (appt) => {
          const { data: gatesData } = await supabase
            .from('appointment_workflow_gates')
            .select('*')
            .eq('appointment_id', appt.id)
            .order('gate_number', { ascending: true });

          return { ...appt, gates: gatesData || [] };
        })
      );

      setAppointments(appointmentsWithGates as any);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = (gates: WorkflowGate[]): number => {
    if (!gates || gates.length === 0) return 0;
    const completed = gates.filter(g => g.status === 'completed').length;
    return Math.round((completed / gates.length) * 100);
  };

  const getStatusColor = (status: string): string => {
    return STATUS_COLOR_MAP[status] || 'default';
  };

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>Executive Appointment Workflow Dashboard</h1>
      <p style={{ color: '#6b7280', marginBottom: 24 }}>
        Fortune 500-style gated appointment workflow with comprehensive audit tracking
      </p>

      {appointments.map((appointment) => {
        const progress = calculateProgress(appointment.gates);
        const hasRejections = appointment.gates.some(g => g.status === 'rejected');
        const isComplete = appointment.status === 'fully_appointed_active';

        return (
          <Card
            key={appointment.id}
            style={{ marginBottom: 24 }}
            title={
              <Space>
                <span>{appointment.proposed_officer_name}</span>
                <Tag color={getStatusColor(appointment.status)}>
                  {STATUS_MAP[appointment.status] || appointment.status}
                </Tag>
              </Space>
            }
            extra={
              <Button 
                type="link" 
                onClick={() => setSelectedAppointment(selectedAppointment?.id === appointment.id ? null : appointment)}
              >
                {selectedAppointment?.id === appointment.id ? 'Hide Details' : 'View Details'}
              </Button>
            }
          >
            {hasRejections && (
              <Alert
                message="Workflow Halted"
                description="One or more documents have been rejected. The appointment cannot proceed until issues are resolved."
                type="error"
                icon={<ExclamationCircleOutlined />}
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}

            <Descriptions column={2} size="small">
              <Descriptions.Item label="Title">{appointment.proposed_title}</Descriptions.Item>
              <Descriptions.Item label="Effective Date">{new Date(appointment.effective_date).toLocaleDateString()}</Descriptions.Item>
              <Descriptions.Item label="Email">{appointment.proposed_officer_email || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Created">{new Date(appointment.created_at).toLocaleDateString()}</Descriptions.Item>
            </Descriptions>

            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 500 }}>Workflow Progress</span>
                <span style={{ color: isComplete ? '#52c41a' : '#666' }}>
                  {progress}% Complete
                </span>
              </div>
              <Progress 
                percent={progress} 
                status={hasRejections ? 'exception' : isComplete ? 'success' : 'active'}
                strokeColor={hasRejections ? '#ff4d4f' : undefined}
              />
            </div>

            {selectedAppointment?.id === appointment.id && (
              <div style={{ marginTop: 24 }}>
                <h3>Gate Details</h3>
                <Timeline>
                  {appointment.gates.map((gate) => (
                    <Timeline.Item
                      key={gate.id}
                      dot={GATE_STATUS_ICONS[gate.status]}
                      color={gate.status === 'completed' ? 'green' : gate.status === 'rejected' ? 'red' : 'blue'}
                    >
                      <div>
                        <div style={{ fontWeight: 500 }}>
                          Gate {gate.gate_number}: {gate.gate_name}
                        </div>
                        <div style={{ fontSize: 12, color: '#666' }}>
                          <Space split="|">
                            <span>Stage: {gate.stage_name}</span>
                            <span>Owner: {gate.department_owner}</span>
                            <span>Status: <Tag>{gate.status}</Tag></span>
                          </Space>
                        </div>
                        {gate.completed_at && (
                          <div style={{ fontSize: 12, color: '#52c41a', marginTop: 4 }}>
                            ✓ Completed: {new Date(gate.completed_at).toLocaleString()}
                          </div>
                        )}
                        {gate.rejection_reason && (
                          <Alert
                            message="Rejected"
                            description={gate.rejection_reason}
                            type="error"
                            showIcon
                            style={{ marginTop: 8 }}
                          />
                        )}
                      </div>
                    </Timeline.Item>
                  ))}
                </Timeline>
              </div>
            )}
          </Card>
        );
      })}

      {!loading && appointments.length === 0 && (
        <Card>
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
            No appointments found
          </div>
        </Card>
      )}
    </div>
  );
};