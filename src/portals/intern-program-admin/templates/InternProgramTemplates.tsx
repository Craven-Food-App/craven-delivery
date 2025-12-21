import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DOMPurify from 'dompurify';
import { supabase } from '@/integrations/supabase/client';
import {
  FileText,
  Plus,
  Edit2,
  Eye,
  X,
  CheckCircle,
  AlertTriangle,
  Code,
  Copy,
} from 'lucide-react';

interface ProgramTemplate {
  id: string;
  template_type: string;
  name: string;
  description: string | null;
  html_content: string;
  placeholders: string[];
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

const TEMPLATE_TYPES = [
  { value: 'OFFER_LETTER', label: 'Offer Letter', description: 'Initial internship offer' },
  { value: 'CONVERSION_LETTER', label: 'Conversion Letter', description: 'Intern to Acting Exec conversion' },
  { value: 'REVERSION_LETTER', label: 'Reversion Letter', description: 'Role reversion notice' },
  { value: 'EXIT_LETTER', label: 'Exit Letter', description: 'Program exit confirmation' },
  { value: 'AUTHORITY_REVOCATION', label: 'Authority Revocation', description: 'Authority revocation notice' },
];

const SYSTEM_PLACEHOLDERS = [
  '{{INTERN_NAME}}',
  '{{START_DATE}}',
  '{{TRACK}}',
  '{{MANAGER_NAME}}',
  '{{COMPANY_NAME}}',
  '{{NEW_TITLE}}',
  '{{EFFECTIVE_DATE}}',
  '{{SPONSOR_NAME}}',
  '{{DEFERRED_SALARY}}',
  '{{PREVIOUS_ROLE}}',
  '{{NEW_ROLE}}',
  '{{REASON}}',
  '{{EXIT_DATE}}',
  '{{EXIT_REASON}}',
  '{{FINAL_STATUS}}',
  '{{REVOKED_AUTHORITIES}}',
  '{{DATE}}',
  '{{SIGNATURE}}',
];

const InternProgramTemplates: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ProgramTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<ProgramTemplate | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    template_type: 'OFFER_LETTER',
    name: '',
    description: '',
    html_content: '',
    placeholders: [] as string[],
    is_active: true,
  });

  // Fetch templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ['program-templates', selectedType],
    queryFn: async () => {
      let query = supabase
        .from('intern_program_templates')
        .select('*')
        .order('template_type');

      if (selectedType !== 'all') {
        query = query.eq('template_type', selectedType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ProgramTemplate[];
    },
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<ProgramTemplate>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Extract placeholders from content
      const placeholderMatches = data.html_content?.match(/\{\{[A-Z_]+\}\}/g) || [];
      const uniquePlaceholders = [...new Set(placeholderMatches)];

      if (editingTemplate) {
        const { error } = await supabase
          .from('intern_program_templates')
          .update({
            ...data,
            placeholders: uniquePlaceholders,
            version: editingTemplate.version + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingTemplate.id);
        if (error) throw error;

        await supabase.rpc('log_intern_program_action', {
          p_actor_id: user.id,
          p_action: 'UPDATE_TEMPLATE',
          p_entity_type: 'template',
          p_entity_id: editingTemplate.id,
          p_affected_user_id: null,
          p_reason: `Updated template: ${data.name}`,
        });
      } else {
        const { data: newTemplate, error } = await supabase
          .from('intern_program_templates')
          .insert({
            ...data,
            placeholders: uniquePlaceholders,
            created_by: user.id,
          })
          .select()
          .single();
        if (error) throw error;

        await supabase.rpc('log_intern_program_action', {
          p_actor_id: user.id,
          p_action: 'CREATE_TEMPLATE',
          p_entity_type: 'template',
          p_entity_id: newTemplate.id,
          p_affected_user_id: null,
          p_reason: `Created template: ${data.name}`,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-templates'] });
      setIsModalOpen(false);
      setEditingTemplate(null);
      resetForm();
    },
  });

  const resetForm = () => {
    setFormData({
      template_type: 'OFFER_LETTER',
      name: '',
      description: '',
      html_content: '',
      placeholders: [],
      is_active: true,
    });
  };

  const openEditModal = (template: ProgramTemplate) => {
    setEditingTemplate(template);
    setFormData({
      template_type: template.template_type,
      name: template.name,
      description: template.description || '',
      html_content: template.html_content,
      placeholders: template.placeholders || [],
      is_active: template.is_active,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const insertPlaceholder = (placeholder: string) => {
    setFormData({
      ...formData,
      html_content: formData.html_content + placeholder,
    });
  };

  const getTypeInfo = (type: string) => {
    return TEMPLATE_TYPES.find((t) => t.value === type);
  };

  const renderPreviewContent = (content: string) => {
    // Replace placeholders with sample data for preview
    const sampleData: Record<string, string> = {
      '{{INTERN_NAME}}': 'John Doe',
      '{{START_DATE}}': new Date().toLocaleDateString(),
      '{{TRACK}}': 'Technology',
      '{{MANAGER_NAME}}': 'Jane Smith',
      '{{COMPANY_NAME}}': "Crave'n Delivery",
      '{{NEW_TITLE}}': 'Acting CTO',
      '{{EFFECTIVE_DATE}}': new Date().toLocaleDateString(),
      '{{SPONSOR_NAME}}': 'CEO Torrance Stroman',
      '{{DEFERRED_SALARY}}': '$120,000',
      '{{PREVIOUS_ROLE}}': 'Intern',
      '{{NEW_ROLE}}': 'Acting Executive',
      '{{REASON}}': 'Performance review',
      '{{EXIT_DATE}}': new Date().toLocaleDateString(),
      '{{EXIT_REASON}}': 'Program completion',
      '{{FINAL_STATUS}}': 'Completed',
      '{{REVOKED_AUTHORITIES}}': 'Banking access, Production keys',
      '{{DATE}}': new Date().toLocaleDateString(),
      '{{SIGNATURE}}': '_______________',
    };

    let preview = content;
    Object.entries(sampleData).forEach(([key, value]) => {
      preview = preview.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
    });
    return preview;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Templates</h1>
          <p className="text-gray-500 mt-1">
            Manage offer letters, conversion letters, and other program documents.
            Templates use system placeholders only — no free-text edits at send time.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingTemplate(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          New Template
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setSelectedType('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedType === 'all'
              ? 'bg-orange-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All Templates
        </button>
        {TEMPLATE_TYPES.map((type) => (
          <button
            key={type.value}
            onClick={() => setSelectedType(type.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedType === type.value
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
              <div className="h-20 bg-gray-200 rounded mb-3" />
              <div className="flex gap-2">
                <div className="h-6 bg-gray-200 rounded w-16" />
                <div className="h-6 bg-gray-200 rounded w-16" />
              </div>
            </div>
          ))
        ) : (templates || []).length === 0 ? (
          <div className="col-span-full bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Templates</h3>
            <p className="text-gray-500 mb-4">Create templates for program documents.</p>
            <button
              onClick={() => {
                resetForm();
                setEditingTemplate(null);
                setIsModalOpen(true);
              }}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              Create Template
            </button>
          </div>
        ) : (
          (templates || []).map((template) => {
            const typeInfo = getTypeInfo(template.template_type);
            return (
              <div
                key={template.id}
                className={`bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow ${
                  !template.is_active ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{template.name}</h3>
                    <p className="text-sm text-gray-500">{typeInfo?.label}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    template.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {template.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {template.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{template.description}</p>
                )}

                {/* Placeholders */}
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Placeholders</p>
                  <div className="flex flex-wrap gap-1">
                    {(template.placeholders || []).slice(0, 4).map((ph) => (
                      <span key={ph} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-mono">
                        {ph.replace(/\{\{|\}\}/g, '')}
                      </span>
                    ))}
                    {(template.placeholders || []).length > 4 && (
                      <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                        +{template.placeholders.length - 4}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-400">v{template.version}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setPreviewTemplate(template);
                        setIsPreviewOpen(true);
                      }}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Preview"
                    >
                      <Eye className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                      onClick={() => openEditModal(template)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700">
          <strong>Template Rules:</strong> Templates use system placeholders only. 
          No free-text edits are allowed at send time to ensure consistency and compliance.
          All placeholder values are populated automatically from the system.
        </div>
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsModalOpen(false)} />
          <div className="fixed inset-4 md:inset-8 bg-white rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingTemplate ? 'Edit Template' : 'New Template'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Type, Name, Description */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Template Type *</label>
                    <select
                      value={formData.template_type}
                      onChange={(e) => setFormData({ ...formData, template_type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      {TEMPLATE_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      placeholder="e.g., Standard Intern Offer Letter"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of this template..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                {/* Placeholders Reference */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Code className="w-4 h-4 inline mr-1" />
                    System Placeholders (click to insert)
                  </label>
                  <div className="flex flex-wrap gap-1 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    {SYSTEM_PLACEHOLDERS.map((ph) => (
                      <button
                        key={ph}
                        type="button"
                        onClick={() => insertPlaceholder(ph)}
                        className="px-2 py-1 bg-white border border-gray-200 rounded text-xs font-mono text-gray-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors"
                      >
                        {ph}
                      </button>
                    ))}
                  </div>
                </div>

                {/* HTML Content */}
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">HTML Content *</label>
                  <textarea
                    value={formData.html_content}
                    onChange={(e) => setFormData({ ...formData, html_content: e.target.value })}
                    required
                    rows={12}
                    placeholder="<h1>Document Title</h1>&#10;<p>Dear {{INTERN_NAME}},</p>&#10;<p>Content here...</p>"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono text-sm resize-none"
                  />
                </div>

                {/* Active Toggle */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                  />
                  <span className="text-sm text-gray-700">Template is active</span>
                </label>
              </div>
              <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending || !formData.name || !formData.html_content}
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
                      {editingTemplate ? 'Update Template' : 'Create Template'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Preview Modal */}
      {isPreviewOpen && previewTemplate && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsPreviewOpen(false)} />
          <div className="fixed inset-4 md:inset-12 bg-white rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Preview: {previewTemplate.name}</h2>
                <p className="text-sm text-gray-500">Placeholders replaced with sample data</p>
              </div>
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-8 bg-gray-50">
              <div 
                className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm p-8 prose prose-sm"
                dangerouslySetInnerHTML={{ 
                  __html: DOMPurify.sanitize(renderPreviewContent(previewTemplate.html_content))
                }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default InternProgramTemplates;
