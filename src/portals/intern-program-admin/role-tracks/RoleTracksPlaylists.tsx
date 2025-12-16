import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Plus,
  Edit2,
  Trash2,
  GitBranch,
  BookOpen,
  Target,
  Award,
  X,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';

interface RoleTrack {
  id: string;
  name: string;
  description: string | null;
  required_competency_tags: string[];
  minimum_test_level: string;
  leadership_required: boolean;
  recommended_test_modules: string[];
  is_active: boolean;
  created_at: string;
}

interface TestModule {
  id: string;
  name: string;
  category: string;
  level: string;
}

const levelColors: Record<string, string> = {
  L1: 'bg-green-100 text-green-700 border-green-200',
  L2: 'bg-amber-100 text-amber-700 border-amber-200',
  L3: 'bg-red-100 text-red-700 border-red-200',
};

const RoleTracksPlaylists: React.FC = () => {
  const queryClient = useQueryClient();
  const [expandedTrack, setExpandedTrack] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState<RoleTrack | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    required_competency_tags: [] as string[],
    minimum_test_level: 'L1',
    leadership_required: false,
    recommended_test_modules: [] as string[],
    is_active: true,
  });
  const [tagInput, setTagInput] = useState('');

  // Fetch role tracks
  const { data: tracks, isLoading: tracksLoading } = useQuery({
    queryKey: ['role-tracks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('intern_role_tracks')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as RoleTrack[];
    },
  });

  // Fetch test modules for playlist selection
  const { data: testModules } = useQuery({
    queryKey: ['test-modules-for-playlist'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('intern_test_modules')
        .select('id, name, category, level')
        .eq('is_archived', false)
        .order('category', { ascending: true });
      if (error) throw error;
      return data as TestModule[];
    },
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<RoleTrack>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (editingTrack) {
        const { error } = await supabase
          .from('intern_role_tracks')
          .update({
            ...data,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingTrack.id);
        if (error) throw error;

        await supabase.rpc('log_intern_program_action', {
          p_actor_id: user.id,
          p_action: 'UPDATE_ROLE_TRACK',
          p_entity_type: 'role_track',
          p_entity_id: editingTrack.id,
          p_affected_user_id: null,
          p_reason: `Updated role track: ${data.name}`,
        });
      } else {
        const { data: newTrack, error } = await supabase
          .from('intern_role_tracks')
          .insert(data)
          .select()
          .single();
        if (error) throw error;

        await supabase.rpc('log_intern_program_action', {
          p_actor_id: user.id,
          p_action: 'CREATE_ROLE_TRACK',
          p_entity_type: 'role_track',
          p_entity_id: newTrack.id,
          p_affected_user_id: null,
          p_reason: `Created role track: ${data.name}`,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-tracks'] });
      setIsModalOpen(false);
      setEditingTrack(null);
      resetForm();
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (trackId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('intern_role_tracks')
        .delete()
        .eq('id', trackId);
      if (error) throw error;

      await supabase.rpc('log_intern_program_action', {
        p_actor_id: user.id,
        p_action: 'DELETE_ROLE_TRACK',
        p_entity_type: 'role_track',
        p_entity_id: trackId,
        p_affected_user_id: null,
        p_reason: 'Deleted role track',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-tracks'] });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      required_competency_tags: [],
      minimum_test_level: 'L1',
      leadership_required: false,
      recommended_test_modules: [],
      is_active: true,
    });
    setTagInput('');
  };

  const openEditModal = (track: RoleTrack) => {
    setEditingTrack(track);
    setFormData({
      name: track.name,
      description: track.description || '',
      required_competency_tags: track.required_competency_tags || [],
      minimum_test_level: track.minimum_test_level || 'L1',
      leadership_required: track.leadership_required,
      recommended_test_modules: track.recommended_test_modules || [],
      is_active: track.is_active,
    });
    setIsModalOpen(true);
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.required_competency_tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        required_competency_tags: [...formData.required_competency_tags, tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({
      ...formData,
      required_competency_tags: formData.required_competency_tags.filter((t) => t !== tag),
    });
  };

  const toggleTestModule = (moduleId: string) => {
    if (formData.recommended_test_modules.includes(moduleId)) {
      setFormData({
        ...formData,
        recommended_test_modules: formData.recommended_test_modules.filter((id) => id !== moduleId),
      });
    } else {
      setFormData({
        ...formData,
        recommended_test_modules: [...formData.recommended_test_modules, moduleId],
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const getRecommendedModuleNames = (moduleIds: string[]) => {
    return moduleIds
      .map((id) => testModules?.find((m) => m.id === id)?.name)
      .filter(Boolean);
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Role Tracks & Playlists</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Define competency requirements per role. Playlists are recommendations only.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingTrack(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-3 py-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          New Track
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-700">
          <strong>Note:</strong> Playlists are recommendations only. Test assignments must be made manually or through promotion rules.
        </div>
      </div>

      {/* Tracks List */}
      <div className="space-y-2">
        {tracksLoading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-1/3 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-2/3" />
            </div>
          ))
        ) : (tracks || []).length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8 text-center">
            <GitBranch className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-medium text-gray-900 mb-1">No Role Tracks</h3>
            <p className="text-sm text-gray-500 mb-3">Create your first role track to define competency requirements.</p>
            <button
              onClick={() => {
                resetForm();
                setEditingTrack(null);
                setIsModalOpen(true);
              }}
              className="px-3 py-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm"
            >
              Create Track
            </button>
          </div>
        ) : (
          (tracks || []).map((track) => (
            <div
              key={track.id}
              className={`bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden ${
                !track.is_active ? 'opacity-60' : ''
              }`}
            >
              {/* Track Header */}
              <div className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                        <GitBranch className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-semibold text-gray-900 truncate">{track.name}</h3>
                        {!track.is_active && (
                          <span className="text-xs text-gray-500">Inactive</span>
                        )}
                      </div>
                    </div>
                    {track.description && (
                      <p className="text-sm text-gray-600 mb-2 ml-9 line-clamp-1">{track.description}</p>
                    )}

                    {/* Track Requirements */}
                    <div className="flex flex-wrap items-center gap-2 ml-9">
                      <div className="flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-xs text-gray-600">Min:</span>
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium border ${levelColors[track.minimum_test_level || 'L1']}`}>
                          {track.minimum_test_level || 'L1'}
                        </span>
                      </div>
                      {track.leadership_required && (
                        <div className="flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-xs text-amber-600 font-medium">Leadership</span>
                        </div>
                      )}
                    </div>

                    {/* Competency Tags */}
                    {(track.required_competency_tags || []).length > 0 && (
                      <div className="mt-2 ml-9">
                        <div className="flex flex-wrap gap-1.5">
                          {track.required_competency_tags.map((tag) => (
                            <span key={tag} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => openEditModal(track)}
                      className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this track?')) {
                          deleteMutation.mutate(track.id);
                        }
                      }}
                      className="p-1.5 hover:bg-red-50 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                    <button
                      onClick={() => setExpandedTrack(expandedTrack === track.id ? null : track.id)}
                      className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                    >
                      {expandedTrack === track.id ? (
                        <ChevronUp className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded Playlist */}
              {expandedTrack === track.id && (
                <div className="border-t border-gray-100 bg-gray-50 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="w-3.5 h-3.5 text-gray-500" />
                    <h4 className="text-sm font-medium text-gray-900">Recommended Modules</h4>
                    <span className="text-xs text-gray-500">({(track.recommended_test_modules || []).length})</span>
                  </div>
                  {(track.recommended_test_modules || []).length === 0 ? (
                    <p className="text-xs text-gray-500 italic">No recommended modules configured.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {getRecommendedModuleNames(track.recommended_test_modules).map((name, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 px-2 py-1.5 bg-white rounded border border-gray-200">
                          <BookOpen className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                          <span className="text-xs text-gray-700 truncate">{name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
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
                {editingTrack ? 'Edit Role Track' : 'New Role Track'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Track Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="e.g., Founder's Office – Technology"
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
                  placeholder="Describe this track's focus and requirements..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                />
              </div>

              {/* Minimum Test Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Test Level</label>
                <div className="flex gap-3">
                  {['L1', 'L2', 'L3'].map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setFormData({ ...formData, minimum_test_level: level })}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        formData.minimum_test_level === level
                          ? levelColors[level]
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Leadership Required */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.leadership_required}
                  onChange={(e) => setFormData({ ...formData, leadership_required: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                />
                <span className="text-sm text-gray-700">Leadership competency required</span>
              </label>

              {/* Required Competency Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Required Competency Tags</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    placeholder="Add a competency tag..."
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
                  {formData.required_competency_tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm">
                      {tag}
                      <button type="button" onClick={() => handleRemoveTag(tag)}>
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Recommended Test Modules (Playlist) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Recommended Test Modules (Playlist)
                </label>
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                  {(testModules || []).map((module) => (
                    <label
                      key={module.id}
                      className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.recommended_test_modules.includes(module.id)}
                        onChange={() => toggleTestModule(module.id)}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs text-gray-900">{module.name}</span>
                        <span className="text-xs text-gray-500 ml-1.5">({module.category})</span>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${levelColors[module.level]}`}>
                        {module.level}
                      </span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Selected: {formData.recommended_test_modules.length} modules
                </p>
              </div>

              {/* Active */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                />
                <span className="text-sm text-gray-700">Track is active</span>
              </label>
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
                    {editingTrack ? 'Update Track' : 'Create Track'}
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

export default RoleTracksPlaylists;

