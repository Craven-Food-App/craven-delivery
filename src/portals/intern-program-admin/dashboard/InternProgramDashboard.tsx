import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Users,
  UserCheck,
  TrendingUp,
  AlertTriangle,
  LogOut,
  ChevronRight,
  Clock,
  XCircle,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';

interface KPICardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  trend?: string;
}

const KPICard: React.FC<KPICardProps> = ({ title, value, icon, color, trend }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-3xl font-bold mt-1" style={{ color }}>{value}</p>
        {trend && (
          <p className="text-xs text-gray-400 mt-1">{trend}</p>
        )}
      </div>
      <div 
        className="w-12 h-12 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: `${color}15` }}
      >
        {icon}
      </div>
    </div>
  </div>
);

interface PipelineStageProps {
  label: string;
  count: number;
  color: string;
  onClick: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}

const PipelineStage: React.FC<PipelineStageProps> = ({ 
  label, count, color, onClick, isFirst, isLast 
}) => (
  <button
    onClick={onClick}
    className="flex-1 relative group"
  >
    <div 
      className={`
        h-16 flex items-center justify-center relative
        transition-all duration-200 hover:brightness-95
        ${isFirst ? 'rounded-l-xl' : ''} 
        ${isLast ? 'rounded-r-xl' : ''}
      `}
      style={{ backgroundColor: color }}
    >
      <div className="text-center text-white">
        <div className="text-2xl font-bold">{count}</div>
        <div className="text-xs font-medium opacity-90">{label}</div>
      </div>
      {!isLast && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10">
          <ChevronRight className="w-6 h-6 text-white/50" />
        </div>
      )}
    </div>
  </button>
);

interface AlertItemProps {
  type: 'warning' | 'error' | 'info';
  title: string;
  description: string;
  count?: number;
  action?: string;
  onAction?: () => void;
}

const AlertItem: React.FC<AlertItemProps> = ({ 
  type, title, description, count, action, onAction 
}) => {
  const styles = {
    warning: { bg: 'bg-amber-50', border: 'border-amber-200', icon: <AlertCircle className="w-5 h-5 text-amber-500" /> },
    error: { bg: 'bg-red-50', border: 'border-red-200', icon: <XCircle className="w-5 h-5 text-red-500" /> },
    info: { bg: 'bg-blue-50', border: 'border-blue-200', icon: <Clock className="w-5 h-5 text-blue-500" /> },
  };

  const style = styles[type];

  return (
    <div className={`${style.bg} ${style.border} border rounded-lg p-4 flex items-start gap-3`}>
      <div className="flex-shrink-0 mt-0.5">{style.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-gray-900">{title}</h4>
          {count !== undefined && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-white shadow-sm">
              {count}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600 mt-0.5">{description}</p>
      </div>
      {action && onAction && (
        <button
          onClick={onAction}
          className="text-sm font-medium text-orange-600 hover:text-orange-700 whitespace-nowrap"
        >
          {action}
        </button>
      )}
    </div>
  );
};

const InternProgramDashboard: React.FC = () => {
  // Fetch engagement stats
  const { data: engagementStats, isLoading: statsLoading } = useQuery({
    queryKey: ['intern-program-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promotion_engagements')
        .select('current_stage, risk_status, promotion_readiness_percent');
      
      if (error) throw error;
      
      const stats = {
        totalActive: 0,
        actingExecs: 0,
        promotionEligible: 0,
        atRisk: 0,
        exited30Days: 0,
        applied: 0,
        internActive: 0,
        actingActive: 0,
        execActive: 0,
        exited: 0,
      };

      (data || []).forEach((eng: any) => {
        if (eng.current_stage === 'APPLIED') stats.applied++;
        if (eng.current_stage === 'INTERN_ACTIVE') {
          stats.internActive++;
          stats.totalActive++;
        }
        if (eng.current_stage === 'ACTING_ACTIVE' || eng.current_stage === 'ACTING_EXECUTIVE') {
          stats.actingActive++;
          stats.actingExecs++;
          stats.totalActive++;
        }
        if (eng.current_stage === 'EXEC_ACTIVE' || eng.current_stage === 'EXECUTIVE_OFFICER') {
          stats.execActive++;
        }
        if (eng.current_stage === 'EXITED') stats.exited++;
        if (eng.promotion_readiness_percent >= 80) stats.promotionEligible++;
        if (eng.risk_status === 'Warning' || eng.risk_status === 'Critical') stats.atRisk++;
      });

      return stats;
    },
  });

  // Fetch alerts data
  const { data: alerts, isLoading: alertsLoading } = useQuery({
    queryKey: ['intern-program-alerts'],
    queryFn: async () => {
      const alertsList: AlertItemProps[] = [];

      // Check for overdue reviews
      const { data: overdueReviews } = await supabase
        .from('promotion_review_schedules')
        .select('id')
        .eq('status', 'OVERDUE');
      
      if (overdueReviews && overdueReviews.length > 0) {
        alertsList.push({
          type: 'error',
          title: 'Overdue Reviews',
          description: 'Reviews past their scheduled date require immediate attention',
          count: overdueReviews.length,
          action: 'View All',
        });
      }

      // Check for failed compliance tests
      const { data: failedTests } = await supabase
        .from('intern_test_assignments')
        .select('id, test_module_id')
        .eq('status', 'Failed');
      
      if (failedTests && failedTests.length > 0) {
        alertsList.push({
          type: 'warning',
          title: 'Failed Compliance Tests',
          description: 'Interns with failed tests may need additional training',
          count: failedTests.length,
          action: 'Review',
        });
      }

      // Check for expired acting terms
      const { data: expiredTerms } = await supabase
        .from('promotion_engagements')
        .select('id')
        .in('current_stage', ['ACTING_ACTIVE', 'ACTING_EXECUTIVE'])
        .lt('start_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());
      
      if (expiredTerms && expiredTerms.length > 0) {
        alertsList.push({
          type: 'warning',
          title: 'Acting Terms Expired',
          description: 'Acting executives past their 90-day term need review',
          count: expiredTerms.length,
          action: 'Review',
        });
      }

      // Check for promotion-blocked engagements
      const { data: blockedPromos } = await supabase
        .from('promotion_engagements')
        .select('id')
        .eq('promotion_locked', true);
      
      if (blockedPromos && blockedPromos.length > 0) {
        alertsList.push({
          type: 'info',
          title: 'Locked Promotions',
          description: 'Interns with locked promotion status',
          count: blockedPromos.length,
          action: 'Manage',
        });
      }

      // If no alerts, add a success message
      if (alertsList.length === 0) {
        alertsList.push({
          type: 'info',
          title: 'All Clear',
          description: 'No urgent alerts at this time. Program is running smoothly.',
        });
      }

      return alertsList;
    },
  });

  const stats = engagementStats || {
    totalActive: 0,
    actingExecs: 0,
    promotionEligible: 0,
    atRisk: 0,
    exited30Days: 0,
    applied: 0,
    internActive: 0,
    actingActive: 0,
    execActive: 0,
    exited: 0,
  };

  const isLoading = statsLoading || alertsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Intern Program Dashboard</h1>
          <p className="text-gray-500 mt-1">Loading program metrics...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
              <div className="h-8 bg-gray-200 rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Intern Program Dashboard</h1>
        <p className="text-gray-500 mt-1">
          High-level view of all interns, statuses, and conversion pipeline.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          title="Total Active Interns"
          value={stats.totalActive}
          icon={<Users className="w-6 h-6 text-blue-500" />}
          color="#3B82F6"
        />
        <KPICard
          title="Acting Executives"
          value={stats.actingExecs}
          icon={<UserCheck className="w-6 h-6 text-purple-500" />}
          color="#8B5CF6"
        />
        <KPICard
          title="Promotion-Eligible"
          value={stats.promotionEligible}
          icon={<TrendingUp className="w-6 h-6 text-green-500" />}
          color="#22C55E"
        />
        <KPICard
          title="At-Risk"
          value={stats.atRisk}
          icon={<AlertTriangle className="w-6 h-6 text-amber-500" />}
          color="#F59E0B"
        />
        <KPICard
          title="Exits (30 Days)"
          value={stats.exited30Days}
          icon={<LogOut className="w-6 h-6 text-red-500" />}
          color="#EF4444"
        />
      </div>

      {/* Pipeline Overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Pipeline Overview</h2>
        <div className="flex gap-1">
          <PipelineStage
            label="Applied"
            count={stats.applied}
            color="#94A3B8"
            onClick={() => {}}
            isFirst
          />
          <PipelineStage
            label="Intern"
            count={stats.internActive}
            color="#3B82F6"
            onClick={() => {}}
          />
          <PipelineStage
            label="Acting Exec"
            count={stats.actingActive}
            color="#8B5CF6"
            onClick={() => {}}
          />
          <PipelineStage
            label="Executive"
            count={stats.execActive}
            color="#22C55E"
            onClick={() => {}}
          />
          <PipelineStage
            label="Exited"
            count={stats.exited}
            color="#EF4444"
            onClick={() => {}}
            isLast
          />
        </div>
        <p className="text-xs text-gray-400 mt-3 text-center">
          Click a stage to filter the Interns table
        </p>
      </div>

      {/* Alerts Panel */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <ShieldAlert className="w-5 h-5 text-orange-500" />
          <h2 className="text-lg font-semibold text-gray-900">Alerts</h2>
        </div>
        <div className="space-y-3">
          {(alerts || []).map((alert, idx) => (
            <AlertItem key={idx} {...alert} />
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow text-left group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">View All Interns</h3>
              <p className="text-sm text-gray-500">Manage program participants</p>
            </div>
          </div>
        </button>
        <button className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow text-left group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
              <TrendingUp className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Promotion Queue</h3>
              <p className="text-sm text-gray-500">Review eligible candidates</p>
            </div>
          </div>
        </button>
        <button className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow text-left group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">At-Risk Review</h3>
              <p className="text-sm text-gray-500">Address compliance issues</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};

export default InternProgramDashboard;
