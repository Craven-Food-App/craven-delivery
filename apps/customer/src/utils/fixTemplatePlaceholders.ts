import { supabase } from '@/integrations/supabase/client';

/**
 * Replace hardcoded values in document templates with proper placeholders
 */
export async function fixTemplatePlaceholders(): Promise<{ updated: number; errors: string[] }> {
  const errors: string[] = [];
  let updated = 0;

  try {
    // Fetch all document templates
    const { data: templates, error: fetchError } = await supabase
      .from('document_templates')
      .select('id, template_key, html_content');

    if (fetchError) {
      throw new Error(`Failed to fetch templates: ${fetchError.message}`);
    }

    if (!templates || templates.length === 0) {
      return { updated: 0, errors: ['No templates found in database'] };
    }

    // Mapping of hardcoded values to placeholders
    const replacements: Array<{ 
      pattern: RegExp | string; 
      replacement: string; 
      description: string;
      check?: (text: string, match: string, offset: number) => boolean;
    }> = [
      // Names - replace "John Doe", "Jane Doe", etc. with {{full_name}}
      { 
        pattern: /John Doe|Jane Doe|John Smith|Jane Smith|Executive Name|Officer Name|Employee Name|Subscriber Name|Recipient Name/gi, 
        replacement: '{{full_name}}', 
        description: 'Name placeholders' 
      },
      
      // Email addresses
      { 
        pattern: /john\.doe@|jane\.doe@|executive@|officer@|employee@|subscriber@/gi, 
        replacement: '{{executive_email}}', 
        description: 'Email placeholders' 
      },
      
      // Titles/Positions - only replace standalone titles, not in placeholders
      { 
        pattern: /\b(CEO|CFO|COO|CTO|CXO|Chief Executive Officer|Chief Financial Officer|Chief Operating Officer|Chief Technology Officer|Chief Experience Officer)\b/gi, 
        replacement: '{{role}}', 
        description: 'Role/Position placeholders',
        // Only replace if not already in a placeholder
        check: (text: string, match: string, offset: number) => {
          const before = text.substring(Math.max(0, offset - 20), offset);
          const after = text.substring(offset + match.length, offset + match.length + 20);
          return !before.includes('{{') && !after.includes('}}');
        }
      },
      
      // Dates - replace specific dates with {{effective_date}} or {{date}}
      { 
        pattern: /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/g, 
        replacement: '{{effective_date}}', 
        description: 'Date placeholders' 
      },
      
      // Equity percentages - replace "15%", "10%", etc. with {{equity_percentage}}
      { 
        pattern: /\b\d+\.?\d*\s*%\s*(?:equity|ownership|shares)/gi, 
        replacement: '{{equity_percentage}}%', 
        description: 'Equity percentage placeholders' 
      },
      
      // Share counts - replace numbers like "1,000,000" with {{shares_issued}}
      { 
        pattern: /\b\d{1,3}(?:,\d{3})*\s*(?:shares|share)/gi, 
        replacement: '{{shares_issued}}', 
        description: 'Share count placeholders' 
      },
      
      // Prices - replace "$0.0001", "$0.001", etc. with {{price_per_share}} (without $ in replacement)
      { 
        pattern: /\$\s*(\d+\.\d{4,})/g, 
        replacement: '{{price_per_share}}', 
        description: 'Price per share placeholders' 
      },
      
      // Total purchase price - only large amounts (without $ in replacement)
      { 
        pattern: /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g, 
        replacement: '{{total_purchase_price}}', 
        description: 'Total purchase price placeholders',
        // Only if it's a large amount (likely total purchase price, not price per share)
        check: (text: string, match: string) => {
          const num = parseFloat(match.replace(/[$,]/g, ''));
          return num > 100; // Likely total purchase price, not price per share
        }
      },
      
      // Vesting schedules
      { 
        pattern: /4\s*years?\s*(?:with|,)\s*1\s*year\s*cliff|3\s*years?\s*(?:with|,)\s*6\s*month\s*cliff/gi, 
        replacement: '{{vesting_schedule}}', 
        description: 'Vesting schedule placeholders' 
      },
      
      // Salaries (without $ in replacement - templates should use ${{annual_salary}} format)
      { 
        pattern: /\$\s*(\d{1,3}(?:,\d{3})*)(?:\s*(?:per\s*year|annually|annual\s*salary))?/gi, 
        replacement: '{{annual_salary}}', 
        description: 'Salary placeholders' 
      },
      
      // Funding triggers
      { 
        pattern: /Series A|Series B|funding\s*event|\$\s*\d{1,3}(?:,\d{3})*(?:\s*in\s*funding)?/gi, 
        replacement: '{{funding_trigger}}', 
        description: 'Funding trigger placeholders' 
      },
      
      // Company name variations
      { 
        pattern: /Crave'n, Inc\.|Craven Inc|Crave'n Inc/gi, 
        replacement: '{{company_name}}', 
        description: 'Company name placeholders' 
      },
      
      // State/Governance
      { 
        pattern: /State of (?:Ohio|Delaware|California|New York)/gi, 
        replacement: '{{governing_law}}', 
        description: 'Governing law placeholders' 
      },
    ];

    // Process each template
    for (const template of templates) {
      if (!template.html_content) continue;

      let updatedContent = template.html_content;
      let hasChanges = false;

      // Apply replacements
      for (const { pattern, replacement, description, check } of replacements) {
        if (pattern instanceof RegExp) {
          // For regex patterns - use replace with function to get offset
          const newContent = updatedContent.replace(pattern, (match, ...args) => {
            // Skip if already a placeholder
            if (match.includes('{{')) return match;
            
            // Get offset from last argument (if available)
            const offset = args[args.length - 2] || 0;
            
            // Apply custom check if provided
            if (check && !check(updatedContent, match, offset)) return match;
            
            hasChanges = true;
            return replacement;
          });
          updatedContent = newContent;
        } else {
          // For string patterns
          if (updatedContent.includes(pattern) && !updatedContent.includes('{{')) {
            updatedContent = updatedContent.replace(new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), replacement);
            hasChanges = true;
          }
        }
      }

      // Update template if changes were made
      if (hasChanges) {
        const { error: updateError } = await supabase
          .from('document_templates')
          .update({ 
            html_content: updatedContent,
            updated_at: new Date().toISOString()
          })
          .eq('id', template.id);

        if (updateError) {
          errors.push(`Failed to update ${template.template_key}: ${updateError.message}`);
        } else {
          updated++;
          console.log(`✓ Updated template: ${template.template_key}`);
        }
      }
    }

    return { updated, errors };
  } catch (error: any) {
    errors.push(`Error fixing placeholders: ${error.message}`);
    return { updated, errors };
  }
}

/**
 * UI wrapper for fixing template placeholders
 */
export async function fixTemplatePlaceholdersFromUI(): Promise<void> {
  const { message } = await import('antd');
  
  try {
    message.loading({ content: 'Fixing template placeholders...', key: 'fixPlaceholders', duration: 0 });
    
    const result = await fixTemplatePlaceholders();
    
    message.destroy('fixPlaceholders');
    
    if (result.errors.length > 0) {
      message.warning({
        content: `Fixed ${result.updated} templates, but ${result.errors.length} errors occurred. Check console for details.`,
        duration: 5,
      });
      console.error('Template placeholder fix errors:', result.errors);
    } else {
      message.success({
        content: `Successfully fixed placeholders in ${result.updated} templates!`,
        duration: 4,
      });
    }
  } catch (error: any) {
    message.destroy('fixPlaceholders');
    message.error(`Failed to fix placeholders: ${error.message}`);
    console.error('Error fixing placeholders:', error);
  }
}

