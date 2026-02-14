import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Plus,
  Edit2,
  Trash2,
  Scale,
  ArrowRight,
  CheckCircle,
  X,
  AlertTriangle,
  Shield,
  Clock,
  Target,
  Users,
  Award,
} from 'lucide-react';

interface PromotionRule {
  id: string;
  rule_name: string;
  description: string | null;
  from_state: string;
  to_state: string;
  min_passed_tests: number;
  min_test_level: string | null;
  required_categories: string[];
  compliance_required: boolean;
  min_review_score: number;
  min_tenure_days: number;
  acting_term_completed: boolean;
  sponsor_approval_required: boolean;
  is_active: boolean;
  priority: number;
  created_at: string;
}

const roleStates = [
  { value: 'APPLIED', label: 'Applied', color: 'bg-gray-100 text-gray-700' },
  { value: 'INTERN_ACTIVE', label: 'Intern Active', color: 'bg-blue-100 text-blue-700' },
  { value: 'ACTING_EXECUTIVE', label: 'Acting Executive', color: 'bg-purple-100 text-purple-700' },
  { value: 'EXECUTIVE_OFFICER', label: 'Executive Officer', color: 'bg-green-100 text-green-700' },
];

const categories = ['Onboarding', 'Ops', 'Tech', 'Compliance', 'Leadership', 'Quality'];
const testLevels = ['L1', 'L2', 'L3'];

const PromotionRulesEngine: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<PromotionRule | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    rule_name: '',
    description: '',
    from_state: 'INTERN_ACTIVE',
    to_state: 'ACTING_EXECUTIVE',
    min_passed_tests: 5,
    min_test_level: 'L1',
    required_categories: [] as string[],
    compliance_required: true,
    min_review_score: 70,
    min_tenure_days: 30,
    acting_term_completed: false,
    sponsor_approval_required: false,
    is_active: true,
    priority: 0,
  });

  // Fetch promotion rules
  const { data: rules, isLoading } = useQuery({
    queryKey: ['promotion-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('intern_promotion_rules')
        .select('*')
        .order('priority', { ascending: false });
      if (error) throw error;
      return data as PromotionRule[];
    },
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<PromotionRule>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (editingRule) {
        const { error } = await supabase
          .from('intern_promotion_rules')
          .update({
            ...data,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingRule.id);
        if (error) throw error;

        await supabase.rpc('log_intern_program_action', {
          p_actor_id: user.id,
          p_action: 'UPDATE_PROMOTION_RULE',
          p_entity_type: 'promotion_rule',
          p_entity_id: editingRule.id,
          p_affected_user_id: null,
          p_reason: `Updated promotion rule: ${data.rule_name}`,
        });
      } else {
        const { data: newRule, error } = await supabase
          .from('intern_promotion_rules')
          .insert({
            ...data,
            created_by: user.id,
          })
          .select()
          .single();
        if (error) throw error;

        await supabase.rpc('log_intern_program_action', {
          p_actor_id: user.id,
          p_action: 'CREATE_PROMOTION_RULE',
          p_entity_type: 'promotion_rule',
          p_entity_id: newRule.id,
          p_affected_user_id: null,
          p_reason: `Created promotion rule: ${data.rule_name}`,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotion-rules'] });
      setIsModalOpen(false);
      setEditingRule(null);
      resetForm();
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('intern_promotion_rules')
        .delete()
        .eq('id', ruleId);
      if (error) throw error;

      await supabase.rpc('log_intern_program_action', {
        p_actor_id: user.id,
        p_action: 'DELETE_PROMOTION_RULE',
        p_entity_type: 'promotion_rule',
        p_entity_id: ruleId,
        p_affected_user_id: null,
        p_reason: 'Deleted promotion rule',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotion-rules'] });
    },
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ ruleId, isActive }: { ruleId: string; isActive: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('intern_promotion_rules')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', ruleId);
      if (error) throw error;

      await supabase.rpc('log_intern_program_action', {
        p_actor_id: user.id,
        p_action: isActive ? 'ENABLE_PROMOTION_RULE' : 'DISABLE_PROMOTION_RULE',
        p_entity_type: 'promotion_rule',
        p_entity_id: ruleId,
        p_affected_user_id: null,
        p_reason: `${isActive ? 'Enabled' : 'Disabled'} promotion rule`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotion-rules'] });
    },
  });

  const resetForm = () => {
    setFormData({
      rule_name: '',
      description: '',
      from_state: 'INTERN_ACTIVE',
      to_state: 'ACTING_EXECUTIVE',
      min_passed_tests: 5,
      min_test_level: 'L1',
      required_categories: [],
      compliance_required: true,
      min_review_score: 70,
      min_tenure_days: 30,
      acting_term_completed: false,
      sponsor_approval_required: false,
      is_active: true,
      priority: 0,
    });
  };

  const openEditModal = (rule: PromotionRule) => {
    setEditingRule(rule);
    setFormData({
      rule_name: rule.rule_name,
      description: rule.description || '',
      from_state: rule.from_state,
      to_state: rule.to_state,
      min_passed_tests: rule.min_passed_tests,
      min_test_level: rule.min_test_level || 'L1',
      required_categories: rule.required_categories || [],
      compliance_required: rule.compliance_required,
      min_review_score: rule.min_review_score,
      min_tenure_days: rule.min_tenure_days,
      acting_term_completed: rule.acting_term_completed,
      sponsor_approval_required: rule.sponsor_approval_required,
      is_active: rule.is_active,
      priority: rule.priority,
    });
    setIsModalOpen(true);
  };

  const toggleCategory = (category: string) => {
    if (formData.required_categories.includes(category)) {
      setFormData({
        ...formData,
        required_categories: formData.required_categories.filter((c) => c !== category),
      });
    } else {
      setFormData({
        ...formData,
        required_categories: [...formData.required_categories, category],
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const getStateStyle = (state: string) => {
    return roleStates.find((s) => s.value === state)?.color || 'bg-gray-100 text-gray-700';
  };

  const getStateLabel = (state: string) => {
    return roleStates.find((s) => s.value === state)?.label || state;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Promotion Rules Engine</h1>
          <p className="text-gray-500 mt-1">
            Define deterministic rules for advancement. If rules are not met, promotion actions are disabled in all portals.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingRule(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          New Rule
        </button>
      </div>

      {/* Warning Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-700">
          <strong>Enforcement Notice:</strong> All rule changes apply prospectively, not retroactively. 
          Promotion logic is deterministic — if rules are not met, the system will block promotion actions.
        </div>
      </div>

      {/* Rules List */}
      <div className="space-y-4">
        {isLoading ? (
          [...Array(2)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
              <div className="flex gap-4 mb-4">
                <div className="h-8 bg-gray-200 rounded w-32" />
                <div className="h-8 bg-gray-200 rounded w-8" />
                <div className="h-8 bg-gray-200 rounded w-32" />
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="h-4 bg-gray-200 rounded" />
                <div className="h-4 bg-gray-200 rounded" />
                <div className="h-4 bg-gray-200 rounded" />
                <div className="h-4 bg-gray-200 rounded" />
              </div>
            </div>
          ))
        ) : (rules || []).length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <Scale className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Promotion Rules</h3>
            <p className="text-gray-500 mb-4">Create rules to define advancement requirements.</p>
            <button
              onClick={() => {
                resetForm();
                setEditingRule(null);
                setIsModalOpen(true);
              }}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              Create Rule
            </button>
          </div>
        ) : (
          (rules || []).map((rule) => (
            <div
              key={rule.id}
              className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${
                !rule.is_active ? 'opacity-60' : ''
              }`}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900">{rule.rule_name}</h3>
                      {!rule.is_active && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                          Inactive
                        </span>
                      )}
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs font-medium">
                        Priority: {rule.priority}
                      </span>
                    </div>
                    {rule.description && (
                      <p className="text-gray-500 mt-1">{rule.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleActiveMutation.mutate({ ruleId: rule.id, isActive: !rule.is_active })}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        rule.is_active
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {rule.is_active ? 'Active' : 'Inactive'}
                    </button>
                    <button
                      onClick={() => openEditModal(rule)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this rule?')) {
                          deleteMutation.mutate(rule.id);
                        }
                      }}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>

                {/* State Transition */}
                <div className="flex items-center gap-4 mb-6">
                  <span className={`px-4 py-2 rounded-lg font-medium ${getStateStyle(rule.from_state)}`}>
                    {getStateLabel(rule.from_state)}
                  </span>
                  <ArrowRight className="w-6 h-6 text-gray-400" />
                  <span className={`px-4 py-2 rounded-lg font-medium ${getStateStyle(rule.to_state)}`}>
                    {getStateLabel(rule.to_state)}
                  </span>
                </div>

                {/* Requirements Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Target className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Min Tests:</span>
                    <span className="font-semibold text-gray-900">{rule.min_passed_tests}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Award className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Min Level:</span>
                    <span className="font-semibold text-gray-900">{rule.min_test_level || 'Any'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Min Score:</span>
                    <span className="font-semibold text-gray-900">{rule.min_review_score}%</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Min Tenure:</span>
                    <span className="font-semibold text-gray-900">{rule.min_tenure_days} days</span>
                  </div>
                </div>

                {/* Additional Requirements */}
                <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-100">
                  {rule.compliance_required && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-700 rounded-full text-xs font-medium">
                      <Shield className="w-3.5 h-3.5" />
                      Compliance Required
                    </span>
                  )}
                  {rule.sponsor_approval_required && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium">
                      <Users className="w-3.5 h-3.5" />
                      Sponsor Approval
                    </span>
                  )}
                  {rule.acting_term_completed && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      Acting Term Complete
                    </span>
                  )}
                  {(rule.required_categories || []).map((cat) => (
                    <span key={cat} className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsModalOpen(false)} />
          <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[600px] md:max-h-[90vh] bg-white rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingRule ? 'Edit Promotion Rule' : 'New Promotion Rule'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Rule Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rule Name *</label>
                <input
                  type="text"
                  value={formData.rule_name}
                  onChange={(e) => setFormData({ ...formData, rule_name: e.target.value })}
                  required
                  placeholder="e.g., Intern to Acting Executive"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  placeholder="Describe this promotion rule..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                />
              </div>

              {/* State Transition */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From State *</label>
                  <select
                    value={formData.from_state}
                    onChange={(e) => setFormData({ ...formData, from_state: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {roleStates.slice(0, -1).map((state) => (
                      <option key={state.value} value={state.value}>{state.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To State *</label>
                  <select
                    value={formData.to_state}
                    onChange={(e) => setFormData({ ...formData, to_state: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {roleStates.slice(1).map((state) => (
                      <option key={state.value} value={state.value}>{state.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Numeric Requirements */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Passed Tests</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.min_passed_tests}
                    onChange={(e) => setFormData({ ...formData, min_passed_tests: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Test Level</label>
                  <select
                    value={formData.min_test_level}
                    onChange={(e) => setFormData({ ...formData, min_test_level: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {testLevels.map((level) => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Review Score (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.min_review_score}
                    onChange={(e) => setFormData({ ...formData, min_review_score: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Tenure (Days)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.min_tenure_days}
                    onChange={(e) => setFormData({ ...formData, min_tenure_days: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <p className="text-xs text-gray-500 mt-1">Higher priority rules are evaluated first</p>
              </div>

              {/* Required Categories */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Required Categories</label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        formData.required_categories.includes(cat)
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Boolean Requirements */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.compliance_required}
                    onChange={(e) => setFormData({ ...formData, compliance_required: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                  />
                  <span className="text-sm text-gray-700">Compliance tests must be passed</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.sponsor_approval_required}
                    onChange={(e) => setFormData({ ...formData, sponsor_approval_required: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                  />
                  <span className="text-sm text-gray-700">Sponsor approval required</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.acting_term_completed}
                    onChange={(e) => setFormData({ ...formData, acting_term_completed: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                  />
                  <span className="text-sm text-gray-700">Acting term must be completed</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                  />
                  <span className="text-sm text-gray-700">Rule is active</span>
                </label>
              </div>
            </form>
            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={saveMutation.isPending || !formData.rule_name}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saveMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    {editingRule ? 'Update Rule' : 'Create Rule'}
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PromotionRulesEngine;


