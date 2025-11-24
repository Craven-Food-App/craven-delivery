import React, { useState, useEffect, useMemo } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Progress, 
  Button, 
  Space, 
  Typography, 
  Badge, 
  Alert, 
  Statistic, 
  Divider,
  List,
  Tag,
  Tooltip,
  Modal,
  Input,
  message,
  Spin,
  Timeline,
  Table,
  Select,
  Checkbox
} from 'antd';
import { 
  CheckCircleOutlined, 
  ClockCircleOutlined, 
  ExclamationCircleOutlined, 
  RocketOutlined, 
  TeamOutlined, 
  BugOutlined, 
  FileTextOutlined,
  WarningOutlined,
  DatabaseOutlined,
  DeploymentUnitOutlined,
  UserOutlined,
  CodeOutlined,
  SendOutlined,
  ThunderboltOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

interface DailyTask {
  id: string;
  task_category: string;
  task_name: string;
  task_description?: string;
  is_completed: boolean;
  completed?: boolean;
  priority: string;
  created_at?: string;
}

interface AutoPriority {
  id: string;
  type: 'incident' | 'error_spike' | 'roadmap' | 'team' | 'deployment';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  action: string;
  source_data?: any;
}

interface CodeReviewItem {
  id: string;
  pr_number?: string;
  pr_title: string;
  status: string;
  created_at: string;
  author_id?: string;
  reviewer_id?: string;
  quality_score?: number;
  time_in_queue_hours?: number;
  priority_score?: number;
}

interface DailyReport {
  id?: string;
  report_date: string;
  completed_tasks: string[];
  sprint_status: string;
  blockers: string[];
  engineering_risks: string[];
  uptime_log: string;
  security_findings: string[];
  deployment_notes: string[];
  meeting_summaries: string[];
  next_day_priorities: string[];
  submitted: boolean;
}

const taskCategories = [
  { key: 'morning_review', label: 'Morning Technical Review', icon: <ClockCircleOutlined />, color: '#1890ff' },
  { key: 'development', label: 'Development Leadership', icon: <RocketOutlined />, color: '#52c41a' },
  { key: 'strategic', label: 'Strategic Responsibilities', icon: <ExclamationCircleOutlined />, color: '#faad14' },
  { key: 'coordination', label: 'Executive Coordination', icon: <TeamOutlined />, color: '#722ed1' },
  { key: 'stability', label: 'Stability & Compliance', icon: <CheckCircleOutlined />, color: '#13c2c2' },
  { key: 'product', label: 'Product Development', icon: <BugOutlined />, color: '#eb2f96' },
  { key: 'documentation', label: 'Documentation & Reporting', icon: <FileTextOutlined />, color: '#f5222d' },
];

export default function CTODailyWorkflow() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoPriorities, setAutoPriorities] = useState<AutoPriority[]>([]);
  const [codeReviews, setCodeReviews] = useState<CodeReviewItem[]>([]);
  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [today] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchTodayTasks();
    initializeDefaultTasks();
    fetchAutoPriorities();
    fetchCodeReviewQueue();
    fetchDailyReport();
  }, []);

  const initializeDefaultTasks = async () => {
    const { data: existing } = await supabase
      .from('cto_daily_checklist')
      .select('id')
      .eq('checklist_date', today);

    if (!existing || existing.length === 0) {
      const defaultTasks = [
        { task_category: 'morning_review', task_name: 'Infrastructure & System Health Check', priority: 'high' },
        { task_category: 'morning_review', task_name: 'Active Sprint Check-In', priority: 'high' },
        { task_category: 'morning_review', task_name: 'Security Review (Quick Scan)', priority: 'normal' },
        { task_category: 'development', task_name: 'Review Pull Requests', priority: 'high' },
        { task_category: 'development', task_name: 'Manage Developer Team', priority: 'high' },
        { task_category: 'development', task_name: 'System & Feature Planning', priority: 'normal' },
        { task_category: 'strategic', task_name: 'Architecture Governance', priority: 'normal' },
        { task_category: 'strategic', task_name: 'Technology Roadmap Review', priority: 'normal' },
        { task_category: 'strategic', task_name: 'Data & Analytics Management', priority: 'normal' },
        { task_category: 'coordination', task_name: 'CEO Sync Meeting', priority: 'high' },
        { task_category: 'coordination', task_name: 'CFO Sync (if needed)', priority: 'normal' },
        { task_category: 'coordination', task_name: 'Department Syncs (as needed)', priority: 'low' },
        { task_category: 'stability', task_name: 'Security Maintenance', priority: 'normal' },
        { task_category: 'stability', task_name: 'Backup & Redundancy Check', priority: 'normal' },
        { task_category: 'stability', task_name: 'Deployment Reliability Review', priority: 'normal' },
        { task_category: 'product', task_name: 'Feature Scoping', priority: 'normal' },
        { task_category: 'product', task_name: 'QA Testing Review', priority: 'normal' },
        { task_category: 'documentation', task_name: 'Sprint Updates', priority: 'normal' },
        { task_category: 'documentation', task_name: 'Deployment Notes', priority: 'normal' },
        { task_category: 'documentation', task_name: 'Daily CTO Report', priority: 'high' },
      ];

      const { error: insertError } = await supabase.from('cto_daily_checklist').insert(
        defaultTasks.map(task => ({
          ...task,
          checklist_date: today,
          task_description: getTaskDescription(task.task_name),
        }))
      );
      
      if (insertError) {
        console.error('Error initializing default tasks:', insertError);
      }
      fetchTodayTasks();
    }
  };

  const getTaskDescription = (taskName: string): string => {
    const descriptions: Record<string, string> = {
      'Infrastructure & System Health Check': 'Check error logs, server uptime, API latency, Supabase metrics, deployment status',
      'Active Sprint Check-In': 'Review all engineering tickets, update sprint burndown, assign tasks',
      'Security Review (Quick Scan)': 'Check for new vulnerabilities, dependency updates, auth alerts',
      'Review Pull Requests': 'Review and merge approved code, reject faulty code',
      'Manage Developer Team': 'Assign tickets, approve timeline changes, unblock developers',
      'System & Feature Planning': 'Plan next releases, review feature proposals, architecture diagrams',
      'Architecture Governance': 'Oversee entire Crave\'n technical ecosystem',
      'Technology Roadmap Review': 'Maintain 12-month engineering roadmap',
      'Data & Analytics Management': 'Ensure proper data tracking, review dashboards',
      'CEO Sync Meeting': 'Discuss progress, blockers, timelines, improvements',
      'CFO Sync (if needed)': 'Review infrastructure costs, engineering spend',
      'Department Syncs (as needed)': 'Coordinate with Operations, Marketing, Restaurant teams',
      'Security Maintenance': 'Access control, key rotation, database permissions',
      'Backup & Redundancy Check': 'Ensure daily backups, environment isolation',
      'Deployment Reliability Review': 'Zero-downtime releases, rollback plans',
      'Feature Scoping': 'Define requirements, UX flows, API endpoints',
      'QA Testing Review': 'Review bugs, verify fixes, approve builds',
      'Sprint Updates': 'Document sprint progress and updates',
      'Deployment Notes': 'Document all deployments and changes',
      'Daily CTO Report': 'Submit completed tasks, sprint status, blockers, risks',
    };
    return descriptions[taskName] || '';
  };

  const fetchTodayTasks = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('cto_daily_checklist')
        .select('*')
        .eq('checklist_date', today)
        .order('task_category', { ascending: true })
        .order('priority', { ascending: false });

      setTasks((data || []).map(t => ({ ...t, is_completed: t.completed || false })));
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAutoPriorities = async () => {
    try {
      const priorities: AutoPriority[] = [];

      // 1. Check incidents
      const { data: incidents } = await supabase
        .from('it_incidents')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(10);

      incidents?.forEach(incident => {
        const severity = incident.severity === 'critical' ? 'critical' : 
                        incident.severity === 'high' ? 'high' : 
                        incident.severity === 'medium' ? 'medium' : 'low';
        priorities.push({
          id: `incident-${incident.id}`,
          type: 'incident',
          severity,
          title: incident.title,
          description: incident.description || '',
          action: `Review and resolve: ${incident.title}`,
          source_data: incident
        });
      });

      // 2. Check error spikes (simulated - would need error tracking system)
      // For now, check for recent incidents with 'bug' type
      const { data: bugs } = await supabase
        .from('it_incidents')
        .select('*')
        .eq('incident_type', 'bug')
        .gte('created_at', dayjs().subtract(24, 'hours').toISOString())
        .order('created_at', { ascending: false });

      if (bugs && bugs.length > 5) {
        priorities.push({
          id: 'error-spike',
          type: 'error_spike',
          severity: 'high',
          title: `Error Spike Detected: ${bugs.length} bugs in last 24h`,
          description: `Unusual spike in bug reports. Review error logs and system health.`,
          action: 'Add to Morning Technical Review'
        });
      }

      // 3. Check roadmap changes (slip alerts)
      const { data: roadmapAlerts } = await supabase
        .from('cto_roadmap_slip_alerts')
        .select('*, initiative:cto_roadmap_initiatives(title)')
        .eq('resolved', false)
        .order('created_at', { ascending: false })
        .limit(5);

      roadmapAlerts?.forEach(alert => {
        priorities.push({
          id: `roadmap-${alert.id}`,
          type: 'roadmap',
          severity: alert.severity === 'critical' ? 'critical' : 'high',
          title: `Roadmap Slip: ${alert.initiative?.title || 'Unknown Initiative'}`,
          description: alert.message || 'Initiative is behind schedule',
          action: 'Review roadmap and adjust timeline',
          source_data: alert
        });
      });

      // 4. Check team performance (workload imbalance)
      const { data: developers, error: devError } = await supabase
        .from('cto_developers')
        .select('*')
        .eq('availability_status', 'available');
      
      if (devError) {
        console.warn('Error fetching developers:', devError);
      }

      if (developers && developers.length > 0) {
        const maxTickets = Math.max(...developers.map(d => d.active_tickets_count || 0));
        const minTickets = Math.min(...developers.map(d => d.active_tickets_count || 0));
        const imbalance = maxTickets - minTickets;

        if (imbalance > 3 && developers) {
          const overloaded = developers.find(d => d.active_tickets_count === maxTickets);
          priorities.push({
            id: 'team-imbalance',
            type: 'team',
            severity: 'medium',
            title: `Dev Workload Imbalance: Team member is overloaded`,
            description: `Workload gap of ${imbalance} tickets (max: ${maxTickets}, min: ${minTickets}). Consider reassigning tasks.`,
            action: 'Reassign 2 tasks to balance workload',
            source_data: { developers, imbalance, overloaded }
          });
        }
      }

      // 5. Check deployment failures (from architecture changes)
      try {
        const { data: failedDeployments, error: deployError } = await supabase
          .from('cto_architecture_changes')
          .select('*')
          .eq('status', 'rolled_back')
          .gte('created_at', dayjs().subtract(7, 'days').toISOString())
          .order('created_at', { ascending: false })
          .limit(5);

        if (deployError) {
          console.warn('Error fetching deployment failures (table may not exist):', deployError);
        } else if (failedDeployments && failedDeployments.length > 0) {
          priorities.push({
            id: 'deployment-failures',
            type: 'deployment',
            severity: 'high',
            title: `${failedDeployments.length} Deployment Failure(s) in Last 7 Days`,
            description: 'Recent deployments have been rolled back. Review deployment process.',
            action: 'Review deployment reliability and rollback procedures',
            source_data: failedDeployments
          });
        }
      } catch (e) {
        // Table might not exist, ignore
        console.warn('Could not check deployment failures:', e);
      }

      setAutoPriorities(priorities);
    } catch (error) {
      console.error('Error fetching auto priorities:', error);
    }
  };

  const fetchCodeReviewQueue = async () => {
    try {
      const { data: reviews } = await supabase
        .from('cto_code_reviews')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      const reviewsWithMetrics = (reviews || []).map(review => {
        const created = dayjs(review.created_at);
        const now = dayjs();
        const hoursInQueue = now.diff(created, 'hour');
        
        // Calculate priority score: older = higher priority, quality score affects it
        let priorityScore = hoursInQueue * 10; // Base score from time
        if (review.quality_score) {
          priorityScore += (100 - review.quality_score); // Lower quality = higher priority
        }

        return {
          ...review,
          time_in_queue_hours: hoursInQueue,
          priority_score: priorityScore
        };
      }).sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));

      setCodeReviews(reviewsWithMetrics);
    } catch (error) {
      console.error('Error fetching code reviews:', error);
    }
  };

  const fetchDailyReport = async () => {
    try {
      const { data, error } = await supabase
        .from('cto_daily_reports')
        .select('*')
        .eq('report_date', today)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found, which is OK
        console.warn('Error fetching daily report:', error);
      }
      
      setDailyReport(data || null);
    } catch (error) {
      console.warn('Error fetching daily report:', error);
      setDailyReport(null);
    }
  };

  const toggleTask = async (taskId: string, completed: boolean) => {
    try {
      await supabase
        .from('cto_daily_checklist')
        .update({
          completed: !completed,
          completed_at: !completed ? new Date().toISOString() : null,
        })
        .eq('id', taskId);

      fetchTodayTasks();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleAcknowledgeIncident = async (incidentId: string) => {
    try {
      // Update incident status
      await supabase
        .from('it_incidents')
        .update({ status: 'investigating' })
        .eq('id', incidentId);

      // Auto-create DevOps task
      const { data: incident } = await supabase
        .from('it_incidents')
        .select('*')
        .eq('id', incidentId)
        .single();

      if (incident) {
        // Create task in daily checklist
        const { error: taskError } = await supabase
          .from('cto_daily_checklist')
          .insert({
            checklist_date: today,
            task_category: 'stability',
            task_name: `DevOps: Resolve ${incident.title}`,
            task_description: `Auto-created from incident: ${incident.description || ''}`,
            priority: incident.severity === 'critical' ? 'urgent' : 
                     incident.severity === 'high' ? 'high' : 'normal',
            completed: false
          });
        
        if (taskError) {
          console.error('Error creating DevOps task:', taskError);
          message.error('Failed to create DevOps task');
          return;
        }

        message.success('Incident acknowledged. DevOps task created automatically.');
        fetchTodayTasks();
        fetchAutoPriorities();
      }
    } catch (error) {
      console.error('Error acknowledging incident:', error);
      message.error('Failed to acknowledge incident');
    }
  };

  const generateDailyReport = async () => {
    setGeneratingReport(true);
    try {
      const completedTasks = tasks.filter(t => t.is_completed).map(t => t.task_name);
      const pendingTasks = tasks.filter(t => !t.is_completed).map(t => t.task_name);
      
      // Get sprint status
      const { data: activeSprint } = await supabase
        .from('cto_sprints')
        .select('*')
        .eq('status', 'active')
        .maybeSingle();

      // Get blockers
      const { data: blockedTickets } = await supabase
        .from('cto_sprint_tickets')
        .select('*')
        .eq('status', 'blocked')
        .limit(10);

      const blockers = blockedTickets?.map(t => t.title) || [];

      // Get risks from auto priorities
      const risks = autoPriorities
        .filter(p => p.severity === 'high' || p.severity === 'critical')
        .map(p => p.title);

      const report: DailyReport = {
        report_date: today,
        completed_tasks: completedTasks,
        sprint_status: activeSprint ? `${activeSprint.sprint_name} - ${activeSprint.status}` : 'No active sprint',
        blockers,
        engineering_risks: risks,
        uptime_log: 'All systems operational',
        security_findings: [],
        deployment_notes: [],
        meeting_summaries: [],
        next_day_priorities: autoPriorities.slice(0, 5).map(p => p.action),
        submitted: false
      };

      setDailyReport(report);
      setReportModalVisible(true);
    } catch (error) {
      console.error('Error generating report:', error);
      message.error('Failed to generate report');
    } finally {
      setGeneratingReport(false);
    }
  };

  const saveAndSendReport = async () => {
    if (!dailyReport) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const reportData = {
        ...dailyReport,
        submitted: true,
        submitted_at: new Date().toISOString(),
        created_by: user?.id
      };

      // Upsert report
      const { error } = await supabase
        .from('cto_daily_reports')
        .upsert(reportData, { onConflict: 'report_date,created_by' });

      if (error) throw error;

      message.success('Daily report saved and ready to send to CEO');
      setReportModalVisible(false);
      fetchDailyReport();
    } catch (error: any) {
      console.error('Error saving report:', error);
      message.error(error.message || 'Failed to save report');
    }
  };

  const completedCount = tasks.filter(t => t.is_completed || t.completed).length;
  const totalCount = tasks.length;
  const completionPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#f5222d';
      case 'high': return '#fa8c16';
      case 'normal': return '#1890ff';
      case 'low': return '#8c8c8c';
      default: return '#8c8c8c';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'red';
      case 'high': return 'orange';
      case 'medium': return 'gold';
      case 'low': return 'blue';
      default: return 'default';
    }
  };

  const codeReviewColumns = [
    {
      title: 'PR Title',
      dataIndex: 'pr_title',
      key: 'pr_title',
      render: (text: string, record: CodeReviewItem) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          {record.pr_number && <Text type="secondary" style={{ fontSize: '12px' }}>#{record.pr_number}</Text>}
        </Space>
      ),
    },
    {
      title: 'Time in Queue',
      dataIndex: 'time_in_queue_hours',
      key: 'time_in_queue_hours',
      render: (hours: number) => {
        if (hours < 24) return <Tag color="green">{hours}h</Tag>;
        if (hours < 48) return <Tag color="orange">{hours}h</Tag>;
        return <Tag color="red">{hours}h</Tag>;
      },
      sorter: (a: CodeReviewItem, b: CodeReviewItem) => 
        (a.time_in_queue_hours || 0) - (b.time_in_queue_hours || 0),
    },
    {
      title: 'Priority',
      dataIndex: 'priority_score',
      key: 'priority_score',
      render: (score: number) => {
        if (score > 200) return <Tag color="red">Critical</Tag>;
        if (score > 100) return <Tag color="orange">High</Tag>;
        return <Tag color="blue">Normal</Tag>;
      },
      sorter: (a: CodeReviewItem, b: CodeReviewItem) => 
        (b.priority_score || 0) - (a.priority_score || 0),
    },
    {
      title: 'Quality Score',
      dataIndex: 'quality_score',
      key: 'quality_score',
      render: (score?: number) => {
        if (!score) return '-';
        const color = score >= 80 ? 'green' : score >= 60 ? 'orange' : 'red';
        return <Tag color={color}>{score}/100</Tag>;
      },
    },
  ];

  return (
    <div>
      {/* Command Center Header */}
      <Card style={{ marginBottom: 24, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Space direction="vertical" size={0}>
              <Title level={2} style={{ color: 'white', margin: 0 }}>
                <ThunderboltOutlined /> CTO Command Center
              </Title>
              <Text style={{ color: 'rgba(255,255,255,0.9)' }}>
                Mission Control for Today's Technology Operations
              </Text>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button 
                type="primary" 
                size="large"
                icon={<BarChartOutlined />}
                onClick={generateDailyReport}
                loading={generatingReport}
              >
                Generate Daily Report
              </Button>
              <Button 
                size="large"
                icon={<SendOutlined />}
                onClick={() => setReportModalVisible(true)}
                disabled={!dailyReport}
              >
                View/Edit Report
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Auto-Generated Priorities */}
      {autoPriorities.length > 0 && (
        <Card 
          title={
            <Space>
              <WarningOutlined style={{ color: '#fa8c16' }} />
              <span>Auto-Generated Today's Priorities</span>
              <Badge count={autoPriorities.length} style={{ backgroundColor: '#fa8c16' }} />
            </Space>
          }
          style={{ marginBottom: 24 }}
        >
          <List
            dataSource={autoPriorities}
            renderItem={(priority) => (
              <List.Item>
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  <Space>
                    <Tag color={getSeverityColor(priority.severity)}>{priority.severity.toUpperCase()}</Tag>
                    <Text strong>{priority.title}</Text>
                  </Space>
                  <Text type="secondary">{priority.description}</Text>
                  <Space>
                    <Text type="secondary">Action: </Text>
                    <Text code>{priority.action}</Text>
                    {priority.type === 'incident' && priority.source_data && (
                      <Button
                        size="small"
                        type="link"
                        onClick={() => handleAcknowledgeIncident(priority.source_data.id)}
                      >
                        Acknowledge & Create DevOps Task
                      </Button>
                    )}
                  </Space>
                </Space>
              </List.Item>
            )}
          />
        </Card>
      )}

      {/* Code Review Queue */}
      <Card 
        title={
          <Space>
            <CodeOutlined />
            <span>Code Review Queue</span>
            <Badge count={codeReviews.length} style={{ backgroundColor: '#1890ff' }} />
          </Space>
        }
        extra={
          <Button onClick={() => navigate('/cto?tab=code-review')}>
            View All Reviews
          </Button>
        }
        style={{ marginBottom: 24 }}
      >
        {codeReviews.length > 0 ? (
          <Table
            dataSource={codeReviews}
            columns={codeReviewColumns}
            rowKey="id"
            pagination={{ pageSize: 5 }}
            size="small"
          />
        ) : (
          <Alert message="No pending code reviews" type="success" showIcon />
        )}
      </Card>

      {/* Progress Overview */}
      <Row gutter={16} className="mb-6">
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="Today's Progress"
              value={completionPercent}
              suffix="%"
              valueStyle={{ color: completionPercent === 100 ? '#3f8600' : '#1890ff' }}
              prefix={<CheckCircleOutlined />}
            />
            <Progress percent={completionPercent} status={completionPercent === 100 ? 'success' : 'active'} />
            <Text type="secondary" className="text-xs">
              {completedCount} of {totalCount} tasks completed
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="High Priority Tasks"
              value={tasks.filter(t => (t.priority === 'high' || t.priority === 'urgent') && !t.is_completed && !t.completed).length}
              valueStyle={{ color: '#fa8c16' }}
              prefix={<ExclamationCircleOutlined />}
            />
            <Text type="secondary" className="text-xs">
              Remaining urgent/high priority
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Button type="primary" onClick={() => navigate('/cto?tab=sprint')}>
                View Active Sprint
              </Button>
              <Button onClick={() => navigate('/cto?tab=morning-review')}>
                Morning Technical Review
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>

      {completionPercent < 50 && (
        <Alert
          message="Daily Workflow Status"
          description={`You have ${totalCount - completedCount} tasks remaining. Focus on high-priority items first.`}
          type="warning"
          showIcon
          className="mb-4"
        />
      )}

      <Divider>Daily Checklist by Category</Divider>

      <Row gutter={[16, 16]}>
        {taskCategories.map(category => {
          const categoryTasks = tasks.filter(t => t.task_category === category.key);
          const categoryCompleted = categoryTasks.filter(t => t.is_completed || t.completed).length;
          const categoryTotal = categoryTasks.length;

          return (
            <Col xs={24} sm={12} lg={8} key={category.key}>
              <Card
                title={
                  <Space>
                    <span style={{ color: category.color }}>{category.icon}</span>
                    <span>{category.label}</span>
                    <Badge count={categoryTotal - categoryCompleted} style={{ backgroundColor: category.color }} />
                  </Space>
                }
                extra={
                  <Progress
                    type="circle"
                    percent={categoryTotal > 0 ? Math.round((categoryCompleted / categoryTotal) * 100) : 0}
                    size={40}
                    strokeColor={category.color}
                  />
                }
              >
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  {categoryTasks.map(task => (
                    <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Checkbox
                        checked={task.is_completed || task.completed || false}
                        onChange={() => toggleTask(task.id, task.is_completed || task.completed || false)}
                      />
                      <div style={{ flex: 1 }}>
                        <Text delete={task.is_completed || task.completed} style={{ fontSize: '13px' }}>
                          {task.task_name}
                        </Text>
                        {task.task_description && (
                          <div>
                            <Text type="secondary" style={{ fontSize: '11px' }}>
                              {task.task_description}
                            </Text>
                          </div>
                        )}
                      </div>
                      <Badge
                        color={getPriorityColor(task.priority)}
                        text={task.priority}
                        style={{ fontSize: '10px' }}
                      />
                    </div>
                  ))}
                  {categoryTasks.length === 0 && (
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      No tasks for this category today
                    </Text>
                  )}
                </Space>
              </Card>
            </Col>
          );
        })}
      </Row>

      {/* Daily Report Modal */}
      <Modal
        title="CTO Daily Report - Ready to Send to CEO"
        open={reportModalVisible}
        onCancel={() => setReportModalVisible(false)}
        onOk={saveAndSendReport}
        width={800}
        okText="Save & Mark Ready to Send"
      >
        {dailyReport ? (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <div>
              <Title level={5}>Completed Tasks</Title>
              <List
                size="small"
                dataSource={dailyReport.completed_tasks}
                renderItem={item => <List.Item>{item}</List.Item>}
              />
            </div>
            <div>
              <Title level={5}>Sprint Status</Title>
              <Text>{dailyReport.sprint_status}</Text>
            </div>
            {dailyReport.blockers.length > 0 && (
              <div>
                <Title level={5}>Blockers</Title>
                <List
                  size="small"
                  dataSource={dailyReport.blockers}
                  renderItem={item => <List.Item><Text type="danger">{item}</Text></List.Item>}
                />
              </div>
            )}
            {dailyReport.engineering_risks.length > 0 && (
              <div>
                <Title level={5}>Engineering Risks</Title>
                <List
                  size="small"
                  dataSource={dailyReport.engineering_risks}
                  renderItem={item => <List.Item><Text type="warning">{item}</Text></List.Item>}
                />
              </div>
            )}
            <div>
              <Title level={5}>Next Day Priorities</Title>
              <List
                size="small"
                dataSource={dailyReport.next_day_priorities}
                renderItem={item => <List.Item>{item}</List.Item>}
              />
            </div>
          </Space>
        ) : (
          <Spin />
        )}
      </Modal>
    </div>
  );
}
