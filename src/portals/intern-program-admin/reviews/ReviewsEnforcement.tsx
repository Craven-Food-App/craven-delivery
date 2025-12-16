import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertTriangle,
  Clock,
  XCircle,
  RefreshCw,
  Lock,
  Snowflake,
  LogOut,
  ChevronDown,
  CheckCircle,
  User,
  Calendar,
  Filter,
} from 'lucide-react';

interface ReviewIssue {
  id: string;
  engagement_id: string;
  type: 'overdue_review' | 'failed_test' | 'multiple_retakes' | 'expired_term' | 'locked_promotion';
  title: string;
  description: string;
  severity: 'warning' | 'critical';
  person_title: string;
  track: string;
  created_at: string;
}

interface EnforcementAction {
  id: string;
  engagement_id: string;
  action_type: string;
  reason: string;
  performed_by: string;
  performed_at: string;
  resolved_at: string | null;
  is_active: boolean;
  person_title?: string;
}

const severityStyles = {
  warning: { bg: 'bg-amber-50', border: 'border-amber-200', icon: <AlertTriangle className="w-5 h-5 text-amber-500" />, text: 'text-amber-700' },
  critical: { bg: 'bg-red-50', border: 'border-red-200', icon: <XCircle className="w-5 h-5 text-red-500" />, text: 'text-red-700' },
};

const actionTypeLabels: Record<string, string> = {
  FORCE_REVIEW: 'Force Review',
  LOCK_PROMOTION: 'Lock Promotion',
  FLAG_FOR_SPONSOR: 'Flag for Sponsor Review',
  INITIATE_EXIT: 'Initiate Exit',
  REVERT_ROLE: 'Revert Role',
  FREEZE_EQUITY: 'Freeze Equity',
  REQUIRE_IMMEDIATE_REVIEW: 'Require Immediate Review',
};

const ReviewsEnforcement: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'issues' | 'actions'>('issues');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  // Fetch review issues
  const { data: issues, isLoading: issuesLoading } = useQuery({
    queryKey: ['review-issues'],
    queryFn: async () => {
      const issuesList: ReviewIssue[] = [];

      // Get overdue reviews
      const { data: overdueReviews } = await supabase
        .from('promotion_review_schedules')
        .select(`
          id,
          engagement_id,
          review_type,
          scheduled_date,
          promotion_engagements (
            current_title,
            track
          )
        `)
        .eq('status', 'OVERDUE');

      (overdueReviews || []).forEach((review: any) => {
        issuesList.push({
          id: review.id,
          engagement_id: review.engagement_id,
          type: 'overdue_review',
          title: `Overdue ${review.review_type.replace('_', ' ')} Review`,
          description: `Review was due on ${new Date(review.scheduled_date).toLocaleDateString()}`,
          severity: 'critical',
          person_title: review.promotion_engagements?.current_title || 'Unknown',
          track: review.promotion_engagements?.track || 'Unknown',
          created_at: review.scheduled_date,
        });
      });

      // Get failed tests
      const { data: failedTests } = await supabase
        .from('intern_test_assignments')
        .select(`
          id,
          engagement_id,
          attempts,
          intern_test_modules (name),
          promotion_engagements (
            current_title,
            track
          )
        `)
        .eq('status', 'Failed');

      (failedTests || []).forEach((test: any) => {
        issuesList.push({
          id: test.id,
          engagement_id: test.engagement_id,
          type: 'failed_test',
          title: `Failed Test: ${test.intern_test_modules?.name || 'Unknown'}`,
          description: `Failed after ${test.attempts} attempt(s)`,
          severity: 'warning',
          person_title: test.promotion_engagements?.current_title || 'Unknown',
          track: test.promotion_engagements?.track || 'Unknown',
          created_at: new Date().toISOString(),
        });
      });

      // Get expired acting terms (90+ days)
      const { data: expiredTerms } = await supabase
        .from('promotion_engagements')
        .select('id, current_title, track, start_date')
        .in('current_stage', ['ACTING_ACTIVE', 'ACTING_EXECUTIVE'])
        .lt('start_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

      (expiredTerms || []).forEach((eng: any) => {
        const daysInRole = Math.floor((Date.now() - new Date(eng.start_date).getTime()) / (24 * 60 * 60 * 1000));
        issuesList.push({
          id: eng.id,
          engagement_id: eng.id,
          type: 'expired_term',
          title: 'Acting Term Expired',
          description: `${daysInRole} days in acting role (90 day term exceeded)`,
          severity: 'warning',
          person_title: eng.current_title || 'Unknown',
          track: eng.track || 'Unknown',
          created_at: eng.start_date,
        });
      });

      // Get locked promotions
      const { data: lockedPromos } = await supabase
        .from('promotion_engagements')
        .select('id, current_title, track, promotion_lock_reason')
        .eq('promotion_locked', true);

      (lockedPromos || []).forEach((eng: any) => {
        issuesList.push({
          id: eng.id,
          engagement_id: eng.id,
          type: 'locked_promotion',
          title: 'Promotion Locked',
          description: eng.promotion_lock_reason || 'Promotion has been locked by admin',
          severity: 'critical',
          person_title: eng.current_title || 'Unknown',
          track: eng.track || 'Unknown',
          created_at: new Date().toISOString(),
        });
      });

      return issuesList;
    },
  });

  // Fetch enforcement actions
  const { data: actions, isLoading: actionsLoading } = useQuery({
    queryKey: ['enforcement-actions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('intern_enforcement_actions')
        .select(`
          *,
          promotion_engagements (current_title)
        `)
        .order('performed_at', { ascending: false })
        .limit(50);
      if (error) throw error;

      return (data || []).map((action: any) => ({
        ...action,
        person_title: action.promotion_engagements?.current_title || 'Unknown',
      })) as EnforcementAction[];
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

      // Apply specific effects based on action type
      switch (actionType) {
        case 'LOCK_PROMOTION':
          await supabase
            .from('promotion_engagements')
            .update({ promotion_locked: true, promotion_lock_reason: reason })
            .eq('id', engagementId);
          break;
        case 'FREEZE_EQUITY':
          // Would update equity eligibility - placeholder
          break;
        case 'REVERT_ROLE':
          await supabase
            .from('promotion_engagements')
            .update({ current_stage: 'INTERN_ACTIVE' })
            .eq('id', engagementId);
          break;
        case 'INITIATE_EXIT':
          await supabase
            .from('promotion_engagements')
            .update({ current_stage: 'EXITED', exit_date: new Date().toISOString(), exit_reason: reason })
            .eq('id', engagementId);
          break;
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
      queryClient.invalidateQueries({ queryKey: ['review-issues'] });
      queryClient.invalidateQueries({ queryKey: ['enforcement-actions'] });
    },
  });

  // Resolve action mutation
  const resolveMutation = useMutation({
    mutationFn: async ({ actionId, notes }: { actionId: string; notes: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('intern_enforcement_actions')
        .update({
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
          resolution_notes: notes,
          is_active: false,
        })
        .eq('id', actionId);

      if (error) throw error;

      await supabase.rpc('log_intern_program_action', {
        p_actor_id: user.id,
        p_action: 'RESOLVE_ENFORCEMENT',
        p_entity_type: 'enforcement_action',
        p_entity_id: actionId,
        p_affected_user_id: null,
        p_reason: notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enforcement-actions'] });
    },
  });

  const handleEnforcementAction = (engagementId: string, actionType: string) => {
    const reason = prompt(`Enter reason for ${actionTypeLabels[actionType] || actionType}:`);
    if (!reason) return;
    enforcementMutation.mutate({ engagementId, actionType, reason });
  };

  const handleResolve = (actionId: string) => {
    const notes = prompt('Enter resolution notes:');
    if (!notes) return;
    resolveMutation.mutate({ actionId, notes });
  };

  const filteredIssues = (issues || []).filter((issue) => {
    if (severityFilter === 'all') return true;
    return issue.severity === severityFilter;
  });

  const isLoading = issuesLoading || actionsLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reviews & Enforcement</h1>
        <p className="text-gray-500 mt-1">
          Prevent stagnation and entitlement. Actions are logged and irreversible without admin approval.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {(issues || []).filter((i) => i.type === 'overdue_review').length}
              </p>
              <p className="text-sm text-gray-500">Overdue Reviews</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {(issues || []).filter((i) => i.type === 'failed_test').length}
              </p>
              <p className="text-sm text-gray-500">Failed Tests</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {(issues || []).filter((i) => i.type === 'expired_term').length}
              </p>
              <p className="text-sm text-gray-500">Expired Terms</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Lock className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {(actions || []).filter((a) => a.is_active).length}
              </p>
              <p className="text-sm text-gray-500">Active Actions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('issues')}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'issues'
                  ? 'text-orange-600 border-b-2 border-orange-500 bg-orange-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Issues ({(issues || []).length})
            </button>
            <button
              onClick={() => setActiveTab('actions')}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'actions'
                  ? 'text-orange-600 border-b-2 border-orange-500 bg-orange-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Enforcement Actions ({(actions || []).length})
            </button>
          </div>
        </div>

        {/* Issues Tab */}
        {activeTab === 'issues' && (
          <div className="p-4">
            {/* Filter */}
            <div className="flex items-center gap-4 mb-4">
              <div className="relative">
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="appearance-none pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white text-sm"
                >
                  <option value="all">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="warning">Warning</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Issues List */}
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse border border-gray-200 rounded-lg p-4">
                    <div className="h-5 bg-gray-200 rounded w-1/3 mb-2" />
                    <div className="h-4 bg-gray-200 rounded w-2/3" />
                  </div>
                ))}
              </div>
            ) : filteredIssues.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">All Clear</h3>
                <p className="text-gray-500">No issues requiring attention.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredIssues.map((issue) => {
                  const style = severityStyles[issue.severity];
                  return (
                    <div
                      key={issue.id}
                      className={`${style.bg} ${style.border} border rounded-lg p-4`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {style.icon}
                          <div>
                            <h4 className={`font-semibold ${style.text}`}>{issue.title}</h4>
                            <p className="text-sm text-gray-600 mt-0.5">{issue.description}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <User className="w-3.5 h-3.5" />
                                {issue.person_title}
                              </span>
                              <span>{issue.track}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEnforcementAction(issue.engagement_id, 'REQUIRE_IMMEDIATE_REVIEW')}
                            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                            title="Require Immediate Review"
                          >
                            <RefreshCw className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => handleEnforcementAction(issue.engagement_id, 'LOCK_PROMOTION')}
                            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                            title="Lock Promotion"
                          >
                            <Lock className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => handleEnforcementAction(issue.engagement_id, 'REVERT_ROLE')}
                            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                            title="Revert Role"
                          >
                            <AlertTriangle className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => handleEnforcementAction(issue.engagement_id, 'FREEZE_EQUITY')}
                            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                            title="Freeze Equity"
                          >
                            <Snowflake className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => handleEnforcementAction(issue.engagement_id, 'INITIATE_EXIT')}
                            className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                            title="Initiate Exit"
                          >
                            <LogOut className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Actions Tab */}
        {activeTab === 'actions' && (
          <div className="p-4">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse border border-gray-200 rounded-lg p-4">
                    <div className="h-5 bg-gray-200 rounded w-1/4 mb-2" />
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : (actions || []).length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Actions</h3>
                <p className="text-gray-500">No enforcement actions have been taken.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(actions || []).map((action) => (
                  <div
                    key={action.id}
                    className={`border rounded-lg p-4 ${
                      action.is_active ? 'border-orange-200 bg-orange-50' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            action.is_active ? 'bg-orange-200 text-orange-800' : 'bg-gray-200 text-gray-600'
                          }`}>
                            {action.is_active ? 'Active' : 'Resolved'}
                          </span>
                          <span className="font-semibold text-gray-900">
                            {actionTypeLabels[action.action_type] || action.action_type}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{action.reason}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5" />
                            {action.person_title}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(action.performed_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      {action.is_active && (
                        <button
                          onClick={() => handleResolve(action.id)}
                          className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Warning */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-700">
          <strong>Warning:</strong> All enforcement actions are logged and irreversible without admin approval. 
          Actions taken here will immediately affect the intern's status and eligibility.
        </div>
      </div>
    </div>
  );
};

export default ReviewsEnforcement;


