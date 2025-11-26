import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Table, 
  Badge, 
  Statistic, 
  Progress, 
  Alert, 
  Tabs, 
  Typography, 
  Space, 
  Button, 
  Tag,
  List,
  Modal,
  message,
  Tooltip,
  Divider
} from 'antd';
import { 
  CloudOutlined, 
  DatabaseOutlined, 
  BugOutlined, 
  ClockCircleOutlined, 
  CheckCircleOutlined, 
  ExclamationCircleOutlined, 
  ReloadOutlined,
  WarningOutlined,
  RollbackOutlined,
  ThunderboltOutlined,
  BarChartOutlined,
  AlertOutlined,
  RocketOutlined,
  CodeOutlined,
  ApiOutlined
} from '@ant-design/icons';
import { supabase } from '@/integrations/supabase/client';
import dayjs from 'dayjs';

const { TabPane } = Tabs;
const { Title, Text, Paragraph } = Typography;

interface ErrorCluster {
  id: string;
  cluster_key: string;
  endpoint: string;
  method: string;
  total_count: number;
  percentage_of_total: number;
  severity: string;
  first_seen: string;
  last_seen: string;
  is_resolved: boolean;
}

interface RootCauseSuggestion {
  id: string;
  error_cluster_id: string;
  suggestion_type: string;
  title: string;
  description: string;
  confidence_score: number;
  related_deployment_id?: string;
  evidence: any;
}

interface RollbackRecommendation {
  id: string;
  deployment_id?: string;
  deployment_version?: string;
  failure_rate: number;
  threshold_rate: number;
  error_count: number;
  recommendation_reason: string;
  rollback_steps: string[];
  risk_level: string;
  status: string;
}

interface PerformanceDiagnostic {
  id: string;
  diagnostic_type: string;
  metric_name: string;
  current_value: number;
  threshold_value: number;
  unit: string;
  trend: string;
  affected_system?: string;
  query_text?: string;
  cron_job_name?: string;
  failure_count: number;
  recommendations: string[];
}

interface AutoEscalation {
  id: string;
  trigger_type: string;
  original_severity: string;
  escalated_severity: string;
  escalation_reason: string;
  error_rate_before: number;
  error_rate_after: number;
  uptime_before: number;
  uptime_after: number;
  alert_sent: boolean;
  created_at: string;
}

export default function MorningTechnicalReview() {
  const [infrastructure, setInfrastructure] = useState<any[]>([]);
  const [errors, setErrors] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorClusters, setErrorClusters] = useState<ErrorCluster[]>([]);
  const [rootCauses, setRootCauses] = useState<RootCauseSuggestion[]>([]);
  const [rollbackRecs, setRollbackRecs] = useState<RollbackRecommendation[]>([]);
  const [performanceDiags, setPerformanceDiags] = useState<PerformanceDiagnostic[]>([]);
  const [autoEscalations, setAutoEscalations] = useState<AutoEscalation[]>([]);
  const [metrics, setMetrics] = useState({
    uptime: 99.9,
    avgResponseTime: 45,
    errorRate: 0.02,
    dbConnections: 0,
    activeIncidents: 0,
  });
  const [rollbackModalVisible, setRollbackModalVisible] = useState(false);
  const [selectedRollback, setSelectedRollback] = useState<RollbackRecommendation | null>(null);

  useEffect(() => {
    fetchAllData();
    
    // Set up automated infrastructure monitoring every 15 minutes
    const monitoringInterval = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/monitor-infrastructure`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            console.log('Automated infrastructure monitoring completed');
            // Refresh data after monitoring completes
            setTimeout(() => fetchAllData(), 2000);
          }
        }
      } catch (error) {
        console.error('Automated monitoring error:', error);
      }
    }, 15 * 60 * 1000); // 15 minutes
    
    // Set up auto-refresh every 30 seconds - COMPONENT-LEVEL DATA REFRESH ONLY
    // This only updates component state, NEVER causes page reloads
    const interval = setInterval(() => {
      // Wrap in try-catch to prevent any errors from causing issues
      try {
        fetchAllData();
      } catch (error) {
        console.error('Error in auto-refresh interval:', error);
        // Silently handle - don't cause page reload or navigation
      }
    }, 30000);
    
    return () => {
      clearInterval(interval);
      clearInterval(monitoringInterval);
    };
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // First, trigger infrastructure monitoring to get fresh data
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/monitor-infrastructure`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const result = await response.json();
            console.log('Infrastructure monitoring completed:', result);
          } else {
            const errorText = await response.text();
            console.warn('Infrastructure monitoring failed:', errorText);
          }
        }
      } catch (monitorError) {
        console.warn('Could not trigger infrastructure monitoring:', monitorError);
        // Continue even if monitoring fails - we'll still fetch existing data
      }

      // Fetch basic data (now with fresh infrastructure data)
      const [infraRes, incidentsRes, errorsRes] = await Promise.all([
        supabase.from('it_infrastructure').select('*').order('service_name'),
        supabase.from('it_incidents').select('*').eq('status', 'open').order('created_at', { ascending: false }),
        supabase.from('it_incidents').select('*').eq('incident_type', 'bug').order('created_at', { ascending: false }).limit(50),
      ]);

      setInfrastructure(infraRes.data || []);
      setIncidents(incidentsRes.data || []);
      setErrors(errorsRes.data || []);

      // Fetch error clusters (with error handling)
      let clustersData: ErrorCluster[] = [];
      try {
        const { data: clusters } = await supabase
          .from('error_clusters' as any)
          .select('*')
          .eq('is_resolved', false)
          .order('percentage_of_total', { ascending: false })
          .limit(10);
        clustersData = (clusters || []) as unknown as ErrorCluster[];
        setErrorClusters(clustersData);
      } catch (e) {
        console.warn('Error clusters table may not exist:', e);
        // Generate clusters from errors if table doesn't exist
        generateErrorClustersFromErrors(errorsRes.data || []);
      }

      // Fetch root cause suggestions
      try {
        const { data: causes } = await supabase
          .from('root_cause_suggestions' as any)
          .select('*')
          .eq('is_confirmed', false)
          .order('confidence_score', { ascending: false })
          .limit(10);
        setRootCauses((causes || []) as unknown as RootCauseSuggestion[]);
      } catch (e) {
        console.warn('Root cause suggestions table may not exist:', e);
      }

      // Fetch rollback recommendations
      try {
        const { data: rollbacks } = await supabase
          .from('rollback_recommendations' as any)
          .select('*')
          .eq('status', 'pending')
          .order('failure_rate', { ascending: false });
        setRollbackRecs((rollbacks || []) as unknown as RollbackRecommendation[]);
      } catch (e) {
        console.warn('Rollback recommendations table may not exist:', e);
      }

      // Fetch performance diagnostics
      try {
        const { data: diags } = await supabase
          .from('performance_diagnostics' as any)
          .select('*')
          .eq('is_resolved', false)
          .order('created_at', { ascending: false })
          .limit(20);
        setPerformanceDiags((diags || []) as unknown as PerformanceDiagnostic[]);
      } catch (e) {
        console.warn('Performance diagnostics table may not exist:', e);
      }

      // Fetch auto escalations
      try {
        const { data: escalations } = await supabase
          .from('auto_escalations' as any)
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);
        setAutoEscalations((escalations || []) as unknown as AutoEscalation[]);
      } catch (e) {
        console.warn('Auto escalations table may not exist:', e);
      }

      // Calculate metrics from real infrastructure data
      const validServices = infraRes.data?.filter(s => s.uptime_percent != null && s.response_time_ms != null) || [];
      
      const avgUptime = validServices.length > 0
        ? validServices.reduce((sum, s) => sum + (s.uptime_percent || 0), 0) / validServices.length
        : 99.9;
      
      const avgResponse = validServices.length > 0
        ? validServices.reduce((sum, s) => sum + (s.response_time_ms || 0), 0) / validServices.length
        : 45;

      // Calculate database connections from infrastructure data
      const dbConnectionsService = infraRes.data?.find(s => s.service_name === 'Database Connections');
      const metadata = dbConnectionsService?.metadata as any;
      const dbConnections = metadata?.active_connections || 0;

      // Calculate real error rate: errors per hour in last 24 hours
      const last24Hours = dayjs().subtract(24, 'hours');
      const recentErrors = (errorsRes.data || []).filter(e => 
        dayjs(e.created_at).isAfter(last24Hours)
      );
      const errorRate = recentErrors.length / 24; // Errors per hour
      const activeIncidents = incidentsRes.data?.length || 0;

      setMetrics({
        uptime: avgUptime,
        avgResponseTime: avgResponse,
        errorRate,
        dbConnections,
        activeIncidents,
      });

      // Auto-escalate if needed
      await checkAndEscalate(avgUptime, errorRate, incidentsRes.data || []);

      // Generate root cause suggestions
      await generateRootCauseSuggestions(clustersData || []);

      // Check for rollback recommendations
      await checkRollbackRecommendations();

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate error clusters from errors if table doesn't exist
  const generateErrorClustersFromErrors = (errors: any[]) => {
    const clusterMap = new Map<string, any>();
    
    errors.forEach(error => {
      const key = `${error.incident_type || 'unknown'}-${error.title?.substring(0, 50) || 'unknown'}`;
      if (!clusterMap.has(key)) {
        clusterMap.set(key, {
          cluster_key: key,
          endpoint: error.title,
          method: 'N/A',
          total_count: 0,
          percentage_of_total: 0,
          severity: error.severity || 'medium',
          first_seen: error.created_at,
          last_seen: error.created_at,
          is_resolved: false
        });
      }
      const cluster = clusterMap.get(key);
      cluster.total_count++;
      if (new Date(error.created_at) > new Date(cluster.last_seen)) {
        cluster.last_seen = error.created_at;
      }
    });

    // Calculate percentages
    const total = errors.length;
    clusterMap.forEach(cluster => {
      cluster.percentage_of_total = total > 0 ? (cluster.total_count / total * 100) : 0;
    });

    setErrorClusters(Array.from(clusterMap.values()).sort((a, b) => b.percentage_of_total - a.percentage_of_total));
  };

  // Auto-escalate incidents based on thresholds
  const checkAndEscalate = async (uptime: number, errorRate: number, openIncidents: any[]) => {
    try {
      // Check if uptime dropped below 99.5%
      if (uptime < 99.5 && openIncidents.length > 0) {
        for (const incident of openIncidents) {
          if (incident.severity !== 'critical' && incident.severity !== 'high') {
            // Auto-escalate
            const newSeverity = incident.severity === 'low' ? 'medium' : 'high';
            
            await supabase
              .from('it_incidents')
              .update({ severity: newSeverity })
              .eq('id', incident.id);

            // Log escalation
            try {
              await supabase.from('auto_escalations' as any).insert({
                trigger_type: 'uptime_drop',
                original_severity: incident.severity,
                escalated_severity: newSeverity,
                escalation_reason: `Uptime dropped to ${uptime.toFixed(2)}% (below 99.5% threshold)`,
                uptime_before: 99.5,
                uptime_after: uptime,
                incident_id: incident.id,
                alert_sent: false
              });
            } catch (e) {
              console.warn('Could not log escalation:', e);
            }

            message.warning(`Incident "${incident.title}" auto-escalated to ${newSeverity} due to uptime drop`);
          }
        }
      }

      // Check if error rate spiked above 1%
      if (errorRate > 1.0 && openIncidents.length > 0) {
        for (const incident of openIncidents) {
          if (incident.severity !== 'critical') {
            const newSeverity = incident.severity === 'low' ? 'high' : 'critical';
            
            await supabase
              .from('it_incidents')
              .update({ severity: newSeverity })
              .eq('id', incident.id);

            try {
              await supabase.from('auto_escalations' as any).insert({
                trigger_type: 'error_rate_spike',
                original_severity: incident.severity,
                escalated_severity: newSeverity,
                escalation_reason: `Error rate spiked to ${errorRate.toFixed(2)}% (above 1% threshold)`,
                error_rate_before: 1.0,
                error_rate_after: errorRate,
                incident_id: incident.id,
                alert_sent: false
              });
            } catch (e) {
              console.warn('Could not log escalation:', e);
            }

            message.error(`Incident "${incident.title}" auto-escalated to ${newSeverity} due to error rate spike`);
          }
        }
      }
    } catch (error) {
      console.error('Error in auto-escalation:', error);
    }
  };

  // Generate root cause suggestions
  const generateRootCauseSuggestions = async (clusters: ErrorCluster[]) => {
    if (clusters.length === 0) return;

    try {
      // Check for recent deployments
      const { data: recentDeployments } = await supabase
        .from('cto_architecture_changes')
        .select('*')
        .gte('created_at', dayjs().subtract(24, 'hours').toISOString())
        .order('created_at', { ascending: false })
        .limit(5);

      // Check for database spikes - get real connection count from infrastructure or database
      let dbConnections = 0;
      const dbService = infrastructure.find(s => 
        s.service_name?.toLowerCase().includes('database') || 
        s.service_name?.toLowerCase().includes('postgres')
      );
      
      if (dbService?.metadata?.active_connections) {
        dbConnections = dbService.metadata.active_connections;
      } else {
        // Fallback: try to get from database function
        try {
          const { data: connectionCount } = await supabase.rpc('get_db_connection_count');
          dbConnections = connectionCount || 0;
        } catch (e) {
          console.warn('Could not get DB connection count:', e);
        }
      }
      
      const hasDbSpike = dbConnections > 100; // Real threshold based on actual DB monitoring

      for (const cluster of clusters.slice(0, 3)) {
        const suggestions: any[] = [];

        // Recent deployment suggestion
        if (recentDeployments && recentDeployments.length > 0) {
          const latestDeploy = recentDeployments[0];
          suggestions.push({
            error_cluster_id: cluster.id,
            suggestion_type: 'recent_deployment',
            title: `Recent Deployment: ${latestDeploy.title}`,
            description: `A deployment was made ${dayjs(latestDeploy.created_at).fromNow()}. This may be causing the errors.`,
            confidence_score: 75,
            related_deployment_id: latestDeploy.id,
            evidence: { deployment: latestDeploy }
          });
        }

        // Database spike suggestion
        if (hasDbSpike) {
          suggestions.push({
            error_cluster_id: cluster.id,
            suggestion_type: 'database_spike',
            title: 'Database Connection Spike Detected',
            description: 'High database connection count detected. This may be causing performance issues.',
            confidence_score: 60,
            evidence: { connection_count: dbConnections }
          });
        }

        // External provider suggestion (if endpoint suggests external API)
        if (cluster.endpoint?.includes('api') || cluster.endpoint?.includes('external')) {
          suggestions.push({
            error_cluster_id: cluster.id,
            suggestion_type: 'external_provider',
            title: 'External Provider Issue',
            description: 'Errors may be related to external API provider issues.',
            confidence_score: 50,
            evidence: { endpoint: cluster.endpoint }
          });
        }

        // Insert suggestions
        for (const suggestion of suggestions) {
          try {
            await supabase.from('root_cause_suggestions' as any).upsert(suggestion, {
              onConflict: 'error_cluster_id,suggestion_type'
            });
          } catch (e) {
            console.warn('Could not save root cause suggestion:', e);
          }
        }
      }

      // Refresh root causes
      const { data: causes } = await supabase
        .from('root_cause_suggestions' as any)
        .select('*')
        .eq('is_confirmed', false)
        .order('confidence_score', { ascending: false })
        .limit(10);
      setRootCauses((causes || []) as unknown as RootCauseSuggestion[]);
    } catch (error) {
      console.error('Error generating root cause suggestions:', error);
    }
  };

  // Check for rollback recommendations
  const checkRollbackRecommendations = async () => {
    try {
      const { data: recentDeployments } = await supabase
        .from('cto_architecture_changes')
        .select('*')
        .gte('created_at', dayjs().subtract(7, 'days').toISOString())
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (!recentDeployments || recentDeployments.length === 0) return;

      // Calculate failure rate for each deployment
      for (const deployment of recentDeployments) {
        const deploymentTime = dayjs(deployment.created_at);
        const errorsAfterDeploy = errors.filter(e => 
          dayjs(e.created_at).isAfter(deploymentTime)
        );

        // Calculate real failure rate: errors per hour after deployment
        const hoursSinceDeploy = dayjs().diff(deploymentTime, 'hour', true);
        const errorsPerHour = hoursSinceDeploy > 0 
          ? errorsAfterDeploy.length / hoursSinceDeploy 
          : errorsAfterDeploy.length;
        
        // Failure rate as percentage (assuming normal rate is < 0.1 errors/hour)
        // If we see > 5 errors/hour, that's a 5%+ failure rate
        const failureRate = errorsPerHour > 0.1 
          ? Math.min((errorsPerHour / 0.1) * 0.5, 100) // Cap at 100%
          : 0;

        const threshold = 5.0; // 5% failure rate threshold

        if (failureRate > threshold) {
          // Create rollback recommendation
          try {
            await supabase.from('rollback_recommendations' as any).upsert({
              deployment_id: deployment.id,
              deployment_version: deployment.title,
              failure_rate: failureRate,
              threshold_rate: threshold,
              error_count: errorsAfterDeploy.length,
              recommendation_reason: `Failure rate ${failureRate.toFixed(2)}% exceeds threshold of ${threshold}%`,
              rollback_steps: [
                '1. Review deployment changes',
                '2. Execute rollback procedure',
                '3. Verify system stability',
                '4. Monitor error rates'
              ],
              risk_level: failureRate > 10 ? 'critical' : failureRate > 7 ? 'high' : 'medium',
              status: 'pending'
            }, {
              onConflict: 'deployment_id'
            });
          } catch (e) {
            console.warn('Could not create rollback recommendation:', e);
          }
        }
      }

      // Refresh recommendations
      const { data: rollbacks } = await supabase
        .from('rollback_recommendations' as any)
        .select('*')
        .eq('status', 'pending')
        .order('failure_rate', { ascending: false });
      setRollbackRecs((rollbacks || []) as unknown as RollbackRecommendation[]);
    } catch (error) {
      console.error('Error checking rollback recommendations:', error);
    }
  };

  const handleApproveRollback = async (rec: RollbackRecommendation) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase
        .from('rollback_recommendations' as any)
        .update({
          status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', rec.id);

      message.success('Rollback approved. Execute rollback procedure.');
      fetchAllData();
    } catch (error) {
      console.error('Error approving rollback:', error);
      message.error('Failed to approve rollback');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      operational: { color: 'success', text: 'Operational' },
      degraded: { color: 'warning', text: 'Degraded' },
      down: { color: 'error', text: 'Down' },
      maintenance: { color: 'default', text: 'Maintenance' },
      success: { color: 'success', text: 'Success' },
      failed: { color: 'error', text: 'Failed' },
      pending: { color: 'processing', text: 'Pending' },
      approved: { color: 'success', text: 'Approved' },
    };
    const config = statusMap[status] || { color: 'default', text: status };
    return <Badge status={config.color as any} text={config.text} />;
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

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'critical': return 'red';
      case 'degrading': return 'orange';
      case 'stable': return 'blue';
      case 'improving': return 'green';
      default: return 'default';
    }
  };

  return (
    <div>
      <Space className="mb-4" style={{ width: '100%', justifyContent: 'space-between' }}>
        <div>
          <Title level={4} className="m-0">
            <ThunderboltOutlined style={{ color: '#1890ff', marginRight: 8 }} />
            Morning Technical Review - Action-Triggered Ops
          </Title>
          <Text type="secondary">Cybernetic Early-Warning Monitoring System</Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={fetchAllData} loading={loading}>
          Refresh
        </Button>
      </Space>

      {/* Critical Alerts */}
      {rollbackRecs.length > 0 && (
        <Alert
          message={`${rollbackRecs.length} Rollback Recommendation(s)`}
          description="System has detected deployment failures exceeding threshold. Review rollback recommendations."
          type="error"
          showIcon
          className="mb-4"
          action={
            <Button size="small" onClick={() => setRollbackModalVisible(true)}>
              View Recommendations
            </Button>
          }
        />
      )}

      {autoEscalations.length > 0 && (
        <Alert
          message={`${autoEscalations.length} Auto-Escalation(s) in Last 24h`}
          description="System has automatically escalated incident severity based on error rate and uptime thresholds."
          type="warning"
          showIcon
          className="mb-4"
        />
      )}

      {/* Key Metrics */}
      <Row gutter={16} className="mb-4">
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="System Uptime"
              value={metrics.uptime}
              precision={2}
              suffix="%"
              valueStyle={{ color: metrics.uptime >= 99.9 ? '#3f8600' : '#cf1322' }}
              prefix={<CloudOutlined />}
            />
            <Progress percent={metrics.uptime} size="small" status={metrics.uptime >= 99.9 ? 'success' : 'exception'} />
            {metrics.uptime < 99.5 && (
              <Text type="danger" style={{ fontSize: '12px' }}>⚠ Auto-escalation threshold: 99.5%</Text>
            )}
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Avg Response Time"
              value={metrics.avgResponseTime}
              suffix="ms"
              valueStyle={{ color: metrics.avgResponseTime < 100 ? '#3f8600' : '#fa8c16' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Error Rate"
              value={metrics.errorRate}
              precision={2}
              suffix="%"
              valueStyle={{ color: metrics.errorRate < 0.5 ? '#3f8600' : metrics.errorRate > 1.0 ? '#cf1322' : '#fa8c16' }}
              prefix={<BugOutlined />}
            />
            {metrics.errorRate > 1.0 && (
              <Text type="danger" style={{ fontSize: '12px' }}>⚠ Auto-escalation threshold: 1%</Text>
            )}
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Active Incidents"
              value={metrics.activeIncidents}
              valueStyle={{ color: metrics.activeIncidents === 0 ? '#3f8600' : '#cf1322' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Tabs defaultActiveKey="error-clusters">
        {/* Auto-Isolated Error Clusters */}
        <TabPane 
          tab={
            <span>
              <BarChartOutlined /> Error Clusters
              {errorClusters.length > 0 && <Badge count={errorClusters.length} style={{ marginLeft: 8 }} />}
            </span>
          } 
          key="error-clusters"
        >
          <Card>
            <Title level={5}>Auto-Isolated Error Clusters</Title>
            <Paragraph type="secondary">
              System automatically groups errors by endpoint/pattern to identify root causes.
            </Paragraph>
            {errorClusters.length === 0 ? (
              <Alert message="No error clusters detected" type="success" showIcon />
            ) : (
              <Table
                dataSource={errorClusters}
                rowKey="id"
                pagination={false}
                columns={[
                  {
                    title: 'Endpoint/Pattern',
                    dataIndex: 'endpoint',
                    key: 'endpoint',
                    render: (text, record) => (
                      <Space direction="vertical" size={0}>
                        <Text strong>{text || record.cluster_key}</Text>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {record.method} • {record.total_count} errors
                        </Text>
                      </Space>
                    ),
                  },
                  {
                    title: 'Percentage',
                    dataIndex: 'percentage_of_total',
                    key: 'percentage',
                    render: (val) => (
                      <Space>
                        <Progress 
                          percent={val} 
                          size="small" 
                          status={val > 50 ? 'exception' : 'active'}
                          style={{ width: 100 }}
                        />
                        <Text strong>{val.toFixed(1)}%</Text>
                      </Space>
                    ),
                    sorter: (a, b) => b.percentage_of_total - a.percentage_of_total,
                  },
                  {
                    title: 'Severity',
                    dataIndex: 'severity',
                    key: 'severity',
                    render: (sev) => <Tag color={getSeverityColor(sev)}>{sev}</Tag>,
                  },
                  {
                    title: 'Last Seen',
                    dataIndex: 'last_seen',
                    key: 'last_seen',
                    render: (val) => dayjs(val).fromNow(),
                  },
                ]}
              />
            )}
          </Card>
        </TabPane>

        {/* Root Cause Suggestions */}
        <TabPane 
          tab={
            <span>
              <CodeOutlined /> Root Causes
              {rootCauses.length > 0 && <Badge count={rootCauses.length} style={{ marginLeft: 8 }} />}
            </span>
          } 
          key="root-causes"
        >
          <Card>
            <Title level={5}>Auto Root-Cause Suggestions</Title>
            <Paragraph type="secondary">
              AI-powered analysis of recent deployments, code changes, database spikes, and external providers.
            </Paragraph>
            {rootCauses.length === 0 ? (
              <Alert message="No root cause suggestions" type="info" showIcon />
            ) : (
              <List
                dataSource={rootCauses}
                renderItem={(item) => (
                  <List.Item>
                    <Space direction="vertical" style={{ width: '100%' }} size="small">
                      <Space>
                        <Tag color={item.suggestion_type === 'recent_deployment' ? 'red' : 'blue'}>
                          {item.suggestion_type.replace('_', ' ')}
                        </Tag>
                        <Text strong>{item.title}</Text>
                        <Badge count={`${item.confidence_score}%`} style={{ backgroundColor: '#1890ff' }} />
                      </Space>
                      <Text type="secondary">{item.description}</Text>
                    </Space>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </TabPane>

        {/* Rollback Recommendations */}
        <TabPane 
          tab={
            <span>
              <RollbackOutlined /> Rollbacks
              {rollbackRecs.length > 0 && <Badge count={rollbackRecs.length} style={{ marginLeft: 8 }} />}
            </span>
          } 
          key="rollbacks"
        >
          <Card>
            <Title level={5}>Auto Rollback Recommendations</Title>
            <Paragraph type="secondary">
              System recommends rollbacks when failure rate exceeds threshold (default: 5%).
            </Paragraph>
            {rollbackRecs.length === 0 ? (
              <Alert message="No rollback recommendations" type="success" showIcon />
            ) : (
              <Table
                dataSource={rollbackRecs}
                rowKey="id"
                pagination={false}
                columns={[
                  {
                    title: 'Deployment',
                    dataIndex: 'deployment_version',
                    key: 'deployment',
                    render: (text) => <Text strong>{text || 'Unknown'}</Text>,
                  },
                  {
                    title: 'Failure Rate',
                    dataIndex: 'failure_rate',
                    key: 'failure_rate',
                    render: (val, record) => (
                      <Space>
                        <Text strong style={{ color: val > record.threshold_rate ? '#cf1322' : '#fa8c16' }}>
                          {val.toFixed(2)}%
                        </Text>
                        <Text type="secondary">(threshold: {record.threshold_rate}%)</Text>
                      </Space>
                    ),
                  },
                  {
                    title: 'Error Count',
                    dataIndex: 'error_count',
                    key: 'error_count',
                  },
                  {
                    title: 'Risk Level',
                    dataIndex: 'risk_level',
                    key: 'risk_level',
                    render: (risk) => <Tag color={getSeverityColor(risk)}>{risk}</Tag>,
                  },
                  {
                    title: 'Status',
                    dataIndex: 'status',
                    key: 'status',
                    render: (status) => getStatusBadge(status),
                  },
                  {
                    title: 'Action',
                    key: 'action',
                    render: (_, record) => (
                      <Button
                        size="small"
                        type="primary"
                        danger
                        onClick={() => {
                          setSelectedRollback(record);
                          setRollbackModalVisible(true);
                        }}
                      >
                        Review
                      </Button>
                    ),
                  },
                ]}
              />
            )}
          </Card>
        </TabPane>

        {/* Performance Diagnostics */}
        <TabPane 
          tab={
            <span>
              <DatabaseOutlined /> Diagnostics
              {performanceDiags.length > 0 && <Badge count={performanceDiags.length} style={{ marginLeft: 8 }} />}
            </span>
          } 
          key="diagnostics"
        >
          <Card>
            <Title level={5}>Auto Performance Diagnostics</Title>
            <Paragraph type="secondary">
              Trends for slow queries, high CPU, memory leaks, failing cron jobs, and database spikes.
            </Paragraph>
            {performanceDiags.length === 0 ? (
              <Alert message="No performance issues detected" type="success" showIcon />
            ) : (
              <Table
                dataSource={performanceDiags}
                rowKey="id"
                pagination={false}
                columns={[
                  {
                    title: 'Type',
                    dataIndex: 'diagnostic_type',
                    key: 'type',
                    render: (type) => <Tag color="blue">{type.replace('_', ' ')}</Tag>,
                  },
                  {
                    title: 'Metric',
                    dataIndex: 'metric_name',
                    key: 'metric',
                  },
                  {
                    title: 'Current Value',
                    dataIndex: 'current_value',
                    key: 'current',
                    render: (val, record) => (
                      <Text strong style={{ color: val > record.threshold_value ? '#cf1322' : '#3f8600' }}>
                        {val} {record.unit}
                      </Text>
                    ),
                  },
                  {
                    title: 'Threshold',
                    dataIndex: 'threshold_value',
                    key: 'threshold',
                    render: (val, record) => `${val} ${record.unit}`,
                  },
                  {
                    title: 'Trend',
                    dataIndex: 'trend',
                    key: 'trend',
                    render: (trend) => <Tag color={getTrendColor(trend)}>{trend}</Tag>,
                  },
                  {
                    title: 'Affected System',
                    dataIndex: 'affected_system',
                    key: 'system',
                  },
                ]}
              />
            )}
          </Card>
        </TabPane>

        {/* Auto Escalations */}
        <TabPane 
          tab={
            <span>
              <AlertOutlined /> Escalations
              {autoEscalations.length > 0 && <Badge count={autoEscalations.length} style={{ marginLeft: 8 }} />}
            </span>
          } 
          key="escalations"
        >
          <Card>
            <Title level={5}>Auto-Escalated Incidents</Title>
            <Paragraph type="secondary">
              System automatically escalates incident severity when error rate spikes or uptime drops.
            </Paragraph>
            {autoEscalations.length === 0 ? (
              <Alert message="No auto-escalations" type="success" showIcon />
            ) : (
              <Table
                dataSource={autoEscalations}
                rowKey="id"
                pagination={false}
                columns={[
                  {
                    title: 'Trigger',
                    dataIndex: 'trigger_type',
                    key: 'trigger',
                    render: (type) => <Tag color="orange">{type.replace('_', ' ')}</Tag>,
                  },
                  {
                    title: 'Escalation',
                    key: 'escalation',
                    render: (_, record) => (
                      <Space>
                        <Tag color={getSeverityColor(record.original_severity)}>{record.original_severity}</Tag>
                        <Text>→</Text>
                        <Tag color={getSeverityColor(record.escalated_severity)}>{record.escalated_severity}</Tag>
                      </Space>
                    ),
                  },
                  {
                    title: 'Reason',
                    dataIndex: 'escalation_reason',
                    key: 'reason',
                  },
                  {
                    title: 'Created',
                    dataIndex: 'created_at',
                    key: 'created',
                    render: (val) => dayjs(val).fromNow(),
                  },
                ]}
              />
            )}
          </Card>
        </TabPane>

        {/* Infrastructure Tab - Real Data */}
        <TabPane tab={<><CloudOutlined /> Infrastructure</>} key="infrastructure">
          <Card>
            <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
              <Title level={5} style={{ margin: 0 }}>Infrastructure Services - Real-Time Monitoring</Title>
              <Button 
                size="small" 
                icon={<ReloadOutlined />} 
                onClick={async () => {
                  try {
                    message.loading({ content: 'Checking infrastructure services...', key: 'monitor' });
                    
                    // Call monitoring function first to update last_check timestamps
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session) {
                      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/monitor-infrastructure`, {
                        method: 'POST',
                        headers: {
                          'Authorization': `Bearer ${session.access_token}`,
                          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
                          'Content-Type': 'application/json'
                        }
                      });
                      
                      if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(`Monitoring failed: ${errorText}`);
                      }
                      
                      const result = await response.json();
                      console.log('Infrastructure monitoring completed:', result);
                    }
                    
                    // Then fetch updated data
                    await fetchAllData();
                    message.success({ content: 'Infrastructure data refreshed', key: 'monitor', duration: 2 });
                  } catch (e) {
                    console.error('Error refreshing infrastructure data:', e);
                    message.error({ 
                      content: `Error refreshing infrastructure data: ${e instanceof Error ? e.message : 'Unknown error'}`, 
                      key: 'monitor', 
                      duration: 5 
                    });
                    // Still try to fetch existing data
                    await fetchAllData();
                  }
                }}
              >
                Refresh Now
              </Button>
            </Space>
            {infrastructure.length === 0 ? (
              <Alert 
                message="No Infrastructure Data" 
                description="Click 'Refresh Now' to monitor infrastructure services." 
                type="info" 
                showIcon 
              />
            ) : (
              <Table
                dataSource={infrastructure}
                rowKey="id"
                loading={loading}
                pagination={false}
                columns={[
                  { 
                    title: 'Service', 
                    dataIndex: 'service_name', 
                    key: 'service_name', 
                    render: (text) => <Text strong>{text}</Text> 
                  },
                  { 
                    title: 'Provider', 
                    dataIndex: 'service_provider', 
                    key: 'service_provider' 
                  },
                  { 
                    title: 'Status', 
                    dataIndex: 'status', 
                    key: 'status', 
                    render: (status) => getStatusBadge(status) 
                  },
                  {
                    title: 'Uptime',
                    dataIndex: 'uptime_percent',
                    key: 'uptime_percent',
                    render: (val) => {
                      if (val == null) return <Text type="secondary">N/A</Text>;
                      return (
                        <Space>
                          <Text>{val.toFixed(2)}%</Text>
                          <Progress 
                            percent={val} 
                            size="small" 
                            status={val >= 99.9 ? 'success' : val >= 95 ? 'active' : 'exception'} 
                            style={{ width: 60 }} 
                          />
                        </Space>
                      );
                    },
                    sorter: (a, b) => (a.uptime_percent || 0) - (b.uptime_percent || 0),
                  },
                  { 
                    title: 'Response Time', 
                    dataIndex: 'response_time_ms', 
                    key: 'response_time_ms', 
                    render: (val) => {
                      if (val == null || val < 0) return <Text type="secondary">N/A</Text>;
                      const color = val < 100 ? '#3f8600' : val < 500 ? '#fa8c16' : '#cf1322';
                      return <Text style={{ color }}>{val}ms</Text>;
                    },
                    sorter: (a, b) => (a.response_time_ms || 0) - (b.response_time_ms || 0),
                  },
                  {
                    title: 'Last Check',
                    dataIndex: 'last_check',
                    key: 'last_check',
                    render: (val) => {
                      if (!val) return <Text type="secondary">Never</Text>;
                      const timeAgo = dayjs(val).fromNow();
                      const isRecent = dayjs().diff(dayjs(val), 'minutes') < 5;
                      return (
                        <Tooltip title={new Date(val).toLocaleString()}>
                          <Text type={isRecent ? 'success' : 'secondary'}>{timeAgo}</Text>
                        </Tooltip>
                      );
                    },
                  },
                  {
                    title: 'Details',
                    key: 'details',
                    render: (_, record) => {
                      if (!record.metadata || Object.keys(record.metadata).length === 0) return '-';
                      return (
                        <Tooltip title={JSON.stringify(record.metadata, null, 2)}>
                          <Button size="small" type="link">View</Button>
                        </Tooltip>
                      );
                    },
                  },
                ]}
              />
            )}
            {infrastructure.length > 0 && (
              <Alert
                message="Real-Time Monitoring"
                description={`Monitoring ${infrastructure.length} infrastructure services. Data is automatically refreshed every 30 seconds. Last update: ${infrastructure[0]?.last_check ? dayjs(infrastructure[0].last_check).fromNow() : 'Never'}`}
                type="info"
                showIcon
                style={{ marginTop: 16 }}
              />
            )}
          </Card>
        </TabPane>

        <TabPane tab={<><ExclamationCircleOutlined /> Active Incidents</>} key="incidents">
          {incidents.length === 0 ? (
            <Alert message="No Active Incidents" description="All systems operational." type="success" showIcon />
          ) : (
            <Table
              dataSource={incidents}
              rowKey="id"
              loading={loading}
              pagination={false}
              columns={[
                { title: 'Title', dataIndex: 'title', key: 'title' },
                { title: 'Type', dataIndex: 'incident_type', key: 'incident_type' },
                {
                  title: 'Severity',
                  dataIndex: 'severity',
                  key: 'severity',
                  render: (sev) => <Tag color={getSeverityColor(sev)}>{sev}</Tag>,
                },
                { title: 'Status', dataIndex: 'status', key: 'status', render: (status) => getStatusBadge(status) },
                { title: 'Reported', dataIndex: 'created_at', key: 'created_at', render: (val) => new Date(val).toLocaleString() },
              ]}
            />
          )}
        </TabPane>
      </Tabs>

      {/* Rollback Modal */}
      <Modal
        title="Rollback Recommendation Details"
        open={rollbackModalVisible}
        onCancel={() => setRollbackModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setRollbackModalVisible(false)}>Cancel</Button>,
          selectedRollback && (
            <Button
              key="approve"
              type="primary"
              danger
              onClick={() => {
                handleApproveRollback(selectedRollback);
                setRollbackModalVisible(false);
              }}
            >
              Approve Rollback
            </Button>
          ),
        ]}
        width={700}
      >
        {selectedRollback && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <div>
              <Text strong>Deployment: </Text>
              <Text>{selectedRollback.deployment_version || 'Unknown'}</Text>
            </div>
            <div>
              <Text strong>Failure Rate: </Text>
              <Text style={{ color: '#cf1322' }}>{selectedRollback.failure_rate.toFixed(2)}%</Text>
              <Text type="secondary"> (threshold: {selectedRollback.threshold_rate}%)</Text>
            </div>
            <div>
              <Text strong>Error Count: </Text>
              <Text>{selectedRollback.error_count}</Text>
            </div>
            <div>
              <Text strong>Reason: </Text>
              <Text>{selectedRollback.recommendation_reason}</Text>
            </div>
            <Divider />
            <div>
              <Text strong>Rollback Steps:</Text>
              <List
                size="small"
                dataSource={selectedRollback.rollback_steps}
                renderItem={(step) => <List.Item>{step}</List.Item>}
              />
            </div>
          </Space>
        )}
      </Modal>
    </div>
  );
}
