/**
 * Utility to seed Fortune 500 executive appointment templates from server-side Handlebars files
 */

import { supabase } from '@/integrations/supabase/client';

export async function seedFortune500TemplatesFromUI(): Promise<{ success: boolean; message: string; results?: any }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase.functions.invoke('seed-fortune500-templates', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) {
      console.error('Error seeding Fortune 500 templates:', error);
      throw error;
    }

    const results = data?.results || {};
    const summary = `Created: ${results.created || 0}, Updated: ${results.updated || 0}, Errors: ${results.errors || 0}`;
    
    return { 
      success: true, 
      message: `Fortune 500 templates seeded successfully! ${summary}`,
      results 
    };
  } catch (error: any) {
    console.error('Failed to seed Fortune 500 templates:', error);
    return { 
      success: false, 
      message: error.message || 'Failed to seed Fortune 500 templates' 
    };
  }
}
