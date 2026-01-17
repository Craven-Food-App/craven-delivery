/**
 * Utility script to clear all document templates from the database
 * This ensures only user-provided templates are used (no hardcoded fallbacks)
 * 
 * Usage: Call this function from the browser console or a UI button
 */

import { supabase } from '@/integrations/supabase/client';

export interface ClearTemplatesResult {
  success: boolean;
  message: string;
  deletedTemplates: number;
  deletedUsages: number;
}

/**
 * Clear all document templates and their usage mappings
 */
export async function clearAllDocumentTemplates(): Promise<ClearTemplatesResult> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Check if user is CEO or admin
    const { data: execUser } = await supabase
      .from('exec_users')
      .select('role')
      .eq('user_id', user.id)
      .single();

    const { data: isAdmin } = await supabase.rpc('is_admin', { user_uuid: user.id });

    if (!execUser || (execUser.role !== 'ceo' && !isAdmin)) {
      throw new Error('Only CEO or admin can clear all document templates');
    }

    // Get count before deletion
    const { count: templateCount } = await supabase
      .from('document_templates')
      .select('*', { count: 'exact', head: true });

    const { count: usageCount } = await supabase
      .from('template_usage')
      .select('*', { count: 'exact', head: true })
      .eq('template_type', 'document');

    // Delete template usage mappings first (due to foreign key constraints)
    const { error: usageError } = await supabase
      .from('template_usage')
      .delete()
      .eq('template_type', 'document');

    if (usageError) {
      throw new Error(`Failed to delete template usages: ${usageError.message}`);
    }

    // Delete all document templates
    const { error: templateError } = await supabase
      .from('document_templates')
      .delete()
      .gte('created_at', '1970-01-01'); // Matches all documents

    if (templateError) {
      throw new Error(`Failed to delete document templates: ${templateError.message}`);
    }

    return {
      success: true,
      message: `Successfully cleared all document templates. Deleted ${templateCount || 0} templates and ${usageCount || 0} usage mappings.`,
      deletedTemplates: templateCount || 0,
      deletedUsages: usageCount || 0,
    };
  } catch (error: any) {
    console.error('Error clearing document templates:', error);
    return {
      success: false,
      message: error.message || 'Failed to clear document templates',
      deletedTemplates: 0,
      deletedUsages: 0,
    };
  }
}

/**
 * Verify that all required document templates exist in the database
 */
export async function verifyRequiredTemplates(): Promise<{
  success: boolean;
  missing: string[];
  found: string[];
}> {
  const requiredTemplates = [
    'employment_agreement',
    'board_resolution',
    'founders_agreement',
    'stock_issuance',
    'confidentiality_ip',
    'deferred_comp_addendum',
    'offer_letter',
    'bylaws_officers_excerpt',
    'irs_83b',
  ];

  try {
    const { data: templates, error } = await supabase
      .from('document_templates')
      .select('template_key, name, is_active')
      .in('template_key', requiredTemplates);

    if (error) throw error;

    const found = templates?.map(t => t.template_key) || [];
    const missing = requiredTemplates.filter(key => !found.includes(key));

    return {
      success: missing.length === 0,
      missing,
      found,
    };
  } catch (error: any) {
    console.error('Error verifying templates:', error);
    return {
      success: false,
      missing: requiredTemplates,
      found: [],
    };
  }
}

