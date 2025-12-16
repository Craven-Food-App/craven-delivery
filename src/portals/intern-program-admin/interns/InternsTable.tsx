import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Search,
  Filter,
  MoreVertical,
  Eye,
  Lock,
  Flag,
  LogOut,
  RefreshCw,
  ChevronDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';

interface Intern {
  id: string;
  person_id: string;
  track: string;
  current_stage: string;
  current_title: string;
  start_date: string;
  risk_status: string;
  promotion_readiness_percent: number;
  promotion_locked: boolean;
  // Joined data
  person_name?: string;
  person_email?: string;
  tests_completed?: number;
  tests_total?: number;
  last_review_score?: number;
}

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  APPLIED: { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' },
  INTERN_ACTIVE: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  ACTING_EXECUTIVE: { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
  ACTING_ACTIVE: { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
  EXECUTIVE_OFFICER: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  EXEC_ACTIVE: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  EXITED: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  REVOKED: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
};

const riskColors: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  OK: { bg: 'bg-green-50', text: 'text-green-700', icon: <CheckCircle className="w-4 h-4" /> },
  Warning: { bg: 'bg-amber-50', text: 'text-amber-700', icon: <AlertTriangle className="w-4 h-4" /> },
  Critical: { bg: 'bg-red-50', text: 'text-red-700', icon: <XCircle className="w-4 h-4" /> },
};

const InternsTable: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [selectedIntern, setSelectedIntern] = useState<string | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  // Fetch interns with related data
  const { data: interns, isLoading } = useQuery({
    queryKey: ['intern-program-interns', stageFilter, riskFilter],
    queryFn: async () => {
      let query = supabase
        .from('promotion_engagements')
        .select(`
          id,
          person_id,
          track,
          current_stage,
          current_title,
          start_date,
          risk_status,
          promotion_readiness_percent,
          promotion_locked
        `)
        .order('created_at', { ascending: false });

      if (stageFilter !== 'all') {
        query = query.eq('current_stage', stageFilter);
      }
      if (riskFilter !== 'all') {
        query = query.eq('risk_status', riskFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Enrich with test assignment counts
      const enrichedData = await Promise.all(
        (data || []).map(async (intern: any) => {
          const { data: assignments } = await supabase
            .from('intern_test_assignments')
            .select('status')
            .eq('engagement_id', intern.id);

          const testsTotal = assignments?.length || 0;
          const testsCompleted = assignments?.filter(
            (a: any) => a.status === 'Passed'
          ).length || 0;

          // Get latest review score
          const { data: reviews } = await supabase
            .from('promotion_performance_reviews')
            .select('rating')
            .eq('engagement_id', intern.id)
            .order('created_at', { ascending: false })
            .limit(1);

          return {
            ...intern,
            tests_completed: testsCompleted,
            tests_total: testsTotal,
            last_review_score: reviews?.[0]?.rating || null,
          };
        })
      );

      return enrichedData as Intern[];
    },
  });

  // Enforcement action mutation
  const enforcementMutation = useMutation({
    mutationFn: async ({ 
      engagementId, 
      actionType, 
      reason 
    }: { 
      engagementId: string; 
      actionType: string; 
      reason: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create enforcement action
      const { error: actionError } = await supabase
        .from('intern_enforcement_actions')
        .insert({
          engagement_id: engagementId,
          action_type: actionType,
          reason,
          performed_by: user.id,
        });

      if (actionError) throw actionError;

      // Update engagement based on action type
      if (actionType === 'LOCK_PROMOTION') {
        await supabase
          .from('promotion_engagements')
          .update({ 
            promotion_locked: true, 
            promotion_lock_reason: reason 
          })
          .eq('id', engagementId);
      }

      // Log to audit
      await supabase.rpc('log_intern_program_action', {
        p_actor_id: user.id,
        p_action: actionType,
        p_entity_type: 'engagement',
        p_entity_id: engagementId,
        p_affected_user_id: null,
        p_reason: reason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intern-program-interns'] });
      setActionMenuOpen(null);
    },
  });

  const handleAction = (internId: string, action: string) => {
    const reason = prompt(`Enter reason for ${action.replace(/_/g, ' ').toLowerCase()}:`);
    if (!reason) return;

    enforcementMutation.mutate({
      engagementId: internId,
      actionType: action,
      reason,
    });
  };

  const filteredInterns = (interns || []).filter((intern) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      intern.current_title?.toLowerCase().includes(search) ||
      intern.track?.toLowerCase().includes(search) ||
      intern.person_name?.toLowerCase().includes(search)
    );
  });

  const stages = [
    { value: 'all', label: 'All Stages' },
    { value: 'APPLIED', label: 'Applied' },
    { value: 'INTERN_ACTIVE', label: 'Intern Active' },
    { value: 'ACTING_EXECUTIVE', label: 'Acting Executive' },
    { value: 'EXECUTIVE_OFFICER', label: 'Executive Officer' },
    { value: 'EXITED', label: 'Exited' },
  ];

  const risks = [
    { value: 'all', label: 'All Risk Levels' },
    { value: 'OK', label: 'OK' },
    { value: 'Warning', label: 'Warning' },
    { value: 'Critical', label: 'Critical' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Interns</h1>
        <p className="text-gray-500 mt-1">
          Single view of all interns across all tracks. Oversight only — no score editing.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, title, or track..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          {/* Stage Filter */}
          <div className="relative">
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white min-w-[180px]"
            >
              {stages.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>

          {/* Risk Filter */}
          <div className="relative">
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white min-w-[160px]"
            >
              {risks.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Name / Title
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Track
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Role State
                </th>
                <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Tests
                </th>
                <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Last Review
                </th>
                <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Readiness
                </th>
                <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Risk
                </th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-32" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24" /></td>
                    <td className="px-6 py-4"><div className="h-6 bg-gray-200 rounded w-28" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-12 mx-auto" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-10 mx-auto" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16 mx-auto" /></td>
                    <td className="px-6 py-4"><div className="h-6 bg-gray-200 rounded w-16 mx-auto" /></td>
                    <td className="px-6 py-4"><div className="h-8 bg-gray-200 rounded w-8 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredInterns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No interns found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredInterns.map((intern) => {
                  const status = statusColors[intern.current_stage] || statusColors.APPLIED;
                  const risk = riskColors[intern.risk_status || 'OK'];

                  return (
                    <tr key={intern.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">
                            {intern.current_title}
                          </p>
                          <p className="text-sm text-gray-500">
                            Since {new Date(intern.start_date).toLocaleDateString()}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700">
                          {intern.track || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                          {intern.current_stage.replace(/_/g, ' ')}
                        </span>
                        {intern.promotion_locked && (
                          <Lock className="inline-block w-3.5 h-3.5 text-red-500 ml-1.5" />
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-medium text-gray-900">
                          {intern.tests_completed} / {intern.tests_total}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {intern.last_review_score !== null ? (
                          <span className={`text-sm font-medium ${
                            intern.last_review_score >= 70 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {intern.last_review_score}%
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                (intern.promotion_readiness_percent || 0) >= 80 
                                  ? 'bg-green-500' 
                                  : (intern.promotion_readiness_percent || 0) >= 50 
                                    ? 'bg-amber-500' 
                                    : 'bg-red-500'
                              }`}
                              style={{ width: `${intern.promotion_readiness_percent || 0}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-600">
                            {intern.promotion_readiness_percent || 0}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${risk.bg} ${risk.text}`}>
                          {risk.icon}
                          {intern.risk_status || 'OK'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="relative">
                          <button
                            onClick={() => setActionMenuOpen(
                              actionMenuOpen === intern.id ? null : intern.id
                            )}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <MoreVertical className="w-5 h-5 text-gray-500" />
                          </button>
                          {actionMenuOpen === intern.id && (
                            <>
                              <div 
                                className="fixed inset-0 z-10"
                                onClick={() => setActionMenuOpen(null)}
                              />
                              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                                <button
                                  onClick={() => handleAction(intern.id, 'FORCE_REVIEW')}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  <RefreshCw className="w-4 h-4" />
                                  Force Review
                                </button>
                                <button
                                  onClick={() => handleAction(intern.id, 'LOCK_PROMOTION')}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  <Lock className="w-4 h-4" />
                                  Lock Promotion
                                </button>
                                <button
                                  onClick={() => handleAction(intern.id, 'FLAG_FOR_SPONSOR')}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  <Flag className="w-4 h-4" />
                                  Flag for Sponsor Review
                                </button>
                                <div className="border-t border-gray-100 my-1" />
                                <button
                                  onClick={() => handleAction(intern.id, 'INITIATE_EXIT')}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                >
                                  <LogOut className="w-4 h-4" />
                                  Initiate Exit Workflow
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer note */}
      <p className="text-xs text-gray-400 text-center">
        This is an oversight view. Score editing is not permitted here.
      </p>
    </div>
  );
};

export default InternsTable;


