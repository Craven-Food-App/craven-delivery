/**
 * Script to seed database with actual document templates from src/lib/templates.ts
 * Run this function to populate the database with your existing templates
 */

import { supabase } from '@/integrations/supabase/client';
import { renderHtml } from '@/lib/templates';
import { templates } from '@/lib/templates';

// Sample data for template rendering
const sampleData: Record<string, any> = {
  company_name: 'Crave\'n, Inc.',
  full_name: 'John Doe',
  role: 'Chief Executive Officer',
  equity_percentage: '10%',
  effective_date: 'January 1, 2024',
  funding_trigger: '$1,000,000 in Series A funding',
  governing_law: 'Delaware',
  date: 'January 1, 2024',
  adoption_date: 'January 1, 2024',
  directors: 'John Smith, Jane Doe',
  ceo_name: 'John Doe',
  cfo_name: 'Jane Smith',
  cxo_name: 'Bob Johnson',
  equity_ceo: '10%',
  equity_cfo: '5%',
  equity_cxo: '5%',
  founders_table_html: '<tr><td>John Doe</td><td>CEO</td><td>70%</td><td>7,000,000</td><td>Immediate</td></tr><tr><td>Jane Smith</td><td>CFO</td><td>8%</td><td>800,000</td><td>Immediate</td></tr><tr><td>Bob Johnson</td><td>CXO</td><td>3%</td><td>300,000</td><td>Immediate</td></tr>',
  founders_signature_html: '<table class="signature"><tr><td><span class="sig-line"></span><div class="sig-label">Signature of John Doe</div></td><td style="width:40px;"></td><td><span class="sig-line"></span><div class="sig-label">Date</div></td></tr></table>',
  founders_addressed_name: 'John Doe',
  founders_addressed_role: 'Chief Executive Officer (CEO)',
  founders_addressed_equity: '70%',
  founders_addressed_shares: '7,000,000',
  founders_addressed_vesting: 'Immediate',
  founders_ceo_name: 'John Doe',
  founders_ceo_role: 'Chief Executive Officer (CEO)',
  founders_ceo_equity: '70%',
  founders_ceo_shares: '7,000,000',
  founders_ceo_vesting: 'Immediate',
  founders_cfo_name: 'Jane Smith',
  founders_cfo_role: 'Chief Financial Officer (CFO)',
  founders_cfo_equity: '8%',
  founders_cfo_shares: '800,000',
  founders_cfo_vesting: 'Immediate',
  founders_cxo_name: 'Bob Johnson',
  founders_cxo_role: 'Chief Experience Officer (CXO)',
  founders_cxo_equity: '3%',
  founders_cxo_shares: '300,000',
  founders_cxo_vesting: 'Immediate',
  vesting_years: '4 years',
  cliff_months: '12 months',
  share_count: '100,000',
  price_per_share: '$0.0001',
  total_purchase_price: '$10.00',
  share_class: 'Common Stock',
  consideration_type: 'Cash',
  vesting_schedule: '4 years, 1-year cliff',
  currency: 'USD',
  offer_date: 'January 1, 2024',
  executive_name: 'John Doe',
  executive_first_name: 'John',
  executive_address: '123 Main St, City, State 12345',
  executive_email: 'john.doe@example.com',
  position_title: 'Chief Executive Officer',
  reporting_to_title: 'Board of Directors',
  work_location: 'Remote',
  start_date: 'January 1, 2024',
  annual_base_salary: '$150,000',
  funding_trigger_amount: '$1,000,000',
  ownership_percent: '10%',
  vesting_period: '4 years',
  vesting_cliff: '1 year',
  bonus_structure: 'Performance-based',
  employment_country: 'United States',
  governing_law_state: 'Delaware',
  signatory_name: 'Jane Smith',
  signatory_title: 'Board Secretary',
  company_mission_statement: 'To revolutionize the food delivery industry',
  state_of_incorporation: 'Delaware',
  execution_date: 'January 1, 2024',
  secretary_name: 'Jane Smith',
  recipient_name: 'John Doe',
  grant_date: 'January 1, 2024',
  share_type: 'Common Stock',
  total_grant_value: '$100',
  total_payment: '$10.00',
  company_address: '123 Business St, City, State 12345',
  recipient_address: '123 Main St, City, State 12345',
  recipient_ssn: 'XXX-XX-1234',
  tax_year: '2024',
  taxable_difference: '$90.00',
  par_value: '$0.0001',
  signature_company_html: '',
  signature_executive_html: '',
};

export async function seedAllDocumentTemplates(overwrite: boolean = false): Promise<{ created: number; updated: number; skipped: number; errors: number }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('User not authenticated');
    throw new Error('User not authenticated');
  }

  console.log('Starting to seed document templates...');

  const results = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
  };

  for (const template of templates) {
    try {
      // Check if template already exists
      const { data: existing } = await supabase
        .from('document_templates')
        .select('id')
        .eq('template_key', template.id)
        .single();

      if (existing && !overwrite) {
        console.log(`Template ${template.id} already exists, skipping...`);
        results.skipped++;
        continue;
      }

      // Render the template with sample data to get the full HTML
      // This will include all styles and body content
      const htmlContent = renderHtml(template.id, sampleData);

      if (existing && overwrite) {
        // Update existing template
        const { error } = await supabase
          .from('document_templates')
          .update({
            name: template.title,
            html_content: htmlContent,
            placeholders: template.placeholders,
            is_active: true,
            description: `Auto-seeded from src/lib/templates.ts`,
          })
          .eq('id', existing.id);

        if (error) {
          console.error(`Error updating template ${template.id}:`, error);
          results.errors++;
        } else {
          console.log(`✓ Updated template: ${template.title}`);
          results.updated++;
        }
      } else {
        // Insert new template
        const { error } = await supabase.from('document_templates').insert({
          template_key: template.id,
          name: template.title,
          category: 'executive', // Default category
          html_content: htmlContent,
          placeholders: template.placeholders,
          is_active: true,
          description: `Auto-seeded from src/lib/templates.ts`,
          created_by: user.id,
        });

        if (error) {
          console.error(`Error seeding template ${template.id}:`, error);
          results.errors++;
        } else {
          console.log(`✓ Seeded template: ${template.title}`);
          results.created++;
        }
      }
    } catch (error: any) {
      console.error(`Error processing template ${template.id}:`, error.message);
      results.errors++;
    }
  }

  console.log('Finished seeding document templates!', results);
  return results;
}

// Also create a function that can be called from the UI
export async function seedTemplatesFromUI(overwrite: boolean = false): Promise<{ success: boolean; message: string; results?: any }> {
  try {
    const results = await seedAllDocumentTemplates(overwrite);
    const summary = `Created: ${results.created}, Updated: ${results.updated}, Skipped: ${results.skipped}, Errors: ${results.errors}`;
    return { 
      success: true, 
      message: `Templates imported successfully! ${summary}`,
      results 
    };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to seed templates' };
  }
}

