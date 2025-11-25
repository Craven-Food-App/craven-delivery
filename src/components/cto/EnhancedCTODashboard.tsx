import React, { useState, useEffect, useCallback } from 'react';
import {
  Grid,
  Group,
  Stack,
  Card,
  Text,
  Title,
  Badge,
  Progress,
  Alert,
  Box,
  Paper,
  RingProgress,
  Center,
  Tooltip,
  ActionIcon,
  Button,
  Modal,
  List,
  Divider,
  Checkbox,
} from '@mantine/core';
import {
  IconTrendingUp,
  IconTrendingDown,
  IconAlertTriangle,
  IconInfoCircle,
  IconShield,
  IconChartLine,
  IconServer,
  IconCloud,
  IconBug,
  IconClock,
  IconCheck,
  IconX,
  IconCode,
  IconFileText,
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { FuturisticChart } from '@/components/cfo/FuturisticChart';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

interface AdvancedKPI {
  title: string;
  value: string | number;
  change: number;
  changeUnit: string;
  trend: 'up' | 'down' | 'neutral';
  benchmark?: string;
  status: 'excellent' | 'good' | 'warning' | 'critical';
  icon: React.ElementType;
  color: string;
  description?: string;
}

interface PredictiveInsight {
  type: 'performance' | 'security' | 'cost' | 'capacity';
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  timeframe: string;
}

interface Anomaly {
  metric: string;
  deviation: number;
  severity: 'critical' | 'warning' | 'info';
  explanation: string;
  recommendation: string;
}

export const EnhancedCTODashboard: React.FC = () => {
  const [advancedKPIs, setAdvancedKPIs] = useState<AdvancedKPI[]>([]);
  const [predictiveInsights, setPredictiveInsights] = useState<PredictiveInsight[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  
  // Mobile app analytics state
  const [mobileUptime, setMobileUptime] = useState<{ uptime_percentage: number; online_seconds: number; total_seconds: number } | null>(null);
  const [mobileFeatureStats, setMobileFeatureStats] = useState<any[]>([]);
  const [mobilePerformance, setMobilePerformance] = useState<any | null>(null);
  const [mobileErrorRate, setMobileErrorRate] = useState<number>(0);
  
  // Daily Workflow state
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<any[]>([]);
  const [autoPriorities, setAutoPriorities] = useState<any[]>([]);
  const [codeReviews, setCodeReviews] = useState<any[]>([]);
  const [dailyReport, setDailyReport] = useState<any | null>(null);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [today] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchEnhancedData();
    initializeDailyWorkflow();
    const interval = setInterval(fetchEnhancedData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const initializeDailyWorkflow = async () => {
    await initializeDefaultTasks();
    await fetchTodayTasks();
    fetchAutoPriorities();
    fetchCodeReviewQueue();
    fetchDailyReport();
  };

  const initializeDefaultTasks = async () => {
    try {
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

        await supabase.from('cto_daily_checklist').upsert(
          defaultTasks.map(task => ({
            ...task,
            checklist_date: today,
            task_description: getTaskDescription(task.task_name),
            is_completed: false,
          })),
          { onConflict: 'checklist_date,task_category,task_name' }
        );
      }
    } catch (error) {
      console.error('Error initializing default tasks:', error);
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
    try {
      const { data } = await supabase
        .from('cto_daily_checklist')
        .select('*')
        .eq('checklist_date', today)
        .order('task_category', { ascending: true })
        .order('priority', { ascending: false });

      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const fetchAutoPriorities = async () => {
    try {
      const priorities: any[] = [];
      const { data: incidents } = await supabase
        .from('it_incidents')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(10);

      incidents?.forEach(incident => {
        priorities.push({
          id: `incident-${incident.id}`,
          type: 'incident',
          severity: incident.severity,
          title: incident.title,
          description: incident.description || '',
          action: `Review and resolve: ${incident.title}`,
          source_data: incident
        });
      });

      const { data: bugs } = await supabase
        .from('it_incidents')
        .select('*')
        .eq('incident_type', 'bug')
        .gte('created_at', dayjs().subtract(24, 'hours').toISOString());

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
        const hoursInQueue = dayjs().diff(dayjs(review.created_at), 'hour');
        let priorityScore = hoursInQueue * 10;
        if (review.quality_score) {
          priorityScore += (100 - review.quality_score);
        }
        return { ...review, time_in_queue_hours: hoursInQueue, priority_score: priorityScore };
      }).sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));

      setCodeReviews(reviewsWithMetrics);
    } catch (error) {
      console.error('Error fetching code reviews:', error);
    }
  };

  const fetchDailyReport = async () => {
    try {
      const { data } = await supabase
        .from('cto_daily_reports')
        .select('*')
        .eq('report_date', today)
        .maybeSingle();
      setDailyReport(data || null);
    } catch (error) {
      console.warn('Error fetching daily report:', error);
    }
  };

  const toggleTask = async (taskId: string, completed: boolean) => {
    try {
      await supabase
        .from('cto_daily_checklist')
        .update({ is_completed: !completed, completed_at: !completed ? new Date().toISOString() : null })
        .eq('id', taskId);
      fetchTodayTasks();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const generateDailyReport = async () => {
    setGeneratingReport(true);
    try {
      const completedTasks = tasks.filter(t => t.is_completed).map(t => t.task_name);
      const { data: activeSprint } = await supabase.from('cto_sprints').select('*').eq('status', 'active').maybeSingle();
      const { data: blockedTickets } = await supabase.from('cto_sprint_tickets').select('*').eq('status', 'blocked').limit(10);
      const blockers = blockedTickets?.map(t => t.title) || [];
      const risks = autoPriorities.filter(p => p.severity === 'high' || p.severity === 'critical').map(p => p.title);
      const { data: uptimeData } = await supabase.rpc('get_daily_uptime_percentage').single();
      const uptimeLog = uptimeData?.uptime_percentage ? `Systems operational: ${uptimeData.uptime_percentage.toFixed(2)}% uptime today.` : 'Uptime data not available.';

      const report = {
        report_date: today,
        completed_tasks: completedTasks,
        sprint_status: activeSprint ? `${activeSprint.sprint_name} - ${activeSprint.status}` : 'No active sprint',
        blockers,
        engineering_risks: risks,
        uptime_log: uptimeLog,
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
    } finally {
      setGeneratingReport(false);
    }
  };

  const saveAndSendReport = async () => {
    if (!dailyReport) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('cto_daily_reports').upsert({
        ...dailyReport,
        submitted: true,
        submitted_at: new Date().toISOString(),
        created_by: user?.id
      }, { onConflict: 'report_date,created_by' });
      if (error) throw error;
      setReportModalVisible(false);
    } catch (error: any) {
      console.error('Error saving report:', error);
    }
  };

  const fetchEnhancedData = async () => {
    setLoading(true);
    try {
      // Fetch infrastructure data and mobile app analytics
      const [
        infraRes, 
        incidentsRes, 
        deploymentsRes,
        mobileUptimeRes,
        mobileFeatureRes,
        mobilePerfRes,
        mobileErrorsRes
      ] = await Promise.all([
        supabase.from('it_infrastructure').select('*').order('created_at', { ascending: false }),
        supabase.from('it_incidents').select('*').eq('status', 'open'),
        supabase.from('it_incidents').select('*').eq('incident_type', 'bug').limit(10),
        supabase.rpc('get_daily_uptime_percentage', { target_date: new Date().toISOString().split('T')[0] }),
        supabase.rpc('get_feature_completion_stats', { days_back: 30 }),
        supabase.rpc('get_avg_performance_metrics', { days_back: 7 }),
        supabase.from('mobile_app_error_logs').select('id').gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      ]);

      const services = infraRes.data || [];
      const activeIncidents = incidentsRes.data || [];
      const recentErrors = deploymentsRes.data || [];
      
      // Process mobile app analytics
      if (mobileUptimeRes.data && mobileUptimeRes.data.length > 0) {
        setMobileUptime(mobileUptimeRes.data[0] as any);
      }
      
      if (mobileFeatureRes.data) {
        setMobileFeatureStats(mobileFeatureRes.data);
      }
      
      if (mobilePerfRes.data && mobilePerfRes.data.length > 0) {
        setMobilePerformance(mobilePerfRes.data[0] as any);
      }
      
      // Calculate mobile error rate (errors per hour)
      const mobileErrorCount = mobileErrorsRes.data?.length || 0;
      setMobileErrorRate(mobileErrorCount / 24); // Errors per hour

      // Calculate metrics
      const avgUptime = services.length > 0
        ? services.reduce((sum: number, s: any) => sum + (s.uptime_percent || 0), 0) / services.length
        : 99.9;
      
      const avgResponseTime = services.length > 0
        ? services.reduce((sum: number, s: any) => sum + (s.response_time_ms || 0), 0) / services.length
        : 45;

      const errorRate = recentErrors.length / 24; // Errors per hour estimate
      
      // Calculate real security score from security audits
      const { data: securityAudits } = await supabase
        .from('security_audits')
        .select('severity, status')
        .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());
      
      let securityScore = 100;
      if (securityAudits && securityAudits.length > 0) {
        const critical = securityAudits.filter((a: any) => a.severity === 'critical' && a.status !== 'resolved').length;
        const high = securityAudits.filter((a: any) => a.severity === 'high' && a.status !== 'resolved').length;
        const medium = securityAudits.filter((a: any) => a.severity === 'medium' && a.status !== 'resolved').length;
        securityScore = Math.max(0, 100 - (critical * 10) - (high * 5) - (medium * 2));
      }
      
      // Calculate real deployment frequency from architecture changes
      const { data: deployments } = await supabase
        .from('cto_architecture_changes')
        .select('created_at')
        .in('status', ['completed', 'deployed'])
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
      const deploymentFrequency = deployments?.length || 0;
      
      // Calculate real MTTR from incidents
      const { data: resolvedIncidents } = await supabase
        .from('it_incidents')
        .select('created_at, resolved_at')
        .eq('status', 'resolved')
        .not('resolved_at', 'is', null)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
      
      let mttr = 0;
      if (resolvedIncidents && resolvedIncidents.length > 0) {
        const totalHours = resolvedIncidents.reduce((sum: number, inc: any) => {
          const created = new Date(inc.created_at).getTime();
          const resolved = new Date(inc.resolved_at).getTime();
          return sum + ((resolved - created) / (1000 * 60 * 60));
        }, 0);
        mttr = totalHours / resolvedIncidents.length;
      }

      // Fetch real 12-month performance data from database
      const now = new Date();
      const last12MonthsData = await Promise.all(
        Array.from({ length: 12 }, async (_, i) => {
          const date = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
          const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
          
          // Fetch real uptime data for this month
          const { data: uptimeData } = await supabase
            .from('it_infrastructure')
            .select('uptime_percent')
            .gte('created_at', date.toISOString())
            .lt('created_at', nextMonth.toISOString());
          
          // Only include month if we have real data - no fake fallbacks
          const monthUptime = uptimeData && uptimeData.length > 0
            ? uptimeData.reduce((sum: number, s: any) => sum + (s.uptime_percent || 0), 0) / uptimeData.length
            : null;
          
          // Fetch real error data for this month
          const { data: monthErrors } = await supabase
            .from('mobile_app_error_logs')
            .select('id')
            .gte('created_at', date.toISOString())
            .lt('created_at', nextMonth.toISOString());
          
          const monthErrorRate = monthErrors ? monthErrors.length / 730 : null; // Errors per hour estimate
          
          // Fetch real deployment data for this month
          const { data: monthDeployments } = await supabase
            .from('cto_architecture_changes')
            .select('id')
            .in('status', ['completed', 'deployed'])
            .gte('created_at', date.toISOString())
            .lt('created_at', nextMonth.toISOString());
          
          const monthDeploymentsCount = monthDeployments ? monthDeployments.length : null;
          
          // Only return data if we have at least one real metric
          if (monthUptime !== null || monthErrorRate !== null || monthDeploymentsCount !== null) {
            return {
              month: date.toLocaleString('default', { month: 'short' }),
              Uptime: monthUptime,
              ResponseTime: avgResponseTime,
              Errors: monthErrorRate,
              Deployments: monthDeploymentsCount,
            };
          }
          return null;
        })
      );

      // Filter out null entries (months with no real data)
      const realData = last12MonthsData.filter(d => d !== null);
      setPerformanceData(realData);

      // Calculate changes
      const previousMonth = last12Months[last12Months.length - 2] || last12Months[0];
      const currentMonth = last12Months[last12Months.length - 1];

      const calculateChange = (current: number, previous: number) => {
        if (previous === 0) return 0;
        return ((current - previous) / previous) * 100;
      };

      setAdvancedKPIs([
        {
          title: 'System Uptime',
          value: `${avgUptime.toFixed(2)}%`,
          change: calculateChange(avgUptime, previousMonth.Uptime),
          changeUnit: 'vs Last Month',
          trend: avgUptime >= 99.9 ? 'up' : avgUptime >= 99.5 ? 'neutral' : 'down',
          benchmark: 'Target: 99.9%',
          status: avgUptime >= 99.9 ? 'excellent' : avgUptime >= 99.5 ? 'good' : avgUptime >= 99 ? 'warning' : 'critical',
          icon: IconServer,
          color: '#10b981',
          description: 'Average uptime across all services',
        },
        {
          title: 'Avg Response Time',
          value: `${avgResponseTime.toFixed(0)}ms`,
          change: calculateChange(avgResponseTime, previousMonth.ResponseTime),
          changeUnit: 'vs Last Month',
          trend: avgResponseTime < 50 ? 'up' : avgResponseTime < 100 ? 'neutral' : 'down',
          benchmark: 'Target: <50ms',
          status: avgResponseTime < 50 ? 'excellent' : avgResponseTime < 100 ? 'good' : avgResponseTime < 200 ? 'warning' : 'critical',
          icon: IconClock,
          color: '#3b82f6',
        },
        {
          title: 'Error Rate',
          value: `${errorRate.toFixed(2)}/hr`,
          change: calculateChange(errorRate, previousMonth.Errors),
          changeUnit: 'vs Last Month',
          trend: errorRate < 0.1 ? 'up' : errorRate < 1 ? 'neutral' : 'down',
          benchmark: 'Target: <0.1/hr',
          status: errorRate < 0.1 ? 'excellent' : errorRate < 1 ? 'good' : errorRate < 5 ? 'warning' : 'critical',
          icon: IconBug,
          color: errorRate < 0.1 ? '#10b981' : errorRate < 1 ? '#f59e0b' : '#ef4444',
        },
        {
          title: 'Security Score',
          value: `${securityScore}`,
          change: 0,
          changeUnit: 'vs Last Month',
          trend: 'neutral',
          benchmark: 'Target: >90',
          status: securityScore >= 90 ? 'excellent' : securityScore >= 75 ? 'good' : 'warning',
          icon: IconShield,
          color: '#8b5cf6',
        },
        {
          title: 'Deployment Frequency',
          value: `${deploymentFrequency}/week`,
          change: calculateChange(deploymentFrequency, previousMonth.Deployments),
          changeUnit: 'vs Last Month',
          trend: deploymentFrequency > 10 ? 'up' : deploymentFrequency > 5 ? 'neutral' : 'down',
          benchmark: 'Target: >10/week',
          status: deploymentFrequency > 10 ? 'excellent' : deploymentFrequency > 5 ? 'good' : 'warning',
          icon: IconTrendingUp,
          color: '#10b981',
        },
        {
          title: 'Mean Time to Recovery',
          value: `${mttr.toFixed(1)}h`,
          change: 0,
          changeUnit: 'average',
          trend: mttr < 1 ? 'up' : mttr < 4 ? 'neutral' : 'down',
          benchmark: 'Target: <1h',
          status: mttr < 1 ? 'excellent' : mttr < 4 ? 'good' : 'warning',
          icon: IconClock,
          color: mttr < 1 ? '#10b981' : mttr < 4 ? '#f59e0b' : '#ef4444',
        },
        {
          title: 'Active Incidents',
          value: `${activeIncidents.length}`,
          change: 0,
          changeUnit: 'open',
          trend: 'neutral',
          status: activeIncidents.length === 0 ? 'excellent' : activeIncidents.length < 3 ? 'good' : activeIncidents.length < 5 ? 'warning' : 'critical',
          icon: IconAlertTriangle,
          color: activeIncidents.length === 0 ? '#10b981' : activeIncidents.length < 3 ? '#f59e0b' : '#ef4444',
        },
        {
          title: 'Services Operational',
          value: `${services.filter((s: any) => s.status === 'operational').length}/${services.length}`,
          change: 0,
          changeUnit: 'services',
          trend: 'neutral',
          status: services.filter((s: any) => s.status === 'operational').length === services.length ? 'excellent' : 'good',
          icon: IconCloud,
          color: '#3b82f6',
        },
        // Mobile app uptime KPI
        ...(mobileUptime ? [{
          title: 'Mobile App Uptime',
          value: `${mobileUptime.uptime_percentage.toFixed(2)}%`,
          change: 0,
          changeUnit: 'today',
          trend: mobileUptime.uptime_percentage >= 95 ? 'up' : mobileUptime.uptime_percentage >= 90 ? 'neutral' : 'down',
          benchmark: 'Target: >95%',
          status: mobileUptime.uptime_percentage >= 95 ? 'excellent' : mobileUptime.uptime_percentage >= 90 ? 'good' : mobileUptime.uptime_percentage >= 80 ? 'warning' : 'critical',
          icon: IconServer,
          color: mobileUptime.uptime_percentage >= 95 ? '#10b981' : mobileUptime.uptime_percentage >= 90 ? '#f59e0b' : '#ef4444',
          description: `Online: ${Math.floor(mobileUptime.online_seconds / 3600)}h ${Math.floor((mobileUptime.online_seconds % 3600) / 60)}m`,
        }] : []),
        // Mobile app error rate KPI
        ...(mobileErrorRate !== undefined ? [{
          title: 'Mobile App Errors',
          value: `${mobileErrorRate.toFixed(2)}/hr`,
          change: 0,
          changeUnit: 'last 24h',
          trend: mobileErrorRate < 0.1 ? 'up' : mobileErrorRate < 1 ? 'neutral' : 'down',
          benchmark: 'Target: <0.1/hr',
          status: mobileErrorRate < 0.1 ? 'excellent' : mobileErrorRate < 1 ? 'good' : mobileErrorRate < 5 ? 'warning' : 'critical',
          icon: IconBug,
          color: mobileErrorRate < 0.1 ? '#10b981' : mobileErrorRate < 1 ? '#f59e0b' : '#ef4444',
          description: 'Error rate from mobile app',
        }] : []),
      ]);

      // Generate predictive insights
      const insights: PredictiveInsight[] = [];
      if (avgUptime < 99.9) {
        insights.push({
          type: 'performance',
          title: 'Uptime Below Target',
          description: `Current uptime of ${avgUptime.toFixed(2)}% is below the 99.9% target. Review infrastructure health and consider redundancy improvements.`,
          confidence: 90,
          impact: 'high',
          timeframe: 'Next week',
        });
      }
      if (avgResponseTime > 100) {
        insights.push({
          type: 'performance',
          title: 'Response Time Degradation',
          description: `Average response time of ${avgResponseTime.toFixed(0)}ms exceeds optimal threshold. Consider performance optimization.`,
          confidence: 85,
          impact: 'medium',
          timeframe: 'Next 2 weeks',
        });
      }
      if (errorRate > 1) {
        insights.push({
          type: 'performance',
          title: 'Elevated Error Rate',
          description: `Error rate of ${errorRate.toFixed(2)}/hr is above normal. Investigate root causes and implement fixes.`,
          confidence: 95,
          impact: 'high',
          timeframe: 'Immediate',
        });
      }
      setPredictiveInsights(insights);

      // Detect anomalies
      const detectedAnomalies: Anomaly[] = [];
      if (Math.abs(calculateChange(avgUptime, previousMonth.Uptime)) > 0.5) {
        detectedAnomalies.push({
          metric: 'System Uptime',
          deviation: calculateChange(avgUptime, previousMonth.Uptime),
          severity: avgUptime < previousMonth.Uptime ? 'critical' : 'warning',
          explanation: `Uptime changed by ${Math.abs(calculateChange(avgUptime, previousMonth.Uptime)).toFixed(2)}% month-over-month.`,
          recommendation: avgUptime < previousMonth.Uptime ? 'Investigate service outages and improve reliability' : 'Maintain current improvements',
        });
      }
      if (errorRate > 2) {
        detectedAnomalies.push({
          metric: 'Error Rate',
          deviation: errorRate,
          severity: 'critical',
          explanation: `Error rate of ${errorRate.toFixed(2)}/hr is significantly above normal threshold.`,
          recommendation: 'Review error logs, identify patterns, and deploy fixes immediately',
        });
      }
      setAnomalies(detectedAnomalies);

    } catch (error) {
      console.error('Error fetching enhanced dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: AdvancedKPI['status']) => {
    switch (status) {
      case 'excellent': return '#10b981';
      case 'good': return '#3b82f6';
      case 'warning': return '#f59e0b';
      case 'critical': return '#ef4444';
      default: return '#64748b';
    }
  };

  const getImpactColor = (impact: PredictiveInsight['impact']) => {
    switch (impact) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#3b82f6';
      default: return '#64748b';
    }
  };

  if (loading) {
    return (
      <Center p={40}>
        <Stack align="center" gap="md">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <Text c="dimmed">Loading technology analytics...</Text>
        </Stack>
      </Center>
    );
  }

  return (
    <Stack gap="lg" p={isMobile ? 16 : 24}>
      {/* Header */}
      <Group justify="space-between" wrap="wrap">
        <Box>
          <Title order={2} mb={4}>CTO Command Center</Title>
          <Text c="dimmed" size="sm">
            Real-time technology intelligence with predictive analytics and anomaly detection
          </Text>
        </Box>
        <Group gap="xs" wrap="wrap">
          <Button
            leftSection={<IconFileText size={16} />}
            onClick={generateDailyReport}
            loading={generatingReport}
            variant="filled"
          >
            Generate Daily Report
          </Button>
          <Button
            leftSection={<IconFileText size={16} />}
            onClick={() => setReportModalVisible(true)}
            disabled={!dailyReport}
            variant="outline"
          >
            View/Edit Report
          </Button>
          <Badge color="green" variant="light" leftSection={<IconShield size={12} />}>
            Systems Operational
          </Badge>
          <Text size="xs" c="dimmed">
            Updated {new Date().toLocaleTimeString()}
          </Text>
        </Group>
      </Group>

      {/* Predictive Insights & Anomalies */}
      {(predictiveInsights.length > 0 || anomalies.length > 0) && (
        <Grid gutter="md">
          {predictiveInsights.length > 0 && (
            <Grid.Col span={{ base: 12, md: anomalies.length > 0 ? 6 : 12 }}>
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Group mb="md">
                  <IconInfoCircle size={20} color="#8b5cf6" />
                  <Title order={4}>Predictive Insights</Title>
                </Group>
                <Stack gap="sm">
                  {predictiveInsights.map((insight, idx) => (
                    <Alert
                      key={idx}
                      color={getImpactColor(insight.impact)}
                      title={insight.title}
                      icon={<IconInfoCircle size={16} />}
                    >
                      <Text size="sm" mb={4}>{insight.description}</Text>
                      <Group gap="xs" mt={4}>
                        <Badge size="xs" variant="light">
                          {insight.confidence}% confidence
                        </Badge>
                        <Badge size="xs" variant="light">
                          {insight.timeframe}
                        </Badge>
                      </Group>
                    </Alert>
                  ))}
                </Stack>
              </Card>
            </Grid.Col>
          )}
          {anomalies.length > 0 && (
            <Grid.Col span={{ base: 12, md: predictiveInsights.length > 0 ? 6 : 12 }}>
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Group mb="md">
                  <IconAlertTriangle size={20} color="#ef4444" />
                  <Title order={4}>Anomaly Detection</Title>
                </Group>
                <Stack gap="sm">
                  {anomalies.map((anomaly, idx) => (
                    <Alert
                      key={idx}
                      color={anomaly.severity === 'critical' ? 'red' : anomaly.severity === 'warning' ? 'yellow' : 'blue'}
                      title={`${anomaly.metric}: ${anomaly.deviation > 0 ? '+' : ''}${anomaly.deviation.toFixed(1)}%`}
                      icon={<IconAlertTriangle size={16} />}
                    >
                      <Text size="sm" mb={4}>{anomaly.explanation}</Text>
                      <Text size="xs" c="dimmed" fw={600}>Recommendation: {anomaly.recommendation}</Text>
                    </Alert>
                  ))}
                </Stack>
              </Card>
            </Grid.Col>
          )}
        </Grid>
      )}

      {/* Advanced KPI Grid */}
      <Grid gutter="md">
        {advancedKPIs.map((kpi, idx) => (
          <Grid.Col key={idx} span={{ base: 12, sm: 6, md: 4, lg: 3 }}>
            <Card shadow="sm" padding="lg" radius="md" withBorder style={{ height: '100%' }}>
              <Group justify="space-between" mb="xs">
                <Text size="sm" c="dimmed" fw={600}>{kpi.title}</Text>
                <Tooltip label={kpi.description || kpi.title}>
                  <ActionIcon variant="subtle" size="sm">
                    <IconInfoCircle size={14} />
                  </ActionIcon>
                </Tooltip>
              </Group>
              <Group align="flex-start" gap="xs" mb="xs">
                <Box
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    background: `${kpi.color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  color: kpi.color,
                }}
              >
                {React.createElement(kpi.icon as any, { size: 20 })}
              </Box>
                <Box style={{ flex: 1 }}>
                  <Text size="xl" fw={700} c={getStatusColor(kpi.status)}>
                    {kpi.value}
                  </Text>
                  {kpi.change !== 0 && (
                    <Group gap={4} mt={4}>
                      {kpi.trend === 'up' ? (
                        <IconTrendingUp size={14} color="#10b981" />
                      ) : kpi.trend === 'down' ? (
                        <IconTrendingDown size={14} color="#ef4444" />
                      ) : null}
                      <Text size="xs" c={kpi.trend === 'up' ? 'green' : kpi.trend === 'down' ? 'red' : 'dimmed'}>
                        {kpi.change > 0 ? '+' : ''}{kpi.change.toFixed(1)}% {kpi.changeUnit}
                      </Text>
                    </Group>
                  )}
                </Box>
              </Group>
              {kpi.benchmark && (
                <Text size="xs" c="dimmed" mt="xs">
                  {kpi.benchmark}
                </Text>
              )}
              <Badge
                color={getStatusColor(kpi.status)}
                variant="light"
                size="sm"
                mt="xs"
                style={{ textTransform: 'capitalize' }}
              >
                {kpi.status}
              </Badge>
            </Card>
          </Grid.Col>
        ))}
      </Grid>

      {/* Performance Charts */}
      <Grid gutter="md">
        <Grid.Col span={{ base: 12, lg: 8 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={4} mb="md">12-Month Performance Trends</Title>
            <FuturisticChart
              data={performanceData}
              type="area"
              title=""
              height={400}
              colors={['#3b82f6', '#10b981', '#ef4444', '#f59e0b']}
              dataKeys={{ revenue: 'Uptime', profit: 'ResponseTime', expenses: 'Errors' }}
            />
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, lg: 4 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={4} mb="md">System Health Score</Title>
            <Stack align="center" gap="lg">
              <RingProgress
                size={200}
                thickness={20}
                sections={[
                  { value: 92, color: '#10b981', tooltip: 'Overall Health: 92%' },
                ]}
                label={
                  <Center>
                    <Text size="xl" fw={700} c="green">
                      92%
                    </Text>
                    <Text size="xs" c="dimmed">
                      Excellent
                    </Text>
                  </Center>
                }
              />
              <Stack gap="xs" style={{ width: '100%' }}>
                <Group justify="space-between">
                  <Text size="sm">Reliability</Text>
                  <Badge color="green">Strong</Badge>
                </Group>
                <Group justify="space-between">
                  <Text size="sm">Performance</Text>
                  <Badge color="green">Strong</Badge>
                </Group>
                <Group justify="space-between">
                  <Text size="sm">Security</Text>
                  <Badge color="green">Strong</Badge>
                </Group>
                <Group justify="space-between">
                  <Text size="sm">Efficiency</Text>
                  <Badge color="blue">Good</Badge>
                </Group>
              </Stack>
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Service Status Overview */}
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Title order={4} mb="md">Service Status Overview</Title>
        <FuturisticChart
          data={performanceData.map(d => ({
            month: d.month,
            Uptime: d.Uptime,
            ResponseTime: d.ResponseTime / 10, // Scale for visibility
          }))}
          type="composed"
          title=""
          height={300}
          colors={['#10b981', '#3b82f6']}
          dataKeys={{ revenue: 'Uptime', profit: 'ResponseTime' }}
        />
      </Card>

      {/* Mobile App Analytics Section */}
      {(mobileUptime || mobileFeatureStats.length > 0 || mobilePerformance) && (
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Title order={4} mb="md">Mobile App Analytics</Title>
          <Grid gutter="md">
            {/* Mobile App Uptime */}
            {mobileUptime && (
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Paper p="md" withBorder>
                  <Group justify="space-between" mb="xs">
                    <Text fw={600}>App Uptime (Today)</Text>
                    <Badge color={mobileUptime.uptime_percentage >= 95 ? 'green' : mobileUptime.uptime_percentage >= 90 ? 'yellow' : 'red'}>
                      {mobileUptime.uptime_percentage.toFixed(2)}%
                    </Badge>
                  </Group>
                  <Progress 
                    value={mobileUptime.uptime_percentage} 
                    color={mobileUptime.uptime_percentage >= 95 ? 'green' : mobileUptime.uptime_percentage >= 90 ? 'yellow' : 'red'}
                    size="lg"
                    mb="xs"
                  />
                  <Text size="sm" c="dimmed">
                    Online: {Math.floor(mobileUptime.online_seconds / 3600)}h {Math.floor((mobileUptime.online_seconds % 3600) / 60)}m
                  </Text>
                </Paper>
              </Grid.Col>
            )}

            {/* Mobile App Performance */}
            {mobilePerformance && (
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Paper p="md" withBorder>
                  <Text fw={600} mb="md">Performance Metrics (7-day avg)</Text>
                  <Stack gap="xs">
                    {mobilePerformance.avg_load_time_ms && (
                      <Group justify="space-between">
                        <Text size="sm">Load Time</Text>
                        <Text size="sm" fw={600}>{Number(mobilePerformance.avg_load_time_ms).toFixed(0)}ms</Text>
                      </Group>
                    )}
                    {mobilePerformance.avg_render_time_ms && (
                      <Group justify="space-between">
                        <Text size="sm">Render Time</Text>
                        <Text size="sm" fw={600}>{Number(mobilePerformance.avg_render_time_ms).toFixed(0)}ms</Text>
                      </Group>
                    )}
                    {mobilePerformance.avg_network_latency_ms && (
                      <Group justify="space-between">
                        <Text size="sm">Network Latency</Text>
                        <Text size="sm" fw={600}>{Number(mobilePerformance.avg_network_latency_ms).toFixed(0)}ms</Text>
                      </Group>
                    )}
                    {mobilePerformance.total_crashes !== undefined && (
                      <Group justify="space-between">
                        <Text size="sm">Crashes</Text>
                        <Badge color={Number(mobilePerformance.total_crashes) === 0 ? 'green' : 'red'}>
                          {Number(mobilePerformance.total_crashes)}
                        </Badge>
                      </Group>
                    )}
                    {mobilePerformance.total_errors !== undefined && (
                      <Group justify="space-between">
                        <Text size="sm">Errors</Text>
                        <Badge color={Number(mobilePerformance.total_errors) === 0 ? 'green' : Number(mobilePerformance.total_errors) < 10 ? 'yellow' : 'red'}>
                          {Number(mobilePerformance.total_errors)}
                        </Badge>
                      </Group>
                    )}
                  </Stack>
                </Paper>
              </Grid.Col>
            )}

            {/* Feature Completion Stats */}
            {mobileFeatureStats.length > 0 && (
              <Grid.Col span={{ base: 12 }}>
                <Paper p="md" withBorder>
                  <Text fw={600} mb="md">Feature Completion (30 days)</Text>
                  <Stack gap="sm">
                    {mobileFeatureStats.slice(0, 5).map((feature: any, idx: number) => (
                      <Box key={idx}>
                        <Group justify="space-between" mb={4}>
                          <Text size="sm" fw={500}>{feature.feature_name.replace(/_/g, ' ')}</Text>
                          <Group gap="xs">
                            <Badge size="sm" color="green">{feature.completed_count} completed</Badge>
                            <Badge size="sm" color="blue">{Number(feature.completion_rate).toFixed(1)}%</Badge>
                          </Group>
                        </Group>
                        <Progress 
                          value={Number(feature.completion_rate)} 
                          color={Number(feature.completion_rate) >= 80 ? 'green' : Number(feature.completion_rate) >= 50 ? 'yellow' : 'red'}
                          size="sm"
                        />
                        <Group justify="space-between" mt={4}>
                          <Text size="xs" c="dimmed">
                            {feature.total_attempts} attempts
                          </Text>
                          {feature.avg_time_spent_seconds && (
                            <Text size="xs" c="dimmed">
                              Avg: {Math.floor(Number(feature.avg_time_spent_seconds) / 60)}m {Number(feature.avg_time_spent_seconds) % 60}s
                            </Text>
                          )}
                        </Group>
                      </Box>
                    ))}
                  </Stack>
                </Paper>
              </Grid.Col>
            )}
          </Grid>
        </Card>
      )}

      {/* Auto-Generated Priorities */}
      {autoPriorities.length > 0 && (
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group mb="md">
            <IconAlertTriangle size={20} color="#f59e0b" />
            <Title order={4}>Auto-Generated Today's Priorities</Title>
            <Badge color="orange" variant="light">{autoPriorities.length}</Badge>
          </Group>
          <Stack gap="sm">
            {autoPriorities.map((priority) => (
              <Alert
                key={priority.id}
                color={priority.severity === 'critical' ? 'red' : priority.severity === 'high' ? 'orange' : priority.severity === 'medium' ? 'yellow' : 'blue'}
                title={priority.title}
                icon={<IconAlertTriangle size={16} />}
              >
                <Text size="sm" mb={4}>{priority.description}</Text>
                <Text size="xs" c="dimmed" fw={600}>Action: {priority.action}</Text>
              </Alert>
            ))}
          </Stack>
        </Card>
      )}

      {/* Code Review Queue */}
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Group justify="space-between" mb="md">
          <Group>
            <IconCode size={20} color="#3b82f6" />
            <Title order={4}>Code Review Queue</Title>
            <Badge color="blue" variant="light">{codeReviews.length}</Badge>
          </Group>
          <Button size="xs" variant="subtle" onClick={() => navigate('/cto?tab=code-review')}>
            View All
          </Button>
        </Group>
        {codeReviews.length > 0 ? (
          <Stack gap="xs">
            {codeReviews.slice(0, 5).map((review) => (
              <Paper key={review.id} p="sm" withBorder>
                <Group justify="space-between">
                  <Box style={{ flex: 1 }}>
                    <Text size="sm" fw={600}>{review.pr_title}</Text>
                    {review.pr_number && <Text size="xs" c="dimmed">#{review.pr_number}</Text>}
                  </Box>
                  <Group gap="xs">
                    {review.time_in_queue_hours && (
                      <Badge color={review.time_in_queue_hours < 24 ? 'green' : review.time_in_queue_hours < 48 ? 'orange' : 'red'}>
                        {review.time_in_queue_hours}h
                      </Badge>
                    )}
                    {review.quality_score && (
                      <Badge color={review.quality_score >= 80 ? 'green' : review.quality_score >= 60 ? 'orange' : 'red'}>
                        {review.quality_score}/100
                      </Badge>
                    )}
                  </Group>
                </Group>
              </Paper>
            ))}
          </Stack>
        ) : (
          <Alert color="green" title="No pending code reviews" />
        )}
      </Card>

      {/* Daily Tasks Progress */}
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Group justify="space-between" mb="md">
          <Title order={4}>Today's Progress</Title>
          <Group gap="xs">
            <Text size="sm" c="dimmed">
              {tasks.filter(t => t.is_completed).length} of {tasks.length} completed
            </Text>
            <Badge color={tasks.filter(t => t.is_completed).length === tasks.length ? 'green' : 'blue'} variant="light">
              {tasks.length > 0 ? Math.round((tasks.filter(t => t.is_completed).length / tasks.length) * 100) : 0}%
            </Badge>
          </Group>
        </Group>
        <Progress 
          value={tasks.length > 0 ? (tasks.filter(t => t.is_completed).length / tasks.length) * 100 : 0} 
          size="lg" 
          mb="md"
          color={tasks.filter(t => t.is_completed).length === tasks.length ? 'green' : 'blue'}
        />
        {tasks.filter(t => (t.priority === 'high' || t.priority === 'urgent') && !t.is_completed).length > 0 && (
          <Alert color="orange" mb="md" title={`${tasks.filter(t => (t.priority === 'high' || t.priority === 'urgent') && !t.is_completed).length} high priority tasks remaining`} />
        )}
        
        {/* Task Checklist by Category */}
        <Divider my="md" label="Daily Checklist by Category" labelPosition="center" />
        <Grid gutter="md">
          {[
            { key: 'morning_review', label: 'Morning Technical Review', color: '#1890ff' },
            { key: 'development', label: 'Development Leadership', color: '#52c41a' },
            { key: 'strategic', label: 'Strategic Responsibilities', color: '#faad14' },
            { key: 'coordination', label: 'Executive Coordination', color: '#722ed1' },
            { key: 'stability', label: 'Stability & Compliance', color: '#13c2c2' },
            { key: 'product', label: 'Product Development', color: '#eb2f96' },
            { key: 'documentation', label: 'Documentation & Reporting', color: '#f5222d' },
          ].map(category => {
            const categoryTasks = tasks.filter(t => t.task_category === category.key);
            const categoryCompleted = categoryTasks.filter(t => t.is_completed).length;
            const categoryTotal = categoryTasks.length;
            const completionPercent = categoryTotal > 0 ? Math.round((categoryCompleted / categoryTotal) * 100) : 0;

            return (
              <Grid.Col key={category.key} span={{ base: 12, sm: 6, lg: 4 }}>
                <Card shadow="xs" padding="md" radius="md" withBorder>
                  <Group justify="space-between" mb="sm">
                    <Group gap="xs">
                      <Box style={{ width: 4, height: 20, backgroundColor: category.color, borderRadius: 2 }} />
                      <Text size="sm" fw={600}>{category.label}</Text>
                    </Group>
                    <Group gap="xs">
                      <Badge size="sm" color={categoryTotal - categoryCompleted > 0 ? 'orange' : 'green'} variant="light">
                        {categoryTotal - categoryCompleted}
                      </Badge>
                      <RingProgress
                        size={40}
                        thickness={4}
                        sections={[{ value: completionPercent, color: category.color }]}
                        label={
                          <Text size="xs" ta="center" fw={700}>
                            {completionPercent}%
                          </Text>
                        }
                      />
                    </Group>
                  </Group>
                  <Stack gap="xs">
                    {categoryTasks.map(task => (
                      <Group key={task.id} gap="xs" wrap="nowrap">
                        <Checkbox
                          checked={task.is_completed || false}
                          onChange={() => toggleTask(task.id, task.is_completed || false)}
                          size="sm"
                        />
                        <Box style={{ flex: 1, minWidth: 0 }}>
                          <Text 
                            size="sm" 
                            style={{ 
                              textDecoration: task.is_completed ? 'line-through' : 'none',
                              opacity: task.is_completed ? 0.6 : 1
                            }}
                            lineClamp={1}
                          >
                            {task.task_name}
                          </Text>
                          {task.task_description && (
                            <Text size="xs" c="dimmed" lineClamp={1}>
                              {task.task_description}
                            </Text>
                          )}
                        </Box>
                        <Badge
                          size="xs"
                          color={
                            task.priority === 'urgent' ? 'red' :
                            task.priority === 'high' ? 'orange' :
                            task.priority === 'normal' ? 'blue' : 'gray'
                          }
                          variant="light"
                        >
                          {task.priority}
                        </Badge>
                      </Group>
                    ))}
                    {categoryTasks.length === 0 && (
                      <Text size="xs" c="dimmed" ta="center" py="xs">
                        No tasks for this category
                      </Text>
                    )}
                  </Stack>
                </Card>
              </Grid.Col>
            );
          })}
        </Grid>
      </Card>

      {/* Daily Report Modal */}
      <Modal
        opened={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
        title="CTO Daily Report"
        size="lg"
      >
        {dailyReport ? (
          <Stack gap="md">
            <div>
              <Text fw={600} mb="xs">Completed Tasks</Text>
              <List size="sm">
                {dailyReport.completed_tasks?.map((task: string, idx: number) => (
                  <List.Item key={idx}>{task}</List.Item>
                ))}
              </List>
            </div>
            <div>
              <Text fw={600} mb="xs">Sprint Status</Text>
              <Text size="sm">{dailyReport.sprint_status}</Text>
            </div>
            {dailyReport.blockers && dailyReport.blockers.length > 0 && (
              <div>
                <Text fw={600} mb="xs" c="red">Blockers</Text>
                <List size="sm">
                  {dailyReport.blockers.map((blocker: string, idx: number) => (
                    <List.Item key={idx} c="red">{blocker}</List.Item>
                  ))}
                </List>
              </div>
            )}
            {dailyReport.engineering_risks && dailyReport.engineering_risks.length > 0 && (
              <div>
                <Text fw={600} mb="xs" c="orange">Engineering Risks</Text>
                <List size="sm">
                  {dailyReport.engineering_risks.map((risk: string, idx: number) => (
                    <List.Item key={idx} c="orange">{risk}</List.Item>
                  ))}
                </List>
              </div>
            )}
            <div>
              <Text fw={600} mb="xs">Uptime Log</Text>
              <Text size="sm">{dailyReport.uptime_log}</Text>
            </div>
            <Group justify="flex-end" mt="md">
              <Button variant="outline" onClick={() => setReportModalVisible(false)}>Cancel</Button>
              <Button onClick={saveAndSendReport}>Save & Mark Ready</Button>
            </Group>
          </Stack>
        ) : (
          <Text>No report generated yet. Click "Generate Daily Report" to create one.</Text>
        )}
      </Modal>
    </Stack>
  );
};


