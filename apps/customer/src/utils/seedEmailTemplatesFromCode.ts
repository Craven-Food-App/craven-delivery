/**
 * Script to seed database with email templates
 * NOTE: All hardcoded templates have been removed. Email templates must be created/imported via Template Manager UI.
 */

import { supabase } from '@/integrations/supabase/client';

// Extract variables from HTML content
function extractVariables(content: string): string[] {
  const regex = /\{\{(\w+)\}\}/g;
  const matches = new Set<string>();
  let match;
  while ((match = regex.exec(content)) !== null) {
    matches.add(match[1]);
  }
  return Array.from(matches).sort();
}

export async function seedAllEmailTemplates(overwrite: boolean = false): Promise<{ created: number; updated: number; skipped: number; errors: number }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('User not authenticated');
    throw new Error('User not authenticated');
  }

  console.warn('No hardcoded email templates available. Please create email templates via Template Manager UI.');

  // No hardcoded templates - return empty results
  const emailTemplates: any[] = [];

  const results = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
  };

  for (const template of emailTemplates) {
    try {
      // Extract variables from HTML content
      const allVariables = extractVariables(template.html_content + template.subject);
      const uniqueVariables = [...new Set([...template.variables, ...allVariables])].sort();

      // Check if template already exists
      const { data: existing } = await supabase
        .from('email_templates')
        .select('id')
        .eq('template_key', template.template_key)
        .single();

      if (existing && !overwrite) {
        console.log(`Email template ${template.template_key} already exists, skipping...`);
        results.skipped++;
        continue;
      }

      if (existing && overwrite) {
        // Update existing template
        const { error } = await supabase
          .from('email_templates')
          .update({
            name: template.name,
            category: template.category,
            subject: template.subject,
            html_content: template.html_content,
            variables: uniqueVariables,
            is_active: true,
            description: template.description,
          })
          .eq('id', existing.id);

        if (error) {
          console.error(`Error updating email template ${template.template_key}:`, error);
          results.errors++;
        } else {
          console.log(`✓ Updated email template: ${template.name}`);
          results.updated++;
        }
      } else {
        // Insert new template
        const { error } = await supabase.from('email_templates').insert({
          template_key: template.template_key,
          name: template.name,
          category: template.category,
          subject: template.subject,
          html_content: template.html_content,
          variables: uniqueVariables,
          is_active: true,
          description: template.description,
          created_by: user.id,
        });

        if (error) {
          console.error(`Error seeding email template ${template.template_key}:`, error);
          results.errors++;
        } else {
          console.log(`✓ Seeded email template: ${template.name}`);
          results.created++;
        }
      }
    } catch (error: any) {
      console.error(`Error processing email template ${template.template_key}:`, error.message);
      results.errors++;
    }
  }

  console.log('Finished seeding email templates!', results);
  return results;
}

// Function that can be called from the UI
export async function seedEmailTemplatesFromUI(overwrite: boolean = false): Promise<{ success: boolean; message: string; results?: any }> {
  try {
    const results = await seedAllEmailTemplates(overwrite);
    const summary = `Created: ${results.created}, Updated: ${results.updated}, Skipped: ${results.skipped}, Errors: ${results.errors}`;
    return { 
      success: true, 
      message: `Email templates imported successfully! ${summary}`,
      results 
    };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to seed email templates' };
  }
}

