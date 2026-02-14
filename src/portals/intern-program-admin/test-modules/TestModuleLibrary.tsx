// @ts-nocheck
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Plus,
  Search,
  Filter,
  Edit2,
  Archive,
  MoreVertical,
  BookOpen,
  Clock,
  Target,
  Users,
  ChevronDown,
  X,
  CheckCircle,
} from 'lucide-react';

interface TestModule {
  id: string;
  name: string;
  category: string;
  competency_tags: string[];
  level: string;
  test_type: string;
  time_limit_minutes: number | null;
  pass_threshold: number;
  retake_limit: number;
  reviewer_type: string;
  artifact_required: boolean;
  counts_toward_promotion: boolean;
  allowed_role_states: string[];
  description: string | null;
  is_archived: boolean;
  version: number;
  created_at: string;
}

const categories = ['Onboarding', 'Ops', 'Tech', 'Compliance', 'Leadership', 'Quality'];
const levels = ['L1', 'L2', 'L3'];
const testTypes = ['Quiz', 'Scenario', 'Artifact', 'Build', 'Memo'];
const reviewerTypes = ['Auto', 'Manager', 'Executive'];
const roleStates = ['INTERN_ACTIVE', 'ACTING_EXECUTIVE', 'EXECUTIVE_OFFICER'];

const levelColors: Record<string, string> = {
  L1: 'bg-green-100 text-green-700',
  L2: 'bg-amber-100 text-amber-700',
  L3: 'bg-red-100 text-red-700',
};

const categoryColors: Record<string, string> = {
  Onboarding: 'bg-blue-100 text-blue-700',
  Ops: 'bg-purple-100 text-purple-700',
  Tech: 'bg-cyan-100 text-cyan-700',
  Compliance: 'bg-red-100 text-red-700',
  Leadership: 'bg-amber-100 text-amber-700',
  Quality: 'bg-green-100 text-green-700',
};

const TestModuleLibrary: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<TestModule | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: 'Onboarding',
    competency_tags: [] as string[],
    level: 'L1',
    test_type: 'Quiz',
    time_limit_minutes: 30,
    pass_threshold: 70,
    retake_limit: 3,
    reviewer_type: 'Auto',
    artifact_required: false,
    counts_toward_promotion: true,
    allowed_role_states: ['INTERN_ACTIVE'],
    description: '',
  });
  const [tagInput, setTagInput] = useState('');

  // Fetch test modules
  const { data: modules, isLoading } = useQuery({
    queryKey: ['test-modules', categoryFilter, levelFilter, showArchived],
    queryFn: async () => {
      let query = supabase
        .from('intern_test_modules')
        .select('*')
        .order('created_at', { ascending: false });

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }
      if (levelFilter !== 'all') {
        query = query.eq('level', levelFilter);
      }
      if (!showArchived) {
        query = query.eq('is_archived', false);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as TestModule[];
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<TestModule>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (editingModule) {
        // Update
        const { error } = await supabase
          .from('intern_test_modules')
          .update({
            ...data,
            version: editingModule.version + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingModule.id);
        if (error) throw error;

        // Log action
        await supabase.rpc('log_intern_program_action', {
          p_actor_id: user.id,
          p_action: 'UPDATE_TEST_MODULE',
          p_entity_type: 'test_module',
          p_entity_id: editingModule.id,
          p_affected_user_id: null,
          p_reason: `Updated test module: ${data.name}`,
        });
      } else {
        // Create
        const { data: newModule, error } = await supabase
          .from('intern_test_modules')
          .insert({
            ...data,
            created_by: user.id,
          })
          .select()
          .single();
        if (error) throw error;

        // Log action
        await supabase.rpc('log_intern_program_action', {
          p_actor_id: user.id,
          p_action: 'CREATE_TEST_MODULE',
          p_entity_type: 'test_module',
          p_entity_id: newModule.id,
          p_affected_user_id: null,
          p_reason: `Created test module: ${data.name}`,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-modules'] });
      setIsModalOpen(false);
      setEditingModule(null);
      resetForm();
    },
  });

  // Archive mutation
  const archiveMutation = useMutation({
    mutationFn: async (moduleId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('intern_test_modules')
        .update({ is_archived: true, updated_at: new Date().toISOString() })
        .eq('id', moduleId);
      if (error) throw error;

      await supabase.rpc('log_intern_program_action', {
        p_actor_id: user.id,
        p_action: 'ARCHIVE_TEST_MODULE',
        p_entity_type: 'test_module',
        p_entity_id: moduleId,
        p_affected_user_id: null,
        p_reason: 'Archived test module',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-modules'] });
      setActionMenuOpen(null);
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'Onboarding',
      competency_tags: [],
      level: 'L1',
      test_type: 'Quiz',
      time_limit_minutes: 30,
      pass_threshold: 70,
      retake_limit: 3,
      reviewer_type: 'Auto',
      artifact_required: false,
      counts_toward_promotion: true,
      allowed_role_states: ['INTERN_ACTIVE'],
      description: '',
    });
    setTagInput('');
  };

  const openEditModal = (module: TestModule) => {
    setEditingModule(module);
    setFormData({
      name: module.name,
      category: module.category,
      competency_tags: module.competency_tags || [],
      level: module.level,
      test_type: module.test_type,
      time_limit_minutes: module.time_limit_minutes || 30,
      pass_threshold: module.pass_threshold,
      retake_limit: module.retake_limit || 3,
      reviewer_type: module.reviewer_type,
      artifact_required: module.artifact_required,
      counts_toward_promotion: module.counts_toward_promotion,
      allowed_role_states: module.allowed_role_states || ['INTERN_ACTIVE'],
      description: module.description || '',
    });
    setIsModalOpen(true);
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.competency_tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        competency_tags: [...formData.competency_tags, tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({
      ...formData,
      competency_tags: formData.competency_tags.filter((t) => t !== tag),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const filteredModules = (modules || []).filter((m) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      m.name.toLowerCase().includes(search) ||
      m.description?.toLowerCase().includes(search) ||
      m.competency_tags?.some((t) => t.toLowerCase().includes(search))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Test Module Library</h1>
          <p className="text-gray-500 mt-1">
            Defines what competency means at Crave'n. Create, edit, and archive test modules.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingModule(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          New Test Module
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, description, or tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white min-w-[150px]"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white min-w-[120px]"
            >
              <option value="all">All Levels</option>
              {levels.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
            />
            Show Archived
          </label>
        </div>
      </div>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
              <div className="flex gap-2 mb-4">
                <div className="h-6 bg-gray-200 rounded w-16" />
                <div className="h-6 bg-gray-200 rounded w-12" />
              </div>
              <div className="h-3 bg-gray-200 rounded w-full mb-2" />
              <div className="h-3 bg-gray-200 rounded w-2/3" />
            </div>
          ))
        ) : filteredModules.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            No test modules found. Create your first module to get started.
          </div>
        ) : (
          filteredModules.map((module) => (
            <div
              key={module.id}
              className={`bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow ${
                module.is_archived ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{module.name}</h3>
                  <p className="text-sm text-gray-500">{module.test_type} • v{module.version}</p>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setActionMenuOpen(actionMenuOpen === module.id ? null : module.id)}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <MoreVertical className="w-5 h-5 text-gray-400" />
                  </button>
                  {actionMenuOpen === module.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setActionMenuOpen(null)} />
                      <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                        <button
                          onClick={() => {
                            openEditModal(module);
                            setActionMenuOpen(null);
                          }}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit
                        </button>
                        {!module.is_archived && (
                          <button
                            onClick={() => archiveMutation.mutate(module.id)}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Archive className="w-4 h-4" />
                            Archive
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${categoryColors[module.category]}`}>
                  {module.category}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${levelColors[module.level]}`}>
                  {module.level}
                </span>
                {module.is_archived && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    Archived
                  </span>
                )}
              </div>

              {module.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{module.description}</p>
              )}

              <div className="flex flex-wrap gap-1 mb-3">
                {(module.competency_tags || []).slice(0, 3).map((tag) => (
                  <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                    {tag}
                  </span>
                ))}
                {(module.competency_tags || []).length > 3 && (
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                    +{module.competency_tags.length - 3}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 text-xs text-gray-500 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-1">
                  <Target className="w-3.5 h-3.5" />
                  {module.pass_threshold}% to pass
                </div>
                {module.time_limit_minutes && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {module.time_limit_minutes}m
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {module.reviewer_type}
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
                {editingModule ? 'Edit Test Module' : 'New Test Module'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Category & Level */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Level *</label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {levels.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Test Type & Reviewer */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Test Type *</label>
                  <select
                    value={formData.test_type}
                    onChange={(e) => setFormData({ ...formData, test_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {testTypes.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reviewer Type *</label>
                  <select
                    value={formData.reviewer_type}
                    onChange={(e) => setFormData({ ...formData, reviewer_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {reviewerTypes.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Time, Threshold, Retakes */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time Limit (min)</label>
                  <input
                    type="number"
                    value={formData.time_limit_minutes}
                    onChange={(e) => setFormData({ ...formData, time_limit_minutes: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pass Threshold %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.pass_threshold}
                    onChange={(e) => setFormData({ ...formData, pass_threshold: parseInt(e.target.value) || 70 })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Retake Limit</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.retake_limit}
                    onChange={(e) => setFormData({ ...formData, retake_limit: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Competency Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Competency Tags</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    placeholder="Add a tag..."
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.competency_tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded text-sm">
                      {tag}
                      <button type="button" onClick={() => handleRemoveTag(tag)}>
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Allowed Role States */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Allowed Role States</label>
                <div className="flex flex-wrap gap-3">
                  {roleStates.map((state) => (
                    <label key={state} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.allowed_role_states.includes(state)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              allowed_role_states: [...formData.allowed_role_states, state],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              allowed_role_states: formData.allowed_role_states.filter((s) => s !== state),
                            });
                          }
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                      />
                      <span className="text-sm text-gray-700">{state.replace(/_/g, ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Checkboxes */}
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.artifact_required}
                    onChange={(e) => setFormData({ ...formData, artifact_required: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                  />
                  <span className="text-sm text-gray-700">Artifact Required</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.counts_toward_promotion}
                    onChange={(e) => setFormData({ ...formData, counts_toward_promotion: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                  />
                  <span className="text-sm text-gray-700">Counts Toward Promotion</span>
                </label>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                />
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
                disabled={saveMutation.isPending || !formData.name}
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
                    {editingModule ? 'Update Module' : 'Create Module'}
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

export default TestModuleLibrary;


