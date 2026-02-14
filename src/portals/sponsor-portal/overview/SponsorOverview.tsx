import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface KPIData {
  interns_in_scope_count: number;
  acting_exec_count: number;
  promotion_ready_count: number;
  at_risk_count: number;
  pending_approvals_count: number;
}

interface PipelineStage {
  stage: string;
  count: number;
}

interface Alert {
  id: string;
  type: 'promotion' | 'enforcement' | 'risk' | 'term_expired';
  title: string;
  description: string;
  intern_id?: string;
  engagement_id?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

const SponsorOverview: React.FC = () => {
  const navigate = useNavigate();

  // Get current user's employee ID (to check if super sponsor)
  const { data: currentUserEmployee } = useQuery({
    queryKey: ['current-user-employee'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: employee } = await supabase
        .from('employees')
        .select('id, sponsor_super')
        .eq('user_id', user.id)
        .single();

      return employee;
    },
  });

  const isSuperSponsor = currentUserEmployee?.sponsor_super || false;

  // Fetch KPI data
  const { data: kpiData, isLoading: kpiLoading } = useQuery<KPIData>({
    queryKey: ['sponsor-kpis', isSuperSponsor],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get sponsor's employee ID
      const { data: sponsorEmployee } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!sponsorEmployee && !isSuperSponsor) {
        return {
          interns_in_scope_count: 0,
          acting_exec_count: 0,
          promotion_ready_count: 0,
          at_risk_count: 0,
          pending_approvals_count: 0,
        };
      }

      // Build query for interns in scope
      let internsQuery = supabase
        .from('promotion_engagements')
        .select('id, current_stage, person_id', { count: 'exact' })
        .in('current_stage', ['INTERN_ACTIVE', 'ACTING_EXECUTIVE', 'EXECUTIVE_OFFICER']);

      if (!isSuperSponsor && sponsorEmployee) {
        // Filter by sponsor_id
        internsQuery = internsQuery.in('person_id', 
          supabase
            .from('employees')
            .select('id')
            .eq('sponsor_id', sponsorEmployee.id)
        );
      }

      const { data: interns, count: totalInterns } = await internsQuery;

      // Count acting executives
      const actingExecCount = (interns || []).filter(
        (e) => e.current_stage === 'ACTING_EXECUTIVE'
      ).length;

      // Count promotion-ready (pending approval)
      const { count: promotionReadyCount } = await supabase
        .from('intern_promotion_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .eq('eligibility_status', 'eligible');

      // Count at-risk interns (failed tests, overdue reviews, etc.)
      // This is a simplified version - you may want to expand this logic
      const { count: atRiskCount } = await supabase
        .from('intern_test_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Failed')
        .gte('attempts', 2); // Multiple failures

      // Count pending approvals
      const { count: pendingApprovals } = await supabase
        .from('intern_promotion_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      const { count: pendingEnforcement } = await supabase
        .from('intern_enforcement_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      return {
        interns_in_scope_count: totalInterns || 0,
        acting_exec_count: actingExecCount,
        promotion_ready_count: promotionReadyCount || 0,
        at_risk_count: atRiskCount || 0,
        pending_approvals_count: (pendingApprovals || 0) + (pendingEnforcement || 0),
      };
    },
  });

  // Fetch pipeline stages
  const { data: pipelineStages, isLoading: pipelineLoading } = useQuery<PipelineStage[]>({
    queryKey: ['sponsor-pipeline', isSuperSponsor],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: sponsorEmployee } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .single();

      const stages = ['INTERN_ACTIVE', 'ACTING_EXECUTIVE', 'EXECUTIVE_OFFICER', 'EXITED'];
      const stageCounts: PipelineStage[] = [];

      for (const stage of stages) {
        let query = supabase
          .from('promotion_engagements')
          .select('id', { count: 'exact', head: true })
          .eq('current_stage', stage);

        if (!isSuperSponsor && sponsorEmployee) {
          // Filter by sponsor
          query = query.in('person_id',
            supabase
              .from('employees')
              .select('id')
              .eq('sponsor_id', sponsorEmployee.id)
          );
        }

        const { count } = await query;
        stageCounts.push({ stage, count: count || 0 });
      }

      return stageCounts;
    },
  });

  // Fetch alerts
  const { data: alerts, isLoading: alertsLoading } = useQuery<Alert[]>({
    queryKey: ['sponsor-alerts', isSuperSponsor],
    queryFn: async () => {
      const alertsList: Alert[] = [];

      // Promotion approvals pending
      const { data: pendingPromotions } = await supabase
        .from('intern_promotion_requests')
        .select('id, engagement_id, target_role_state, created_at')
        .eq('status', 'pending')
        .eq('eligibility_status', 'eligible')
        .order('created_at', { ascending: true })
        .limit(10);

      (pendingPromotions || []).forEach((req) => {
        alertsList.push({
          id: `promotion-${req.id}`,
          type: 'promotion',
          title: 'Promotion Approval Pending',
          description: `Intern is eligible for promotion to ${req.target_role_state}`,
          engagement_id: req.engagement_id,
          severity: 'high',
        });
      });

      // Enforcement approvals pending
      const { data: pendingEnforcement } = await supabase
        .from('intern_enforcement_requests')
        .select('id, engagement_id, action_type, severity, created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(10);

      (pendingEnforcement || []).forEach((req) => {
        alertsList.push({
          id: `enforcement-${req.id}`,
          type: 'enforcement',
          title: 'Enforcement Action Pending',
          description: `${req.action_type} action requires approval`,
          engagement_id: req.engagement_id,
          severity: req.severity as 'low' | 'medium' | 'high' | 'critical',
        });
      });

      // Critical risk interns (simplified - you may want to expand)
      const { data: failedTests } = await supabase
        .from('intern_test_assignments')
        .select('engagement_id')
        .eq('status', 'Failed')
        .gte('attempts', 3)
        .limit(5);

      (failedTests || []).forEach((test) => {
        alertsList.push({
          id: `risk-${test.engagement_id}`,
          type: 'risk',
          title: 'Critical Risk: Multiple Test Failures',
          description: 'Intern has failed tests multiple times',
          engagement_id: test.engagement_id,
          severity: 'critical',
        });
      });

      return alertsList.slice(0, 10); // Limit to 10 most important
    },
  });

  const handleStageClick = (stage: string) => {
    navigate(`/sponsor/interns?stage=${stage}`);
  };

  const handleAlertClick = (alert: Alert) => {
    if (alert.type === 'promotion' || alert.type === 'enforcement') {
      navigate(`/sponsor/approval-queue?type=${alert.type}`);
    } else if (alert.engagement_id) {
      navigate(`/sponsor/interns/${alert.engagement_id}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Executive Overview</h1>
        <p className="text-gray-500 mt-1">
          Monitor intern progression and pending approvals requiring your attention.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          title="Interns in Scope"
          value={kpiData?.interns_in_scope_count || 0}
          icon={Users}
          color="blue"
          isLoading={kpiLoading}
          onClick={() => navigate('/sponsor/interns')}
        />
        <KPICard
          title="Acting Executives"
          value={kpiData?.acting_exec_count || 0}
          icon={TrendingUp}
          color="purple"
          isLoading={kpiLoading}
          onClick={() => navigate('/sponsor/interns?stage=ACTING_EXECUTIVE')}
        />
        <KPICard
          title="Promotion Ready"
          value={kpiData?.promotion_ready_count || 0}
          icon={CheckCircle2}
          color="green"
          isLoading={kpiLoading}
          onClick={() => navigate('/sponsor/approval-queue?type=promotion')}
        />
        <KPICard
          title="At Risk"
          value={kpiData?.at_risk_count || 0}
          icon={AlertTriangle}
          color="red"
          isLoading={kpiLoading}
          onClick={() => navigate('/sponsor/interns?risk=true')}
        />
        <KPICard
          title="Pending Approvals"
          value={kpiData?.pending_approvals_count || 0}
          icon={Clock}
          color="orange"
          isLoading={kpiLoading}
          onClick={() => navigate('/sponsor/approval-queue')}
        />
      </div>

      {/* Pipeline Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Pipeline Summary</h2>
        {pipelineLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(pipelineStages || []).map((stage) => (
              <button
                key={stage.stage}
                onClick={() => handleStageClick(stage.stage)}
                className="p-4 rounded-lg border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-colors text-left"
              >
                <div className="text-sm text-gray-500 mb-1">{stage.stage.replace('_', ' ')}</div>
                <div className="text-2xl font-bold text-gray-900">{stage.count}</div>
                <div className="flex items-center gap-1 text-xs text-gray-400 mt-2">
                  View <ArrowRight className="w-3 h-3" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Alerts Panel */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Requires Attention</h2>
          <button
            onClick={() => navigate('/sponsor/approval-queue')}
            className="text-sm text-orange-600 hover:text-orange-700 font-medium"
          >
            View All
          </button>
        </div>
        {alertsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        ) : (alerts || []).length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
            <p>No items need your attention.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <button
                key={alert.id}
                onClick={() => handleAlertClick(alert)}
                className="w-full p-4 rounded-lg border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-colors text-left"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle
                        className={`w-5 h-5 ${
                          alert.severity === 'critical'
                            ? 'text-red-500'
                            : alert.severity === 'high'
                            ? 'text-orange-500'
                            : 'text-yellow-500'
                        }`}
                      />
                      <h3 className="font-medium text-gray-900">{alert.title}</h3>
                    </div>
                    <p className="text-sm text-gray-600">{alert.description}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface KPICardProps {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: 'blue' | 'purple' | 'green' | 'red' | 'orange';
  isLoading: boolean;
  onClick: () => void;
}

const KPICard: React.FC<KPICardProps> = ({ title, value, icon: Icon, color, isLoading, onClick }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200',
  };

  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-xl border-2 ${colorClasses[color]} hover:shadow-md transition-all cursor-pointer text-left`}
    >
      <div className="flex items-center justify-between mb-2">
        <Icon className="w-6 h-6" />
        <ArrowRight className="w-4 h-4 opacity-50" />
      </div>
      <div className="text-2xl font-bold mb-1">
        {isLoading ? '...' : value}
      </div>
      <div className="text-sm font-medium opacity-75">{title}</div>
    </button>
  );
};

export default SponsorOverview;


