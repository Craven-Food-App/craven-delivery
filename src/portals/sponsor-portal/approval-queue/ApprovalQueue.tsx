import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  AlertTriangle,
  Filter,
} from 'lucide-react';

interface PromotionRequest {
  id: string;
  engagement_id: string;
  target_role_state: string;
  requested_by: string;
  manager_recommendation: string;
  eligibility_status: string;
  status: string;
  sponsor_reason_code?: string;
  sponsor_comment?: string;
  created_at: string;
  intern_name?: string;
  intern_track?: string;
  intern_current_state?: string;
}

interface EnforcementRequest {
  id: string;
  engagement_id: string;
  action_type: string;
  severity: string;
  requested_by: string;
  reason: string;
  recommended_duration?: number;
  status: string;
  sponsor_reason_code?: string;
  sponsor_comment?: string;
  created_at: string;
  intern_name?: string;
  intern_track?: string;
}

const ApprovalQueue: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'promotion' | 'enforcement'>(
    (searchParams.get('type') as 'promotion' | 'enforcement') || 'promotion'
  );
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [decisionType, setDecisionType] = useState<'approve' | 'deny' | 'defer' | 'more_info'>('approve');
  const [reasonCode, setReasonCode] = useState('');
  const [comment, setComment] = useState('');

  // Fetch promotion requests
  const { data: promotionRequests, isLoading: promotionsLoading } = useQuery<PromotionRequest[]>({
    queryKey: ['sponsor-promotion-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('intern_promotion_requests')
        .select(`
          *,
          promotion_engagements!inner(
            person_id,
            current_stage,
            track,
            employees!inner(first_name, last_name)
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data || []).map((req: any) => ({
        ...req,
        intern_name: `${req.promotion_engagements.employees.first_name} ${req.promotion_engagements.employees.last_name}`,
        intern_track: req.promotion_engagements.track,
        intern_current_state: req.promotion_engagements.current_stage,
      }));
    },
  });

  // Fetch enforcement requests
  const { data: enforcementRequests, isLoading: enforcementLoading } = useQuery<EnforcementRequest[]>({
    queryKey: ['sponsor-enforcement-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('intern_enforcement_requests')
        .select(`
          *,
          promotion_engagements!inner(
            person_id,
            track,
            employees!inner(first_name, last_name)
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data || []).map((req: any) => ({
        ...req,
        intern_name: `${req.promotion_engagements.employees.first_name} ${req.promotion_engagements.employees.last_name}`,
        intern_track: req.promotion_engagements.track,
      }));
    },
  });

  // Decision mutation
  const decisionMutation = useMutation({
    mutationFn: async ({
      requestId,
      type,
      decision,
      reasonCode,
      comment,
    }: {
      requestId: string;
      type: 'promotion' | 'enforcement';
      decision: string;
      reasonCode: string;
      comment: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (type === 'promotion') {
        const { error } = await supabase
          .from('intern_promotion_requests')
          .update({
            status: decision,
            sponsor_id: user.id,
            sponsor_decision: decision,
            sponsor_reason_code: reasonCode,
            sponsor_comment: comment,
            decided_at: new Date().toISOString(),
          })
          .eq('id', requestId);

        if (error) throw error;

        // If approved, update engagement state
        if (decision === 'approved') {
          const { data: request } = await supabase
            .from('intern_promotion_requests')
            .select('engagement_id, target_role_state')
            .eq('id', requestId)
            .single();

          if (request) {
            await supabase
              .from('promotion_engagements')
              .update({ current_stage: request.target_role_state })
              .eq('id', request.engagement_id);
          }
        }
      } else {
        const { error } = await supabase
          .from('intern_enforcement_requests')
          .update({
            status: decision,
            sponsor_id: user.id,
            sponsor_reason_code: reasonCode,
            sponsor_comment: comment,
            decided_at: new Date().toISOString(),
          })
          .eq('id', requestId);

        if (error) throw error;
      }

      // Log action
      await supabase.rpc('log_intern_program_action', {
        p_actor_id: user.id,
        p_action: `SPONSOR_${decision.toUpperCase()}_${type.toUpperCase()}`,
        p_entity_type: type === 'promotion' ? 'promotion_request' : 'enforcement_request',
        p_entity_id: requestId,
        p_affected_user_id: null,
        p_reason: `${decision}: ${comment}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sponsor-promotion-requests'] });
      queryClient.invalidateQueries({ queryKey: ['sponsor-enforcement-requests'] });
      queryClient.invalidateQueries({ queryKey: ['sponsor-kpis'] });
      setDecisionModalOpen(false);
      setSelectedRequest(null);
      setReasonCode('');
      setComment('');
    },
  });

  const handleDecision = (requestId: string, type: 'promotion' | 'enforcement', decision: 'approve' | 'deny' | 'defer' | 'more_info') => {
    setSelectedRequest(requestId);
    setDecisionType(decision);
    setDecisionModalOpen(true);
  };

  const submitDecision = () => {
    if (!selectedRequest || !reasonCode || !comment.trim()) return;

    const decisionMap = {
      approve: 'approved',
      deny: 'denied',
      defer: 'deferred',
      more_info: 'more_info_requested',
    };

    decisionMutation.mutate({
      requestId: selectedRequest,
      type: activeTab,
      decision: decisionMap[decisionType],
      reasonCode,
      comment,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Approval Queue</h1>
        <p className="text-gray-500 mt-1">
          Review and approve promotion requests and enforcement actions.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => {
              setActiveTab('promotion');
              setSearchParams({ type: 'promotion' });
            }}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'promotion'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Promotion Approvals
            {promotionRequests && promotionRequests.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full text-xs">
                {promotionRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab('enforcement');
              setSearchParams({ type: 'enforcement' });
            }}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'enforcement'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Enforcement Approvals
            {enforcementRequests && enforcementRequests.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-xs">
                {enforcementRequests.length}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Requests List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {activeTab === 'promotion' ? (
          promotionsLoading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
            </div>
          ) : (promotionRequests || []).length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No pending promotion approvals.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {promotionRequests.map((request) => (
                <RequestRow
                  key={request.id}
                  request={request}
                  type="promotion"
                  onView={() => navigate(`/sponsor/interns/${request.engagement_id}`)}
                  onApprove={() => handleDecision(request.id, 'promotion', 'approve')}
                  onDeny={() => handleDecision(request.id, 'promotion', 'deny')}
                  onDefer={() => handleDecision(request.id, 'promotion', 'defer')}
                />
              ))}
            </div>
          )
        ) : (
          enforcementLoading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
            </div>
          ) : (enforcementRequests || []).length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No pending enforcement approvals.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {enforcementRequests.map((request) => (
                <RequestRow
                  key={request.id}
                  request={request}
                  type="enforcement"
                  onView={() => navigate(`/sponsor/interns/${request.engagement_id}`)}
                  onApprove={() => handleDecision(request.id, 'enforcement', 'approve')}
                  onDeny={() => handleDecision(request.id, 'enforcement', 'deny')}
                  onMoreInfo={() => handleDecision(request.id, 'enforcement', 'more_info')}
                />
              ))}
            </div>
          )
        )}
      </div>

      {/* Decision Modal */}
      {decisionModalOpen && (
        <DecisionModal
          type={activeTab}
          decisionType={decisionType}
          reasonCode={reasonCode}
          comment={comment}
          onReasonCodeChange={setReasonCode}
          onCommentChange={setComment}
          onSubmit={submitDecision}
          onCancel={() => {
            setDecisionModalOpen(false);
            setSelectedRequest(null);
            setReasonCode('');
            setComment('');
          }}
          isLoading={decisionMutation.isPending}
        />
      )}
    </div>
  );
};

interface RequestRowProps {
  request: PromotionRequest | EnforcementRequest;
  type: 'promotion' | 'enforcement';
  onView: () => void;
  onApprove: () => void;
  onDeny: () => void;
  onDefer?: () => void;
  onMoreInfo?: () => void;
}

const RequestRow: React.FC<RequestRowProps> = ({
  request,
  type,
  onView,
  onApprove,
  onDeny,
  onDefer,
  onMoreInfo,
}) => {
  const isPromotion = type === 'promotion';
  const promotionReq = isPromotion ? (request as PromotionRequest) : null;
  const enforcementReq = !isPromotion ? (request as EnforcementRequest) : null;

  const severityColors = {
    low: 'bg-gray-100 text-gray-700',
    medium: 'bg-yellow-100 text-yellow-700',
    high: 'bg-orange-100 text-orange-700',
    critical: 'bg-red-100 text-red-700',
  };

  return (
    <div className="p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold text-gray-900">{request.intern_name}</h3>
            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
              {request.intern_track}
            </span>
            {enforcementReq && (
              <span className={`px-2 py-0.5 rounded text-xs ${severityColors[enforcementReq.severity as keyof typeof severityColors]}`}>
                {enforcementReq.severity}
              </span>
            )}
          </div>
          <div className="text-sm text-gray-600 mb-2">
            {isPromotion ? (
              <>
                <span>Promote to: {promotionReq!.target_role_state}</span>
                {promotionReq!.manager_recommendation && (
                  <span className="ml-4">Manager: {promotionReq!.manager_recommendation}</span>
                )}
                <span className={`ml-4 ${promotionReq!.eligibility_status === 'eligible' ? 'text-green-600' : 'text-red-600'}`}>
                  Eligibility: {promotionReq!.eligibility_status}
                </span>
              </>
            ) : (
              <>
                <span>Action: {enforcementReq!.action_type}</span>
                <span className="ml-4">Reason: {enforcementReq!.reason}</span>
              </>
            )}
          </div>
          <div className="text-xs text-gray-400">
            Submitted: {new Date(request.created_at).toLocaleDateString()}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onView}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="View Evidence"
          >
            <Eye className="w-5 h-5 text-gray-500" />
          </button>
          <button
            onClick={onApprove}
            className="px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
          >
            Approve
          </button>
          <button
            onClick={onDeny}
            className="px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
          >
            Deny
          </button>
          {onDefer && (
            <button
              onClick={onDefer}
              className="px-3 py-1.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium"
            >
              Defer
            </button>
          )}
          {onMoreInfo && (
            <button
              onClick={onMoreInfo}
              className="px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
            >
              More Info
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

interface DecisionModalProps {
  type: 'promotion' | 'enforcement';
  decisionType: 'approve' | 'deny' | 'defer' | 'more_info';
  reasonCode: string;
  comment: string;
  onReasonCodeChange: (value: string) => void;
  onCommentChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

const DecisionModal: React.FC<DecisionModalProps> = ({
  type,
  decisionType,
  reasonCode,
  comment,
  onReasonCodeChange,
  onCommentChange,
  onSubmit,
  onCancel,
  isLoading,
}) => {
  const decisionLabels = {
    approve: 'Approve',
    deny: 'Deny',
    defer: 'Defer',
    more_info: 'Request More Info',
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {decisionLabels[decisionType]} {type === 'promotion' ? 'Promotion' : 'Enforcement'}
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason Code *
            </label>
            <select
              value={reasonCode}
              onChange={(e) => onReasonCodeChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            >
              <option value="">Select reason code</option>
              <option value="MEETS_CRITERIA">Meets all criteria</option>
              <option value="STRONG_PERFORMANCE">Strong performance</option>
              <option value="NOT_READY">Not ready for promotion</option>
              <option value="NEEDS_DEVELOPMENT">Needs more development</option>
              <option value="COMPLIANCE_ISSUE">Compliance issue</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Comment / Justification *
            </label>
            <textarea
              value={comment}
              onChange={(e) => onCommentChange(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Provide detailed justification for this decision..."
              required
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={isLoading || !reasonCode || !comment.trim()}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Submitting...' : 'Submit Decision'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApprovalQueue;


